import { rmSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { CONTRIBUTOR_MODEL } from "@jadwigo/jadwigo-ai";
import { type MuseConfig, museConfig, runnerDatabaseUrl } from "./config.ts";
import { postgresEngineHost } from "./engine.ts";
import { createRunnerHandler } from "./handler.ts";
import { createHost, type HostReport } from "./host.ts";
import { liveMuse, realRuntime } from "./muse.ts";

/**
 * `make dev-all`'s step host (dl-uukj.47.14.2): the runner Lambda on this machine, for prod's
 * engine path end to end. `bun run --cwd apps/runner dev --listen <unix:path | http://host:port>`.
 *
 * - It drains `agent_step` as `jadwigo_runner` on DATABASE_URL, with the Lambda's own parts:
 *   `museConfig` (the key, the cap `JADWIGO_MUSE_CAP_USD` and the tier, which it refuses to start
 *   without), `liveMuse` (`HttpMuse` in `GuardedMuse`, its ledger the database's) and
 *   `postgresEngineHost`. There is no local model switch: a turn here is a paid call to the
 *   model prod uses. The scripted model is for tests only (`make engine-smoke DRY=1`).
 * - It is woken as the Lambda is: the api's `localPoke` POSTs each step it committed to `/poke`
 *   (apps/api/src/poke.ts), and every POLL_MS it drains anyway, as the Lambda's every-minute
 *   schedule does, which also picks up the pg_cron sweep's steps.
 * - The run events a step writes reach the page through the database: the run_event trigger calls
 *   realtime.send, and make dev-all's Realtime stand-in relays it (apps/web/e2e/realtime-server.ts).
 * - Photos are not read here: there is no uploads bucket on this machine.
 *
 * Logs are the Lambda's: ids, counts and outcomes, never a message, a payload, a key or a URL.
 */

/** How often it drains with no poke, in place of the Lambda's every-minute schedule. */
export const POLL_MS = 5000;

/** Where `--listen` asks it to serve: a unix socket's path, or a port on 127.0.0.1. */
export type Listen = { path: string } | { port: number };

/** `--listen`'s value, as `LOCAL_RUNNER_URL` writes it for the api (apps/api/src/poke.ts). */
export function listenOf(argv: readonly string[]): Listen {
  const at = argv.indexOf("--listen");
  const url = at === -1 ? undefined : argv[at + 1];
  if (url === undefined || url === "")
    throw new Error("dev: --listen unix:<absolute path> or --listen http://127.0.0.1:<port>");
  if (url.startsWith("unix:")) {
    const path = url.slice("unix:".length);
    if (!path.startsWith("/")) throw new Error("dev: --listen unix:<absolute path>");
    return { path };
  }
  const parsed = URL.canParse(url) ? new URL(url) : undefined;
  if (parsed?.protocol !== "http:" || parsed.port === "")
    throw new Error("dev: --listen unix:<absolute path> or --listen http://127.0.0.1:<port>");
  return { port: Number(parsed.port) };
}

/** The settings it will call Muse with, for its first log line: never the key. */
export function settingsLine(config: MuseConfig): string {
  return JSON.stringify({
    runner: "dev",
    tier: config.tier,
    models: { contributor: CONTRIBUTOR_MODEL, private: config.private_model },
    lane_cap_usd: config.lane_cap_usd,
  });
}

/**
 * Drains one at a time: a poke or a poll while a drain runs asks for one more after it, never a
 * second drain beside it. `idle()` resolves once nothing is running or asked for.
 */
export function createDevRunner(
  handler: (event: unknown) => Promise<HostReport>,
  warn: (line: string) => void,
) {
  let running: Promise<void> | undefined;
  let again: unknown;
  let asked = false;
  const loop = async (event: unknown) => {
    let next: unknown = event;
    for (;;) {
      try {
        await handler(next);
      } catch (error) {
        // A failed open (the database, the settings): tried again on the next wake.
        warn(`dev: the drain failed: ${described(error)}`);
      }
      if (!asked) return;
      asked = false;
      next = again;
    }
  };
  const wake = (event: unknown = {}) => {
    if (running !== undefined) {
      asked = true;
      again = event;
      return;
    }
    running = loop(event).finally(() => {
      running = undefined;
    });
  };
  /** The `/poke` route: 202 at once, as an async invoke answers, then a drain. */
  const onRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST" || req.url !== "/poke") {
      res.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    let event: unknown = {};
    try {
      event = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      // A body that is not JSON still drains, logged as poked by nobody, as the Lambda does.
    }
    res.writeHead(202).end();
    wake(event);
  };
  return { wake, onRequest, idle: async () => running && (await running) };
}

/**
 * An error by its name, its code and its message, which name a setting, never its value. A refused
 * connect is an AggregateError with no message of its own: its code says what happened.
 */
function described(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = "code" in error && typeof error.code === "string" ? ` ${error.code}` : "";
  const inner = error instanceof AggregateError ? error.errors[0] : undefined;
  const innerCode =
    inner instanceof Error && "code" in inner && typeof inner.code === "string"
      ? ` ${inner.code}`
      : "";
  return `${error.name}${code || innerCode}${error.message ? `: ${error.message}` : ""}`;
}

/** Logs a drain that did something; a poll that found nothing stays quiet. */
function quiet(line: string): boolean {
  try {
    const report = JSON.parse(line) as { steps?: number; poked?: unknown; failed?: unknown[] };
    return report.steps === 0 && report.poked === null && (report.failed ?? []).length === 0;
  } catch {
    return false;
  }
}

async function main(argv: readonly string[]): Promise<void> {
  const listen = listenOf(argv);
  const [muse, url] = await Promise.all([museConfig(), runnerDatabaseUrl()]);
  const log = (line: string) => process.stdout.write(`${line}\n`);
  log(settingsLine(muse));
  const host = createHost(async () =>
    postgresEngineHost(url, (store) => liveMuse(muse, realRuntime, store), log, muse.tier),
  );
  const runner = createDevRunner(
    createRunnerHandler(host, (line) => {
      if (!quiet(line)) log(line);
    }),
    log,
  );
  const server = createServer((req, res) => void runner.onRequest(req, res));
  if ("path" in listen) rmSync(listen.path, { force: true });
  await new Promise<void>((done) =>
    "path" in listen
      ? server.listen(listen.path, done)
      : server.listen(listen.port, "127.0.0.1", done),
  );
  log(JSON.stringify({ runner: "listening", poll_ms: POLL_MS }));
  runner.wake();
  const poll = setInterval(() => runner.wake(), POLL_MS);
  const stop = () => {
    clearInterval(poll);
    server.close();
    if ("path" in listen) rmSync(listen.path, { force: true });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    // museConfig's and runnerDatabaseUrl's errors name the setting, never its value.
    process.stderr.write(`dev: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
