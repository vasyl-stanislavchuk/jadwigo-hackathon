// The learner knowledge route suite on PostgresStore, against the database `make migrate` built
// from DATABASE_URL, with core's fold, brief and digest stood in by testing/fold.ts. Each case
// makes its own parents and learners, so the runs share one database.
import { createPostgresStore } from "@jadwigo/store";
import { afterAll, vi } from "vitest";
import { databaseUrl } from "./config.ts";
import { knowledgeSuite } from "./testing/knowledge.suite.ts";

vi.mock("@jadwigo/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@jadwigo/core")>()),
  ...(await import("./testing/fold.ts")).STAND_IN_CORE,
}));

const url = databaseUrl();
if (url === undefined) throw new Error("DATABASE_URL is unset: see .env.example");
const store = createPostgresStore(url);
afterAll(() => store.close());

knowledgeSuite("PostgresStore", () => store);
