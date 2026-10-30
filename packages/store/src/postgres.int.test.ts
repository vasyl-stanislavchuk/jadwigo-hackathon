// PostgresStore against the database `make migrate` built: Postgres.app 17 on port 5433 locally,
// the PGDG packages in CI. The contract suite is the one InMemoryStore passes in store.test.ts.
import { AttemptId, ID_PREFIXES, idOf, PodId, TopicId, Uuid, uuidOf } from "@jadwigo/contracts";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { introspect } from "./db/introspect.ts";
import { COLUMNS } from "./db/types.ts";
import { learnerKnowledgeContract } from "./knowledge.contract.ts";
import { createPostgresStore, refusal } from "./postgres.ts";
import { seed, storeContract } from "./store.contract.ts";
import { StoreError } from "./store.ts";

const store = createPostgresStore(databaseUrl());
afterAll(() => store.close());

storeContract("PostgresStore", () => store);
learnerKnowledgeContract("PostgresStore", () => store);

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

  it("keeps a unit going after a learner knowledge call it caught failed in the database", async () => {
    // The mastery rebuild after a finish catches its failure (apps/api/src/mastery.ts): each
    // learner knowledge call runs under a savepoint, so the unit's transaction stays usable.
    const pod = PodId.parse(idOf(ID_PREFIXES.pod, crypto.randomUUID()));
    const code = `test.lk${crypto.randomUUID().slice(0, 8)}.unit`;
    const listed = await store.unit(async () => {
      await store.putPod({ id: pod, name: "Pod of moles", language: "en" });
      // A topic no row has: the foreign key refuses it in the database, past every check in code.
      const failed = await store
        .putSkills(pod, [
          {
            code,
            topic_id: TopicId.parse(idOf(ID_PREFIXES.topic, crypto.randomUUID())),
            kind: "accuracy",
            status: "draft",
            can_do: null,
            aliases: [],
            prerequisites: [],
            source: "pod",
          },
        ])
        .catch((error: unknown) => error);
      expect(failed).toMatchObject({ type: "NotFound" });
      await store.ensureSkills(pod, [code]);
      return store.listSkills(pod);
    });
    expect(listed.filter((s) => s.code === code).map((s) => [s.pod_id, s.status])).toEqual([
      [pod, "draft"],
    ]);
  });

  it("holds a learner to the end of a unit: a 2nd unit's lock waits, then reads the 1st's rows", async () => {
    // The mastery rebuild takes this lock before it reads the evidence (apps/api/src/mastery.ts),
    // so 2 finishes for one learner never replace each other's mastery with a partial fold.
    const { pod } = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
    const { learner } = await store.addLearner(pod, { first_name: "Mole", goals: [] });
    const code = `test.lk${crypto.randomUUID().slice(0, 8)}.lock`;
    const order: string[] = [];
    let release = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let locked = () => {};
    const firstHolds = new Promise<void>((r) => {
      locked = r;
    });
    const first = store.unit(async () => {
      await store.lockLearner(pod, learner.id);
      order.push("1st holds");
      locked();
      await gate;
      await store.replaceMastery(pod, learner.id, [
        {
          skill_code: code,
          level: "attempted",
          needs_attention: false,
          tries: 1,
          last_answered_at: null,
          due_at: null,
          card: null,
        },
      ]);
      order.push("1st wrote");
    });
    await firstHolds;
    const second = store.unit(async () => {
      await store.lockLearner(pod, learner.id);
      order.push("2nd holds");
      return store.getMastery(pod, learner.id);
    });
    // Long enough for the 2nd unit to be waiting on the lock, were it free it would hold by now.
    await new Promise((r) => setTimeout(r, 200));
    expect(order).toEqual(["1st holds"]);
    release();
    await first;
    const read = await second;
    expect(order).toEqual(["1st holds", "1st wrote", "2nd holds"]);
    expect(read.map((m) => m.skill_code)).toEqual([code]);
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

describe("PostgresStore's claimed attempts", () => {
  it("reads a claimed attempt back with claimed_by as an account id, from both pods", async () => {
    // The claim is app.claim_attempt(), called as the owner with the claimer's pod set, until the
    // store calls it (dl-e8ov.2.39).
    const a = await seed(store);
    const { attempt } = await store.startAttempt(a.pod, { assignment_id: a.assignment });
    const home = crypto.randomUUID();
    const account = crypto.randomUUID();
    const learner = crypto.randomUUID();
    const client = new pg.Client({ connectionString: databaseUrl() });
    await client.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('app.pod_id', $1, true)", [home]);
      await client.query("insert into pod (id, name, language) values ($1, 'Pod of moles', 'en')", [
        home,
      ]);
      await client.query(
        "insert into account (id, pod_id, sub) values ($1, $2, gen_random_uuid())",
        [account, home],
      );
      await client.query(
        "insert into member (pod_id, account_id, role) values ($1, $2, 'parent')",
        [home, account],
      );
      await client.query(
        "insert into learner (id, pod_id, handle, first_name) values ($1, $2, 'mole', 'Mole')",
        [learner, home],
      );
      await client.query("select from app.claim_attempt($1, $2, $3)", [
        uuidOf(ID_PREFIXES.attempt, attempt.id),
        learner,
        account,
      ]);
      await client.query("commit");
    } finally {
      await client.end();
    }

    const played = await store.getAttempt(a.pod, attempt.id);
    expect(played.attempt).toMatchObject({
      pod_id: a.pod,
      learner_id: idOf(ID_PREFIXES.learner, learner),
      claimed_by: idOf(ID_PREFIXES.account, account),
      moved_by: null,
    });
    const claimer = PodId.parse(idOf(ID_PREFIXES.pod, home));
    expect((await store.getAttempt(claimer, attempt.id)).attempt).toEqual(played.attempt);
    const results = await store.getAttemptResult(claimer, attempt.id);
    expect(results.map((r) => r.seq)).toEqual([1]);
    expect(results).toEqual(await store.getAttemptResult(a.pod, attempt.id));
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
