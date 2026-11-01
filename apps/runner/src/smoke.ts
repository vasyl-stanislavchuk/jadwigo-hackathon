import type { PodId } from "@jadwigo/contracts";
import { type RunEvent, RunId } from "@jadwigo/contracts/run";
import type { MuseClient } from "@jadwigo/jadwigo-ai";
import type { Store } from "@jadwigo/store";
import { apiDatabaseUrl, museConfig } from "./config.ts";
import { postgresEngineHost } from "./engine.ts";
import { createHost } from "./host.ts";
import { liveMuse, realRuntime } from "./muse.ts";
import { ProbeMuse, turnOf } from "./probe.ts";
import { apiDeps, seed, usdOf } from "./seed.ts";

/**
 * `make engine-smoke` (dl-z5ja.20): one chat turn end to end, PostHog's gateway smoke
 * (posthog-ai-production.md section 1). It fails on any `error` event, a turn with no
 * `turn_complete`, or a model call that threw. It prints the run id, the turn's events and USD.
 *
 * - `local [--dry]`: seeds a made-up pod as `jadwigo_api` on DATABASE_URL, then drains in this
 *   process as `jadwigo_runner`, with `HttpMuse` against the real Muse API (the owner's, it pays),
 *   or with the scripted model under `--dry` (anyone's, no network but Postgres).
 * - `seed`: the seed alone, for a smoke against a deployed host; prints `{pod, run_id}`.
 * - `check <pod> <run_id> [seconds]`: waits up to that long (60 by default) for the turn to end,
 *   then prints the same summary. The deployed host's half.
 */

const PARENT_TEXT = "Make a short practice lesson for grade 1: adding within 20. No names, please.";

function out(line: string): void {
  process.stdout.write(`${line}\n`);
}

/** Records every error a model call threw, which `drain` would otherwise keep to itself. */
function recording(inner: MuseClient, errors: string[]): MuseClient {
  return {
    respond: async (request) => {
      try {
        return await inner.respond(request);
      } catch (error) {
        errors.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
        throw error;
      }
    },
  };
}

function summary(run: RunId, events: readonly RunEvent[], thrown: readonly string[]): boolean {
  const turn = turnOf(events);
  const errors = events.flatMap((e) =>
    e.type === "error" ? [`${e.payload.error.type}: ${e.payload.error.message}`] : [],
  );
  const ok = turn.ok && thrown.length === 0;
  out(`engine-smoke: run ${run} ${ok ? "ok" : "FAILED"}`);
  out(`engine-smoke: events ${turn.types || "none"}`);
  out(`engine-smoke: USD ${usdOf(events)}`);
  for (const e of [...errors, ...thrown]) out(`engine-smoke: error ${e}`);
  if (!turn.types.includes("turn_complete")) out("engine-smoke: the turn did not end");
  return ok;
}

async function waitFor(store: Store, pod: PodId, run: RunId, seconds: number) {
  const until = Date.now() + seconds * 1000;
  for (;;) {
    const events = await store.listRunEvents(pod, run, 0);
    if (events.some((e) => e.type === "turn_complete") || Date.now() > until) return events;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function main(argv: readonly string[]): Promise<boolean> {
  const [command, a, b, c] = argv;
  const deps = apiDeps(apiDatabaseUrl());
  try {
    if (command === "seed") {
      out(JSON.stringify(await seed(deps, PARENT_TEXT)));
      return true;
    }
    if (command === "check" && a && b) {
      const run = RunId.parse(b);
      return summary(run, await waitFor(deps.store, a as PodId, run, Number(c ?? 60)), []);
    }
    if (command === "local") {
      const dry = a === "--dry";
      const thrown: string[] = [];
      const model = dry ? new ProbeMuse() : liveMuse(await museConfig(), realRuntime);
      const seeded = await seed(deps, PARENT_TEXT);
      const host = postgresEngineHost(apiDatabaseUrl(), recording(model, thrown), (line) =>
        console.warn(line),
      );
      const started = performance.now();
      try {
        await createHost(() => Promise.resolve(host))();
      } finally {
        await host.close();
      }
      out(
        `engine-smoke: ${dry ? "dry, scripted model" : "live, HttpMuse"}, ${Math.round(performance.now() - started)} ms`,
      );
      const events = await deps.store.listRunEvents(seeded.pod, seeded.run_id, 0);
      return summary(seeded.run_id, events, thrown);
    }
    throw new Error("usage: smoke.ts local [--dry] | seed | check <pod> <run_id> [seconds]");
  } finally {
    await deps.close();
  }
}

if (!(await main(process.argv.slice(2)))) process.exitCode = 1;
