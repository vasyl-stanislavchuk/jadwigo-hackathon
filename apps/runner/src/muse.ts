import {
  CONTRIBUTOR_MODEL,
  GuardedMuse,
  HttpMuse,
  InMemoryMuseLedger,
  laneBudget,
  type MuseClient,
} from "@jadwigo/jadwigo-ai";
import type { MuseConfig } from "./config.ts";

export interface MuseRuntime {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  now: () => Date;
  sleep: (ms: number) => Promise<void>;
}

/**
 * The host's model: `HttpMuse` against `/v1/responses` inside `GuardedMuse` (the tag, the cache key,
 * the lane's cap and a ledger row per call carrying the run id). Each tier answers with its own
 * model: `contributor` with the contributor model, `private` with the one
 * `JADWIGO_MUSE_PRIVATE_MODEL` names, or a refusal when none is named. Which tier a request asks
 * for is the engine's `tier`, which the host sets from `JADWIGO_MUSE_TIER` (`engine.ts`).
 *
 * The ledger is this process's: the lane's cap holds per cold start, and each run's own `cap_usd`
 * holds per turn through `budgetGuard`. A ledger that outlives the process is not built yet.
 */
export function liveMuse(config: MuseConfig, runtime: MuseRuntime): MuseClient {
  const ledger = new InMemoryMuseLedger();
  const http = new HttpMuse({
    fetch: runtime.fetch,
    api_key: config.api_key,
    models: { contributor: CONTRIBUTOR_MODEL, private: config.private_model },
    budget: laneBudget(ledger, config.lane_cap_usd),
    sleep: runtime.sleep,
    now: runtime.now,
  });
  return new GuardedMuse(http, { ledger, lane_cap_usd: config.lane_cap_usd, now: runtime.now });
}

/** The process's own fetch, clock and timer: what a deployed host runs on. */
export const realRuntime: MuseRuntime = {
  fetch: (url, init) => fetch(url, init),
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
