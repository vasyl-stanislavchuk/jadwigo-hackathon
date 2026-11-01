// PgmqRunQueue on the dl-z5ja.52 queues (dl-z5ja.19): the run queue contract InMemoryRunQueue
// keeps too (contract.ts, dl-z5ja.56), with time passed by moving every step's vt back as the owner
// does, then what only pgmq has: a batch filled past a dead letter, the roles and the stuck-run
// alarm. Only this file uses agent_step, so each test empties it.
import { ID_PREFIXES, idOf, Uuid, uuidOf } from "@jadwigo/contracts";
import { RunId } from "@jadwigo/contracts/run";
import { createPostgresStore, type NewRun } from "@jadwigo/store";
import pg from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { databaseUrl } from "../config.ts";
import { runQueueContract } from "./contract.ts";
import { PgmqRunQueue } from "./pgmq.ts";
import { MAX_READS } from "./types.ts";

const owner = new pg.Pool({ connectionString: databaseUrl() });
const q = new PgmqRunQueue(owner);
const api = new PgmqRunQueue(owner, { role: "jadwigo_api" });
const store = createPostgresStore(databaseUrl());
afterAll(async () => {
  await store.close();
  await owner.end();
});

const RUN = RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID()));

/** Moves pgmq's clock on by `s` seconds for every step, as InMemoryRunQueue's tick does. */
async function tick(s: number) {
  await owner.query(
    "update pgmq.q_agent_step set vt = vt - make_interval(secs => $1), enqueued_at = enqueued_at - make_interval(secs => $1)",
    [s],
  );
}

async function purge() {
  await owner.query("select pgmq.purge_queue('agent_step'), pgmq.purge_queue('agent_step_dlq')");
}
beforeEach(purge);

runQueueContract("PgmqRunQueue", async () => {
  await purge();
  return { q, tick };
});

describe("PgmqRunQueue's dead letter", () => {
  it("fills a batch past a step it dead-letters", async () => {
    const dead = await q.send({ run_id: RUN, attempt: 1 });
    for (let i = 1; i <= MAX_READS; i++) {
      await q.read(10, 1);
      await tick(10);
    }
    const fresh = await q.send({ run_id: RUN, attempt: 2 });
    expect((await q.read(10, 1)).map((s) => s.msg_id)).toEqual([fresh]);
    expect((await q.deadLetters()).map((s) => s.msg_id)).toEqual([dead]);
  });
});

describe("PgmqRunQueue's roles", () => {
  it("lets the API's role send a step and nothing more", async () => {
    const sent = await api.send({ run_id: RUN, attempt: 1 });
    await expect(api.read(60, 1)).rejects.toThrow();
    expect((await q.read(60, 1)).map((s) => s.msg_id)).toEqual([sent]);
  });
});

describe("the stuck-run alarm", () => {
  it("shows the age of the oldest ready step and a planted run past its deadline", async () => {
    expect((await q.stuck()).oldest_ready_step_age_s).toBeNull();
    const member = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
    const stuck = RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID()));
    // Planted in SQL under the pod's scope, as the store writes a run (dl-z5ja.19 part 1).
    const client = await owner.connect();
    try {
      await client.query("begin; set local role jadwigo_api");
      await client.query("select set_config('app.pod_id', $1, true)", [
        uuidOf(ID_PREFIXES.pod, member.pod),
      ]);
      await client.query(
        `insert into run (id, pod_id, created_by, workflow, idle_deadline_at, max_deadline_at, cap_usd)
         values ($1, $2, $3, 'jadwigo-lesson-compose', '2026-09-01T08:10:00Z', '2026-09-01T09:00:00Z', 1)`,
        [
          uuidOf(ID_PREFIXES.run, stuck),
          uuidOf(ID_PREFIXES.pod, member.pod),
          uuidOf(ID_PREFIXES.account, member.account),
        ],
      );
      await client.query("commit");
    } finally {
      client.release();
    }
    // 2 steps 2 minutes old: one read and held by its consumer, which is not waiting, and one ready.
    await q.send({ run_id: stuck, attempt: 1 });
    await q.send({ run_id: RUN, attempt: 1 });
    await tick(120);
    await q.read(60, 1);

    const alarm = await q.stuck();
    expect(alarm.oldest_ready_step_age_s).toBeGreaterThanOrEqual(120);
    expect(alarm.runs_past_deadline).toContainEqual({ pod: member.pod, run_id: stuck });
  });
});

describe("PgmqRunQueue joining a store unit (dl-z5ja.67)", () => {
  async function stepsFor(run: RunId) {
    const { rows } = await owner.query<{ n: number }>(
      "select count(*)::int as n from pgmq.q_agent_step where message ->> 'run_id' = $1",
      [run],
    );
    return rows[0]?.n;
  }

  function newRun(account: NewRun["created_by"], id: RunId): NewRun {
    return {
      id,
      created_by: account,
      conversation_id: null,
      workflow: "jadwigo-lesson-compose",
      resumes: null,
      cap_usd: 1,
      idle_deadline_at: "2026-09-01T08:10:00.000Z",
      max_deadline_at: "2026-09-01T09:00:00.000Z",
    };
  }

  it("sends nothing when the unit rolls back, and one step when it commits", async () => {
    const member = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
    const lost = RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID()));
    await expect(
      store.unit(async () => {
        await store.createRun(member.pod, newRun(member.account, lost));
        await PgmqRunQueue.joining(store.unitSql()).send({ run_id: lost, attempt: 1 });
        throw new Error("planted after the send");
      }),
    ).rejects.toThrow("planted after the send");
    expect(await store.findRunPod(lost)).toBeUndefined();
    expect(await stepsFor(lost)).toBe(0);

    const kept = RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID()));
    const sent = await store.unit(async () => {
      await store.createRun(member.pod, newRun(member.account, kept));
      return PgmqRunQueue.joining(store.unitSql()).send({ run_id: kept, attempt: 1 });
    });
    expect(await store.findRunPod(kept)).toBe(member.pod);
    expect(await stepsFor(kept)).toBe(1);
    expect((await q.read(60, 1)).map((s) => [s.msg_id, s.message])).toEqual([
      [sent, { run_id: kept, attempt: 1 }],
    ]);
  });

  it("runs as the unit's role, and its handle works only inside the unit", async () => {
    // The store runs as jadwigo_api, which may only send: a joined read is refused as that role.
    await expect(
      store.unit(async () => PgmqRunQueue.joining(store.unitSql()).read(60, 1)),
    ).rejects.toThrow();
    expect(() => store.unitSql()).toThrow("inside unit()");
    const handle = await store.unit(async () => store.unitSql());
    await expect(PgmqRunQueue.joining(handle).send({ run_id: RUN, attempt: 1 })).rejects.toThrow(
      "outlived its unit",
    );
  });
});
