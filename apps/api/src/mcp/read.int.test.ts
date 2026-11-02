// The MCP read tools on PostgresStore, against the database `make migrate` built from the
// DATABASE_URL in .env.local: the two-pod isolation runs under row-level security.
import { createPostgresStore } from "@jadwigo/store";
import { afterAll } from "vitest";
import { databaseUrl } from "../config.ts";
import { mcpReadSuite } from "../testing/mcp-read.suite.ts";

const url = databaseUrl();
if (url === undefined) throw new Error("DATABASE_URL is unset: see .env.example");
const store = createPostgresStore(url);
afterAll(() => store.close());

mcpReadSuite("PostgresStore", () => store);
