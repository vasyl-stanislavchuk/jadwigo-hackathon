// PostgresStore against the database `make migrate` built: Postgres.app 17 on port 5433 locally,
// the PGDG packages in CI. The contract suite is the one InMemoryStore passes in store.test.ts.
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { introspect } from "./db/introspect.ts";
import { COLUMNS } from "./db/types.ts";
import { createPostgresStore } from "./postgres.ts";
import { storeContract } from "./store.contract.ts";

const store = createPostgresStore(databaseUrl());
afterAll(() => store.close());

storeContract("PostgresStore", () => store);

describe("Postgres", () => {
  it("runs 17, with the schema src/db/types.ts was generated from", async () => {
    const client = new pg.Client({ connectionString: databaseUrl() });
    await client.connect();
    try {
      const version = await client.query<{ major: number }>(
        "select current_setting('server_version_num')::int / 10000 as major",
      );
      expect(version.rows[0]?.major).toBe(17);
      // A new migration changes this: run `bun run db:types` in packages/store.
      expect(await introspect(client)).toEqual(COLUMNS);
    } finally {
      await client.end();
    }
  });
});
