// The bank's conformance run (dl-a38n.31): every converted item drawn on the real page and checked
// with the lesson builder's render rules, by hand or nightly, never in `make check` (it needs the
// bank's items file, which is never in git). It starts the web dev server on a free port, opens
// /playground/conformance in headless Chromium, serves the items file to the page with
// page.route, waits for the page's verdicts, and writes beside the items file:
//   <name>.render.json        the sidecar: {items: {<id>: {render_ok, findings}}, rules_version, ran_at}
//   <name>.conformance.json   the report: every item's findings, and the failing shapes by sets served
// Run: bun tools/conformance/run.ts [--items <converted-pl.json>] [--limit N] [--top N]
// Chromium comes from Playwright: `bunx playwright install chromium` once per machine.
import { type ChildProcess, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { basename, dirname, join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { itemsPath, serverEnv } from "./config.ts";
import { type ItemResult, shapesOf, sidecarOf, summaryLines } from "./report.ts";

const REPO = resolve(dirname(new URL(import.meta.url).pathname), "..", "..");
const WEB = join(REPO, "apps", "web");
/** The render rules the page runs; their hash is the sidecar's rules_version. */
const RULES = join(WEB, "src", "playground", "lesson", "render", "rules.ts");
/** apps/web's ITEMS_PATH and CONFORMANCE_PATH (src/playground/conformance/); tools imports nothing of ours. */
const ITEMS_PATH = "/@conformance/items.json";
const PAGE_PATH = "/playground/conformance";
const SERVER_READY_MS = 60_000;
const RUN_MS = 60 * 60_000;

interface PageState {
  done: boolean;
  total: number;
  results: ItemResult[];
  error?: string;
}

/** The sidecar and the report beside the items file: converted-pl.json → converted-pl.render.json. */
function outputsOf(items: string): { sidecar: string; report: string } {
  const name = basename(items).replace(/\.json$/, "");
  return {
    sidecar: join(dirname(items), `${name}.render.json`),
    report: join(dirname(items), `${name}.conformance.json`),
  };
}

function flag(args: readonly string[], name: string): string | undefined {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
}

function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() =>
        typeof address === "object" && address !== null
          ? done(address.port)
          : fail(new Error("no free port")),
      );
    });
  });
}

async function startWeb(port: number, apiPort: number): Promise<ChildProcess> {
  const env = { ...serverEnv(port), API_PORT: String(apiPort) };
  const child = spawn("bunx", ["vite"], { cwd: WEB, env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout?.on("data", (d: Buffer) => {
    output += d.toString();
  });
  child.stderr?.on("data", (d: Buffer) => {
    output += d.toString();
  });
  const deadline = Date.now() + SERVER_READY_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`the web dev server stopped:\n${output}`);
    try {
      if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return child;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill();
  throw new Error(
    `the web dev server did not answer on port ${port} in ${SERVER_READY_MS} ms:\n${output}`,
  );
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const items = resolve(flag(args, "--items") ?? itemsPath());
  const limit = Number(flag(args, "--limit") ?? "0");
  const top = Number(flag(args, "--top") ?? "10");
  const file = JSON.parse(readFileSync(items, "utf8")) as { items?: unknown[] };
  if (!Array.isArray(file.items)) throw new Error(`${items} has no items list`);
  const served = limit > 0 ? { ...file, items: file.items.slice(0, limit) } : file;
  const rulesVersion = `sha256:${createHash("sha256").update(readFileSync(RULES)).digest("hex").slice(0, 12)}`;

  const port = await freePort();
  const web = await startWeb(port, await freePort());
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await page.route(`**${ITEMS_PATH}`, (route) => route.fulfill({ json: served }));
    await page.goto(`http://127.0.0.1:${port}${PAGE_PATH}`);
    const deadline = Date.now() + RUN_MS;
    let state: PageState | undefined;
    let shown = -1;
    while (Date.now() < deadline) {
      state = await page.evaluate(
        () => (globalThis as unknown as { __jadwigoConformance?: PageState }).__jadwigoConformance,
      );
      if (state !== undefined && state.results.length !== shown) {
        shown = state.results.length;
        process.stderr.write(`${shown} of ${state.total} items checked\n`);
      }
      if (state?.done) break;
      await new Promise((r) => setTimeout(r, 1_000));
    }
    if (state === undefined || !state.done)
      throw new Error(`the page did not finish in ${RUN_MS} ms`);
    if (state.error) throw new Error(`the page could not run: ${state.error}`);

    const ranAt = new Date().toISOString();
    const shapes = shapesOf(state.results);
    const out = outputsOf(items);
    writeFileSync(
      out.sidecar,
      `${JSON.stringify(sidecarOf(state.results, rulesVersion, ranAt), null, 2)}\n`,
    );
    writeFileSync(
      out.report,
      `${JSON.stringify(
        {
          items_file: items,
          rules_version: rulesVersion,
          ran_at: ranAt,
          shapes,
          items: state.results,
        },
        null,
        2,
      )}\n`,
    );
    for (const line of summaryLines(state.results, shapes, top)) process.stdout.write(`${line}\n`);
    if (pageErrors.length > 0) {
      process.stdout.write(`${pageErrors.length} page errors, the first: ${pageErrors[0]}\n`);
    }
    process.stdout.write(`wrote ${out.sidecar}\nwrote ${out.report}\n`);
    return 0;
  } finally {
    await browser.close();
    web.kill();
  }
}

if (import.meta.main) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (e: unknown) => {
      process.stderr.write(`conformance: ${e instanceof Error ? e.message : String(e)}\n`);
      process.exitCode = 1;
    },
  );
}
