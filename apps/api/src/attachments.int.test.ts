// A message's photos (dl-z5ja.11.3) on PostgresStore, against the database `make migrate` built
// from the DATABASE_URL in .env.local, with the uploads bucket in memory. Steps join the request's
// unit, so a refused message leaves no row: the suite's "kept nothing" checks the rollback.
import { createPostgresStore } from "@jadwigo/store";
import { afterAll } from "vitest";
import { databaseUrl } from "./config.ts";
import { attachmentSuite } from "./testing/attachments.suite.ts";

const url = databaseUrl();
if (url === undefined) throw new Error("DATABASE_URL is unset: see .env.example");
const store = createPostgresStore(url);
afterAll(() => store.close());

const refusing = (what: string) => () =>
  Promise.reject(new Error(`${what}: the step joins the unit`));
const joinedOnly = {
  send: refusing("send"),
  read: refusing("read"),
  archive: refusing("archive"),
  deadLetters: refusing("deadLetters"),
};

attachmentSuite(
  "PostgresStore",
  () => store,
  () => ({ queue: joinedOnly, stepsFor: async () => 0 }),
);
