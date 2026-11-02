// The MCP's lesson tools on PostgresStore, against the database `make migrate` built from the
// DATABASE_URL in .env.local: each case makes its own parents, so the runs share one database.
import { createPostgresStore } from "@jadwigo/store";
import { afterAll } from "vitest";
import { databaseUrl } from "../config.ts";
import { lessonSuite } from "../testing/mcp-lesson.suite.ts";

const url = databaseUrl();
if (url === undefined) throw new Error("DATABASE_URL is unset: see .env.example");
const store = createPostgresStore(url);
afterAll(() => store.close());

lessonSuite("PostgresStore", () => store);
