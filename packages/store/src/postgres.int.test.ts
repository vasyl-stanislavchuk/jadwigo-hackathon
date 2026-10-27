// Proves Postgres 17 answers, locally (Postgres.app, port 5433) and in CI, and that `make migrate`
// built the core v0 schema. PostgresStore's contract run replaces it (dl-e8ov.2.32.3).
import { RECORDS } from "@jadwigo/contracts";
import pg from "pg";
import { describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";

describe("Postgres", () => {
  it("runs 17 with the core v0 tables", async () => {
    const client = new pg.Client({ connectionString: databaseUrl() });
    await client.connect();
    try {
      const version = await client.query<{ major: number }>(
        "select current_setting('server_version_num')::int / 10000 as major",
      );
      expect(version.rows[0]?.major).toBe(17);
      const relations = await client.query<{ table_name: string }>(
        "select table_name from information_schema.tables where table_schema = 'public'",
      );
      // Every record's table or view, and any a later migration adds.
      expect(relations.rows.map((r) => r.table_name)).toEqual(
        expect.arrayContaining(Object.keys(RECORDS)),
      );
    } finally {
      await client.end();
    }
  });
});
