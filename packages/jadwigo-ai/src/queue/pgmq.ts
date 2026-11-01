import { ID_PREFIXES, idOf, PodId } from "@jadwigo/contracts";
import { RunId, RunStepInput } from "@jadwigo/contracts/run";
import { MAX_READS, type QueuedStep, type RunQueue } from "./types.ts";

/**
 * `RunQueue` on pgmq's `agent_step` (dl-z5ja.19, on the dl-z5ja.52 migration
 * `supabase/migrations/20261101130000_run_queue.sql`). Each call is one transaction, run as
 * `jadwigo_runner` (the step consumer) or `jadwigo_api` (which may only send), never as the owner.
 * The queue holds no learner data: a message is a `RunStepInput`, the run's wire id and an attempt.
 *
 * It keeps `InMemoryRunQueue`'s rules on pgmq's own clock: `pgmq.read` hides a step for `vt_s` and
 * counts the read before it answers, oldest `msg_id` first, and a step read more than `MAX_READS`
 * times goes to `agent_step_dlq` through `app.agent_step_dead_letter`, moved and archived in one
 * statement, so it is never in both queues nor in neither.
 */

/** A connection from the pool, as `pg.PoolClient` has it. */
export interface PgmqClient {
  query<R>(text: string, values?: readonly unknown[]): Promise<{ rows: R[] }>;
  release(): void;
}

/** What the queue needs of a pool: `pg.Pool` meets it. The engine itself never imports `pg`. */
export interface PgmqPool {
  connect(): Promise<PgmqClient>;
}

/**
 * A transaction someone else opened and will end: the store unit's `unitSql()` meets it
 * (`@jadwigo/store`, dl-z5ja.67). A queue joining it runs as that transaction's role.
 */
export interface PgmqTransaction {
  query<R>(text: string, values?: readonly unknown[]): Promise<{ rows: R[] }>;
}

/** The roles a queue may run as. Both own no table and never bypass row-level security. */
const QUEUE_ROLES = ["jadwigo_runner", "jadwigo_api"] as const;
type QueueRole = (typeof QUEUE_ROLES)[number];

const QUEUE = "agent_step";

interface MessageRow {
  msg_id: string;
  read_ct: number;
  enqueued_at: Date;
  vt: Date;
  message: unknown;
}

/** What the stuck-run alarm reads (`docs/research/posthog-ai-production.md`, Observability). */
export interface StuckRuns {
  /**
   * Seconds since the oldest step that is ready and that no consumer holds was enqueued: visible
   * (`vt` at or before now) and not archived. Null when none waits. The one number that says the
   * queue is stuck, as PostHog's `workflow_dispatch_oldest_ready_age_seconds`.
   */
  oldest_ready_step_age_s: number | null;
  /** Every run, in any pod, that has not ended and whose idle or hard deadline has come. */
  runs_past_deadline: readonly { pod: PodId; run_id: RunId }[];
}

export class PgmqRunQueue implements RunQueue {
  readonly #pool: PgmqPool;
  readonly #role: QueueRole;
  /** The transaction every call joins, when the queue was made by `joining`. */
  #joined: PgmqTransaction | null = null;

  constructor(pool: PgmqPool, { role = "jadwigo_runner" }: { role?: QueueRole } = {}) {
    // The role is spliced into `set local role`, so only a name from the fixed list gets there.
    if (!QUEUE_ROLES.includes(role)) throw new Error(`${role} is not a queue role`);
    this.#pool = pool;
    this.#role = role;
  }

  /**
   * A queue whose every call runs in `tx`, a transaction its owner opened and will end: no
   * `begin`, `commit` or role of its own, so a step sent here commits or rolls back with the run
   * row and inbox row written beside it (dl-z5ja.67). The role is the transaction's.
   */
  static joining(tx: PgmqTransaction): PgmqRunQueue {
    const queue = new PgmqRunQueue({
      connect: () => Promise.reject(new Error("a joined queue opens no connection")),
    });
    queue.#joined = tx;
    return queue;
  }

  async send(message: RunStepInput, delay_s = 0): Promise<number> {
    const step = RunStepInput.parse(message);
    return this.#in(async (c) => {
      const { rows } = await c.query<{ msg_id: string }>(
        "select msg_id from pgmq.send($1, $2::jsonb, $3::integer) as msg_id",
        [QUEUE, JSON.stringify(step), delay_s],
      );
      return Number(rows[0]?.msg_id);
    });
  }

  async read(vt_s: number, qty: number): Promise<readonly QueuedStep[]> {
    return this.#in(async (c) => {
      const delivered: QueuedStep[] = [];
      // A dead-lettered step takes a place in the batch it was read in, so read again for the
      // places it left, as InMemoryRunQueue passes it by and goes on. Each round removes what it
      // dead-letters, so the loop ends.
      for (;;) {
        const want = qty - delivered.length;
        if (want <= 0) break;
        const { rows } = await c.query<MessageRow>(
          "select msg_id, read_ct, enqueued_at, vt, message from pgmq.read($1, $2::integer, $3::integer) order by msg_id",
          [QUEUE, vt_s, want],
        );
        if (rows.length === 0) break;
        let dead = 0;
        for (const row of rows) {
          if (row.read_ct > MAX_READS) {
            await c.query("select app.agent_step_dead_letter($1::bigint)", [row.msg_id]);
            dead++;
          } else {
            delivered.push(stepOf(row));
          }
        }
        if (dead === 0) break;
      }
      return delivered;
    });
  }

  async archive(msg_id: number): Promise<void> {
    await this.#in((c) => c.query("select pgmq.archive($1, $2::bigint)", [QUEUE, msg_id]));
  }

  async deadLetters(): Promise<readonly QueuedStep[]> {
    return this.#in(async (c) => {
      // Read the dead letter's table, not pgmq.read: looking must not hide or count a row.
      const { rows } = await c.query<MessageRow>(
        "select msg_id, read_ct, enqueued_at, vt, message from pgmq.q_agent_step_dlq order by msg_id",
      );
      return rows.map((row) => {
        // app.agent_step_dead_letter keeps the step's own msg_id and read count in the message.
        const { msg_id, read_ct, ...step } = row.message as {
          msg_id: number;
          read_ct: number;
        };
        return stepOf({ ...row, msg_id: String(msg_id), read_ct, message: step });
      });
    });
  }

  /** The stuck-run alarm's one read, at `now` as the database's clock has it. */
  async stuck(): Promise<StuckRuns> {
    return this.#in(async (c) => {
      const { rows: oldest } = await c.query<{ age_s: number | null }>(
        `select extract(epoch from now() - min(enqueued_at))::float8 as age_s
         from pgmq.q_agent_step where vt <= now()`,
      );
      const { rows: due } = await c.query<{ id: string; pod_id: string }>(
        "select id, pod_id from app.runs_due(now())",
      );
      return {
        oldest_ready_step_age_s: oldest[0]?.age_s ?? null,
        runs_past_deadline: due.map((r) => ({
          pod: PodId.parse(idOf(ID_PREFIXES.pod, r.pod_id)),
          run_id: RunId.parse(idOf(ID_PREFIXES.run, r.id)),
        })),
      };
    });
  }

  /** One transaction on one connection, as the queue's role; rolled back on a throw. */
  async #in<T>(work: (client: PgmqTransaction) => Promise<T>): Promise<T> {
    if (this.#joined) return work(this.#joined);
    const client = await this.#pool.connect();
    try {
      await client.query(`begin; set local role ${this.#role}`);
      const result = await work(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}

function stepOf(row: MessageRow): QueuedStep {
  return {
    msg_id: Number(row.msg_id),
    read_ct: row.read_ct,
    enqueued_at: row.enqueued_at.toISOString(),
    vt: row.vt.toISOString(),
    message: RunStepInput.parse(row.message),
  };
}
