// The integration placeholder: proves CI's Postgres 16 (and Postgres.app locally) answers.
// The Postgres store replaces this once dl-e8ov.5.34 maps the records.
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";

describe("Postgres", () => {
  it("answers a query", async () => {
    const sql = postgres(databaseUrl(), { max: 1 });
    try {
      const rows = await sql`select 1 as one`;
      expect(rows[0]?.["one"]).toBe(1);
    } finally {
      await sql.end();
    }
  });
});
