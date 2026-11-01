// The conversation routes on PostgresStore, each step sent to pgmq's agent_step as jadwigo_api
// (the queue's send-only grant), against the database `make migrate` built from the DATABASE_URL
// in .env.local. Steps are counted by run id in the queue's tables, read as the login, so a
// consumer test sharing the database cannot hide one.
import { createPostgresStore } from "@jadwigo/store";
import pg from "pg";
import { afterAll } from "vitest";
import { databaseUrl } from "./config.ts";
import { pgmqQueue } from "./queue.ts";
import { conversationSuite } from "./testing/conversations.suite.ts";

const url = databaseUrl();
if (url === undefined) throw new Error("DATABASE_URL is unset: see .env.example");
const store = createPostgresStore(url);
const login = new pg.Pool({ connectionString: url, max: 1 });
afterAll(async () => {
  await store.close();
  await login.end();
});

conversationSuite(
  "PostgresStore",
  () => store,
  () => ({
    queue: pgmqQueue(url),
    async stepsFor(run) {
      const { rows } = await login.query<{ n: number }>(
        `select count(*)::int as n from (
           select message from pgmq.q_agent_step union all select message from pgmq.a_agent_step
         ) steps where message->>'run_id' = $1`,
        [run],
      );
      return rows[0]?.n ?? 0;
    },
  }),
);
