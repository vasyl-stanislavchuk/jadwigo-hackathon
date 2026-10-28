// The route suite on PostgresStore, against the database `make migrate` built (Postgres.app 17 on
// port 5433 locally). Each case uses fresh attempt and assignment ids, so the runs share one database.
import { createPostgresStore } from "@jadwigo/store";
import { afterAll } from "vitest";
import { databaseUrl } from "./config.ts";
import { routeSuite } from "./testing/routes.suite.ts";

const url = databaseUrl();
if (url === undefined) throw new Error("DATABASE_URL is unset: see .env.example");
const store = createPostgresStore(url);
afterAll(() => store.close());

routeSuite("PostgresStore", () => store);
