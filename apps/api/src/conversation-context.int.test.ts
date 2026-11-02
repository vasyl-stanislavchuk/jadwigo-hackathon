// A message's page context through the message route on PostgresStore (dl-z5ja.114), against the
// database `make migrate` built from the DATABASE_URL in .env.local. The step joins the request's
// unit on pgmq (dl-z5ja.67), so the queue the routes are given is never sent to.
import { createPostgresStore } from "@jadwigo/store";
import { afterAll } from "vitest";
import { databaseUrl } from "./config.ts";
import { contextSuite } from "./testing/context.suite.ts";

const url = databaseUrl();
if (url === undefined) throw new Error("DATABASE_URL is unset: see .env.example");
const store = createPostgresStore(url);
afterAll(async () => {
  await store.close();
});

const refusing = () => Promise.reject(new Error("the step joins the unit"));

contextSuite(
  "PostgresStore",
  () => store,
  () => ({
    queue: { send: refusing, read: refusing, archive: refusing, deadLetters: refusing },
    stepsFor: async () => 0,
  }),
);
