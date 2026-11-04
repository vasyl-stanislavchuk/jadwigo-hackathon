import type { ModelTier } from "@jadwigo/contracts/run";
import {
  type AttachmentReader,
  type BankPort,
  type Converter,
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

/**
 * How long an invocation starts new steps: the module's 300 s timeout, less `STEP_VISIBILITY_S`, the
 * longest a healthy step takes, less 10 s for the cold start's open and the reads after the drain.
 * A run under it never waits for the next minute's schedule (dl-hin8.33); one past it does, until
 * `dl-hin8.41`. This does not bound a run: its budget and deadlines do.
 */
const MAX_DRAIN_MS = 230_000;

/**
 * How long a thrown step waits before this invoke tries it again, by its read (dl-hin8.51). Short
 * enough that a parent sees no stall, long enough that an outage of a few seconds passes.
 */
const RETRY_AFTER_S = [5, 20] as const;

/**
 * The engine on Postgres as `jadwigo_runner`: the store sets `app.pod_id` per unit after
 * `authorizeRun`, and the queue reads, hides, archives and dead-letters `agent_step`. The verbs read
 * the bank they are given (the real one through the API in the Lambda, dl-1u6fn.4; the fixture in a
 * probe or a test) and the run's pod's learner records through the same store.
 */
export function postgresEngineHost(
  url: string,
  /** The model, or how to make it from the host's store: the live one reads its ledger there. */
  muse: MuseClient | ((store: Store) => MuseClient),
  warn: (line: string) => void,
  tier: ModelTier = "contributor",
  /** Where the turn's photos are read: S3 in the Lambda; none in a probe or a test. */
  attachments?: AttachmentReader,
  /** Where a PDF, a DOCX or a HEIC becomes page JPEGs: the converter Lambda; none in a probe. */
  converter?: Converter,
  /** Where the verbs draw questions: `apiBank` in the Lambda; the fixture when none is given. */
  bank: BankPort = fixtureBank(),
): HostDeps & { close(): Promise<void> } {
  const store = createPostgresStore(url, { ...POOL, role: "jadwigo_runner" });
  const pool = new pg.Pool({ connectionString: url, ...POOL });
  // A dropped idle connection emits 'error' on the pool; with no listener the process crashes.
  pool.on("error", (error) => warn(`an idle queue connection dropped: ${error.message}`));
  const queue = new PgmqRunQueue(pool, { role: "jadwigo_runner" });
  const now = () => new Date();
  // The tier every model request names (EngineDeps.tier, dl-z5ja.91): the request says the tier
  // that answers it, and no slot of HttpMuse stands in for another.
  const engine: EngineDeps = {
    tier,
    store,
    muse: typeof muse === "function" ? muse(store) : muse,
    // The learner verbs read one learner of the run's pod through this store, as jadwigo_runner,
    // whose grants cover their reads (dl-z5ja.125); without it they refuse (dl-z5ja.127).
    verbs: createVerbs({ bank, learners: store, now }),
    queue,
    now,
    ...(attachments === undefined ? {} : { attachments }),
    ...(converter === undefined ? {} : { converter }),
    // A call that went to a less private tier than the run asked for, answered or failed, is
    // logged with its ids only (dl-z5ja.91, dl-z5ja.103).
    onWarning: (w) =>
      warn(
        `${w.kind}: run ${w.run_id} call ${w.call_no} asked for ${w.requested}, went to ${w.answered}`,
      ),
  };
  return {
    engine,
    max_drain_ms: MAX_DRAIN_MS,
    retry: {
      after_s: RETRY_AFTER_S,
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
    stuck: () => queue.stuck(),
    dead_letters: async () => (await queue.deadLetters()).length,
    warn,
    close: async () => {
      await Promise.all([store.close(), pool.end()]);
    },
  };
}
