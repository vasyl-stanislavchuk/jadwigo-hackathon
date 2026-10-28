// PostgresStore against the database `make migrate` built: Postgres.app 17 on port 5433 locally,
// the PGDG packages in CI. The contract suite is the one InMemoryStore passes in store.test.ts.
import { AttemptId, ID_PREFIXES, idOf, PodId } from "@jadwigo/contracts";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { introspect } from "./db/introspect.ts";
import { COLUMNS } from "./db/types.ts";
import { createPostgresStore } from "./postgres.ts";
import { storeContract } from "./store.contract.ts";
import { StoreError } from "./store.ts";

const store = createPostgresStore(databaseUrl());
afterAll(() => store.close());

storeContract("PostgresStore", () => store);

describe("PostgresStore's units", () => {
  it("rolls back every write in a unit that throws, and maps a refusal inside one", async () => {
    const pod = PodId.parse(idOf(ID_PREFIXES.pod, crypto.randomUUID()));
    await expect(
      store.unit(async () => {
        await store.putPod({ id: pod, name: "Pod of moles", language: "en" });
        throw new Error("planted");
      }),
    ).rejects.toThrow("planted");
    // The pod was rolled back with the unit, so a write into it is refused.
    await expect(store.putLearner(pod, { handle: "mole", first_name: "Mole" })).rejects.toEqual(
      expect.objectContaining({ type: "NotFound" }),
    );
    await expect(
      store.unit(() => store.putLearner(pod, { handle: "mole", first_name: "Mole" })),
    ).rejects.toBeInstanceOf(StoreError);
  });

  it("refuses a call left running after its unit ended, rather than borrow another request's connection", async () => {
    let release = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let late: Promise<unknown> | undefined;
    await store.unit(async () => {
      late = gate.then(() =>
        store.findAttemptPod(AttemptId.parse(idOf(ID_PREFIXES.attempt, crypto.randomUUID()))),
      );
    });
    release();
    await expect(late).rejects.toThrow("outlived its unit");
  });

  it("runs a unit on one connection, so a pool of 1 serves nested calls", async () => {
    const one = createPostgresStore(databaseUrl(), { max: 1, connectionTimeoutMillis: 2000 });
    try {
      const pod = PodId.parse(idOf(ID_PREFIXES.pod, crypto.randomUUID()));
      const lessons = await one.unit(async () => {
        await one.putPod({ id: pod, name: "Pod of moles", language: "en" });
        return one.listOpenAssignments(pod);
      });
      expect(lessons).toEqual([]);
    } finally {
      await one.close();
    }
  });
});

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
