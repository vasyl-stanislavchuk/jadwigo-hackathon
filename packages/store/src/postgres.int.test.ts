// Proves Postgres 17 answers, locally (Postgres.app, port 5433) and in CI, and that `make migrate`
// built the core v0 schema. PostgresStore's contract run replaces it (dl-e8ov.2.32.3).
import pg from "pg";
import { describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";

describe("Postgres", () => {
  it("runs 17 with the core v0 tables", async () => {
    const client = new pg.Client({ connectionString: databaseUrl() });
    await client.connect();
    try {
      const { rows } = await client.query<{ major: string; tables: string }>(
        "select current_setting('server_version_num')::int / 10000 as major, " +
          "(select count(*) from pg_tables where schemaname = 'public') as tables",
      );
      expect(Number(rows[0]?.major)).toBe(17);
      expect(Number(rows[0]?.tables)).toBe(10);
    } finally {
      await client.end();
    }
  });
});
