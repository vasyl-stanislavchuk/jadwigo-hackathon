import type { ModelTier } from "@jadwigo/contracts/run";
import {
  createVerbs,
  type EngineDeps,
  fixtureBank,
  type MuseClient,
  PgmqRunQueue,
} from "@jadwigo/jadwigo-ai";
import { createPostgresStore, type Store } from "@jadwigo/store";
import pg from "pg";
import type { HostDeps } from "./host.ts";

/**
 * One connection each for the store and the queue: an invocation runs one step at a time, and
 * Supavisor's transaction pooler shares them. A connect that takes over 5 s fails the invocation
 * instead of hanging to the timeout; the step stays queued.
 */
const POOL = { max: 1, connectionTimeoutMillis: 5000 } as const;

/** Each invocation runs at most this many steps; the queue keeps the rest for the next. */
const MAX_STEPS = 20;

/**
 * The engine on Postgres as `jadwigo_runner`: the store sets `app.pod_id` per unit after
 * `authorizeRun`, and the queue reads, hides, archives and dead-letters `agent_step`. The verbs read
 * the fixture bank: no bank service exists yet (`BankPort`'s only implementation).
 */
export function postgresEngineHost(
  url: string,
  /** The model, or how to make it from the host's store: the live one reads its ledger there. */
  muse: MuseClient | ((store: Store) => MuseClient),
  warn: (line: string) => void,
  tier: ModelTier = "contributor",
): HostDeps & { close(): Promise<void> } {
  const store = createPostgresStore(url, { ...POOL, role: "jadwigo_runner" });
  const pool = new pg.Pool({ connectionString: url, ...POOL });
  // A dropped idle connection emits 'error' on the pool; with no listener the process crashes.
  pool.on("error", (error) => warn(`an idle queue connection dropped: ${error.message}`));
  const queue = new PgmqRunQueue(pool, { role: "jadwigo_runner" });
  // The tier every model request names (EngineDeps.tier, dl-z5ja.91): the request says the tier
  // that answers it, and no slot of HttpMuse stands in for another.
  const engine: EngineDeps = {
    tier,
    store,
    muse: typeof muse === "function" ? muse(store) : muse,
    verbs: createVerbs({ bank: fixtureBank() }),
    queue,
    now: () => new Date(),
    // A call that went to a less private tier than the run asked for, answered or failed, is
    // logged with its ids only (dl-z5ja.91, dl-z5ja.103).
    onWarning: (w) =>
      warn(
        `${w.kind}: run ${w.run_id} call ${w.call_no} asked for ${w.requested}, went to ${w.answered}`,
      ),
  };
  return {
    engine,
    max_steps: MAX_STEPS,
    stuck: () => queue.stuck(),
    dead_letters: async () => (await queue.deadLetters()).length,
    warn,
    close: async () => {
      await Promise.all([store.close(), pool.end()]);
    },
  };
}
