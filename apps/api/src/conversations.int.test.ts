// The conversation routes on PostgresStore, each step sent to pgmq's agent_step as jadwigo_api
// (the queue's send-only grant), against the database `make migrate` built from the DATABASE_URL
// in .env.local. Steps are counted by run id in the queue's tables, read as the login, so a
// consumer test sharing the database cannot hide one.
import { ID_PREFIXES, uuidOf } from "@jadwigo/contracts";
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
  () => {
    const queue = pgmqQueue(url);
    let unseen = 0;
    return {
      // Each send first asks, on another connection, whether its run row is there yet.
      queue: {
        send: async (message, delay_s) => {
          const { rows } = await login.query("select 1 from run where id = $1", [
            uuidOf(ID_PREFIXES.run, message.run_id),
          ]);
          if (rows.length === 0) unseen += 1;
          return queue.send(message, delay_s);
        },
        read: (vt_s, qty) => queue.read(vt_s, qty),
        archive: (msg_id) => queue.archive(msg_id),
        deadLetters: () => queue.deadLetters(),
      },
      unseenAtSend: async () => unseen,
      async stepsFor(run) {
        const { rows } = await login.query<{ n: number }>(
          `select count(*)::int as n from (
           select message from pgmq.q_agent_step union all select message from pgmq.a_agent_step
         ) steps where message->>'run_id' = $1`,
          [run],
        );
        return rows[0]?.n ?? 0;
      },
    };
  },
  { units: true },
);
