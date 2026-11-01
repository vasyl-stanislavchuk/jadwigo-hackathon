import { readFileSync } from "node:fs";
import type { PodId } from "@jadwigo/contracts";
import { RunId } from "@jadwigo/contracts/run";
import type { Store } from "@jadwigo/store";
import { apiDatabaseUrl, probeHost } from "./config.ts";
import { postgresEngineHost } from "./engine.ts";
import { createHost, type HostReport } from "./host.ts";
import { ProbeMuse, turnOf } from "./probe.ts";
import { apiDeps, seed } from "./seed.ts";

/**
 * The probe's laptop half (dl-z5ja.5), which `make step-probe` runs around each host's invoke:
 *
 * - `seed`: a made-up pod, a conversation and one parent message, accepted as the API does it
 *   (as `jadwigo_api`, which sends the first step to `agent_step`). Prints `{pod, run_id}`.
 * - `local`: seeds, then runs the host in this process as `jadwigo_runner`: the dry run, on the
 *   local database.
 * - `report <file>`: reads back each invoke's run and prints the comparison row.
 *
 * The pod is made up: a random account, no learner, no name. Nothing here reaches a model.
 */

const PARENT_TEXT = "A made-up lesson: adding within 20, grade 1.";

function out(value: unknown): void {
  process.stdout.write(`${typeof value === "string" ? value : JSON.stringify(value)}\n`);
}

/** One invoke as the probe script records it. */
interface Invoke {
  pod: string;
  run_id: string;
  /** The round trip the laptop measured: the invoke call, network and cold start included. */
  client_ms: number;
  /** Lambda's own `Init Duration` from the REPORT line; null on a warm start or on Edge. */
  init_ms: number | null;
  /** Lambda's `Billed Duration`; null on Edge. */
  billed_ms?: number | null;
  reply: HostReport | { error: string };
}

interface ProbeFile {
  host: string;
  bundle_bytes: number;
  /** What it took to bundle and deploy, in words. */
  bundle_note: string;
  /** Where the database URL lives and who can read it, in words. */
  secrets: string;
  invokes: Invoke[];
}

function ms(value: number | null | undefined): string {
  return value === null || value === undefined ? "n/a" : `${value} ms`;
}

async function report(store: Store, file: ProbeFile): Promise<void> {
  const rows: (Invoke & { turn: ReturnType<typeof turnOf> })[] = [];
  for (const invoke of file.invokes) {
    const events = await store.listRunEvents(invoke.pod as PodId, RunId.parse(invoke.run_id), 0);
    rows.push({ ...invoke, turn: turnOf(events) });
  }
  const [cold, warm] = rows;
  const replyOf = (r: (typeof rows)[number] | undefined) =>
    r && !("error" in r.reply) ? r.reply : null;
  const coldReply = replyOf(cold);
  const warmReply = replyOf(warm);
  const coldStart =
    cold?.init_ms ?? (cold && warm ? Math.max(0, cold.client_ms - warm.client_ms) : null);
  const ok = rows.length > 0 && rows.every((r) => r.turn.ok && !("error" in r.reply));
  out({ host: file.host, ok, invokes: rows });
  out("");
  out(
    "| Host | Cold start | Round trip, cold / warm | Handler wall, cold / warm | CPU, cold / warm | Steps | Bundle | Secrets | Turn |",
  );
  out("|---|---|---|---|---|---|---|---|---|");
  const cells = [
    file.host,
    ms(coldStart),
    `${ms(cold?.client_ms)} / ${ms(warm?.client_ms)}`,
    `${ms(coldReply?.wall_ms)} / ${ms(warmReply?.wall_ms)}`,
    `${ms(coldReply?.cpu_ms)} / ${ms(warmReply?.cpu_ms)}`,
    `${coldReply?.steps ?? "n/a"} / ${warmReply?.steps ?? "n/a"}`,
    `${Math.round(file.bundle_bytes / 1024)} KiB; ${file.bundle_note}`,
    file.secrets,
    ok ? "ok" : `FAILED: ${rows.map((r) => r.turn.types || "no events").join(" / ")}`,
  ];
  out(`| ${cells.join(" | ")} |`);
  if (!ok) process.exitCode = 1;
}

async function main(argv: readonly string[]): Promise<void> {
  const [command, arg] = argv;
  const deps = apiDeps(apiDatabaseUrl());
  try {
    if (command === "seed") {
      out(await seed(deps, PARENT_TEXT));
    } else if (command === "local") {
      const seeded = await seed(deps, PARENT_TEXT);
      const host = postgresEngineHost(apiDatabaseUrl(), new ProbeMuse(), (l) => console.warn(l));
      const run = createHost(() => Promise.resolve(host));
      const t0 = performance.now();
      const reply = await run();
      const client_ms = Math.round(performance.now() - t0);
      await host.close();
      const events = await deps.store.listRunEvents(seeded.pod, seeded.run_id, 0);
      out({ host: probeHost(), ...seeded, client_ms, reply, turn: turnOf(events) });
      if (!turnOf(events).ok) process.exitCode = 1;
    } else if (command === "report" && arg) {
      await report(deps.store, JSON.parse(readFileSync(arg, "utf8")) as ProbeFile);
    } else {
      throw new Error("usage: probe-cli.ts seed | local | report <probe.json>");
    }
  } finally {
    await deps.close();
  }
}

await main(process.argv.slice(2));
