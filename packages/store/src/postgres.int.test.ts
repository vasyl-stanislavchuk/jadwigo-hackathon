// PostgresStore against the database `make migrate` built: Postgres.app 17 on port 5433 locally,
// the PGDG packages in CI. The contract suite is the one InMemoryStore passes in store.test.ts.
import { ID_PREFIXES, uuidOf } from "@jadwigo/contracts";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { introspect } from "./db/introspect.ts";
import { COLUMNS } from "./db/types.ts";
import { createPostgresStore, refusal } from "./postgres.ts";
import { seed, storeContract } from "./store.contract.ts";

const store = createPostgresStore(databaseUrl());
afterAll(() => store.close());

storeContract("PostgresStore", () => store);

describe("PostgresStore's refusals", () => {
  it("names an answer the database refuses on an ended question QuestionNotOpen", async () => {
    // Planted past the store's own check: an insert straight into attempt_answer, as the owner.
    const a = await seed(store);
    const { attempt } = await store.startAttempt(a.pod, { assignment_id: a.assignment });
    await store.endAttemptQuestion(a.pod, attempt.id, 1, "skipped");
    const client = new pg.Client({ connectionString: databaseUrl() });
    await client.connect();
    try {
      const failure = await client
        .query(
          `insert into attempt_answer (event_id, pod_id, attempt_id, seq, try_no, kind, value,
             latency_ms, help_used, asked_at, answered_at, correct, judged_by, body_hash)
           select gen_random_uuid(), q.pod_id, q.attempt_id, q.seq, 1, 'try', '{"entered":"6"}',
             1000, 0, q.asked_at, q.asked_at, true, 'core', 'planted'
           from attempt_question q where q.attempt_id = $1 and q.seq = 1`,
          [uuidOf(ID_PREFIXES.attempt, attempt.id)],
        )
        .then(
          () => undefined,
          (error: unknown) => error,
        );
      expect(failure).toMatchObject({ code: "23001", constraint: "attempt_answer_question_open" });
      expect(refusal(failure)).toMatchObject({ type: "QuestionNotOpen" });
      // Every other restrict_violation stays BadRequest.
      const other = Object.assign(new Error("attempt is finished"), { code: "23001" });
      expect(refusal(other)).toMatchObject({ type: "BadRequest" });
    } finally {
      await client.end();
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
