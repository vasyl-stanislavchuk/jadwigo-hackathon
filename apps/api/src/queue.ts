import { PgmqRunQueue, type RunQueue } from "@jadwigo/jadwigo-ai";
import pg from "pg";

/**
 * pgmq's `agent_step` on a pool of its own, 1 connection like the store's, sent as `jadwigo_api`,
 * which may only send. Its own connection, so a send inside the request's unit never waits on
 * the store's one. The send commits on its own, before the unit does: a unit that rolls back
 * after it leaves a step that names no run.
 */
export function pgmqQueue(url: string): RunQueue {
  const pool = new pg.Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 });
  // A dropped idle connection emits 'error' on the pool; with no listener the Lambda crashes.
  pool.on("error", () => undefined);
  return new PgmqRunQueue(pool, { role: "jadwigo_api" });
}
