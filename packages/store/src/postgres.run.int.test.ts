// PostgresStore's run methods on the dl-z5ja.7 tables (dl-z5ja.19): the run contract InMemoryStore
// passes in store.test.ts, as the API's role, then what the step consumer's role may do, and the
// races the run row's lock settles.
import { EventId, ID_PREFIXES, idOf, Uuid } from "@jadwigo/contracts";
import { ConversationId, type NewRunEvent, RunId } from "@jadwigo/contracts/run";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { createPostgresStore } from "./postgres.ts";
import { runContract } from "./run.contract.ts";
import type { NewRun } from "./run.ts";

const api = createPostgresStore(databaseUrl());
const runner = createPostgresStore(databaseUrl(), { role: "jadwigo_runner" });
afterAll(() => Promise.all([api.close(), runner.close()]));

runContract("PostgresStore", () => api);

async function scope() {
  const member = await api.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  return { pod: member.pod, account: member.account };
}

function newRun(account: NewRun["created_by"], conversation: NewRun["conversation_id"]): NewRun {
  return {
    id: RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID())),
    created_by: account,
    conversation_id: conversation,
    workflow: "jadwigo-lesson-compose",
    resumes: null,
    cap_usd: 1,
    idle_deadline_at: "2026-09-01T08:10:00.000Z",
    max_deadline_at: "2026-09-01T09:00:00.000Z",
  };
}

function message(run: RunId, text: string): NewRunEvent {
  return {
    run_id: run,
    event_id: EventId.parse(crypto.randomUUID()),
    type: "message",
    payload: { from: "parent", text },
  };
}

function modelResponse(run: RunId, cost_usd: number): NewRunEvent {
  return {
    run_id: run,
    event_id: EventId.parse(crypto.randomUUID()),
    type: "model_response",
    payload: {
      response_id: "resp_1",
      call_no: 1,
      text: "Here is a plan.",
      tool_calls: [],
      usage: { input_tokens: 10, output_tokens: 5, cached_tokens: 0 },
      cost_usd,
      model: "a-model",
      tier: "contributor",
    },
  };
}

function inbox(run: RunId, text: string) {
  const event_id = EventId.parse(crypto.randomUUID());
  return { run_id: run, event_id, kind: "message" as const, payload: { text } };
}

describe("PostgresStore as jadwigo_runner, the step consumer", () => {
  it("finds a run's pod, claims it, appends its events and takes its inbox", async () => {
    const a = await scope();
    const conversation = await api.createConversation(a.pod, {
      id: ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID())),
      created_by: a.account,
      title: null,
    });
    const run = await api.createRun(a.pod, newRun(a.account, conversation.id));
    await api.putRunInbox(a.pod, inbox(run.id, "Make it 5 questions."));

    expect(await runner.findRunPod(run.id)).toBe(a.pod);
    expect((await runner.listRunsDue("2026-09-01T08:10:00.000Z")).map((d) => d.run.id)).toContain(
      run.id,
    );
    const claimed = await runner.updateRun(a.pod, run.id, 1, { attempt: 2, status: "in_progress" });
    expect(claimed).toMatchObject({ stale: false, value: { attempt: 2, status: "in_progress" } });
    const appended = await runner.appendRunEvents(a.pod, run.id, 2, [
      message(run.id, "Halves, grade 2."),
    ]);
    expect(appended.value.map((e) => e.seq)).toEqual([1]);
    expect((await runner.takeRunInbox(a.pod, run.id)).map((r) => r.status)).toEqual(["delivered"]);
    expect(await runner.listRuns(a.pod, conversation.id)).toEqual([claimed.value]);
  });

  it("reads what runStep's names read needs of the run's pod, and nothing of another pod (dl-z5ja.81)", async () => {
    const a = await scope();
    const b = await scope();
    await api.addLearner(a.pod, { first_name: "Mole", goals: ["Tables of 2"] });
    await api.addLearner(b.pod, { first_name: "Wren", goals: [] });
    const me = await runner.getMe(a.pod, a.account);
    expect(me.pod?.id).toBe(a.pod);
    expect(me.learners.map((l) => [l.learner.first_name, l.goals.map((g) => g.name)])).toEqual([
      ["Mole", ["Tables of 2"]],
    ]);
    await expect(runner.getMe(a.pod, b.account)).rejects.toThrow();
    await expect(runner.addLearner(a.pod, { first_name: "Vole", goals: [] })).rejects.toThrow();
  });

  // dl-z5ja.89: the Muse lane's spend, across pods, from the model_response events every run logs.
  it("sums model_response costs across pods since a time, which only it may read", async () => {
    const since = new Date(Date.now() - 1000).toISOString();
    const before = await runner.spentUsd(["jadwigo-lesson-compose"], since);
    for (const [cost, other] of [
      [0.0125, 0.5],
      [0.03, 0.25],
    ] as const) {
      const p = await scope();
      const run = await api.createRun(p.pod, newRun(p.account, null));
      await runner.appendRunEvents(p.pod, run.id, 1, [
        modelResponse(run.id, cost),
        // A usage event carries spend too, and is not a call: never counted.
        { ...message(run.id, "x"), type: "usage", payload: { spent_usd: other, cap_usd: 1 } },
      ]);
    }
    const after = await runner.spentUsd(["jadwigo-lesson-compose"], since);
    // Other suites may log calls at the same time, so the 2 pods' 0.0425 is the least it grew by.
    expect(after - before).toBeGreaterThanOrEqual(0.0425 - 1e-9);
    expect(await runner.spentUsd([], since)).toBe(0);
    expect(await runner.spentUsd(["jadwigo-lesson-compose"], "2999-01-01T00:00:00.000Z")).toBe(0);
    await expect(api.spentUsd(["jadwigo-lesson-compose"], since)).rejects.toThrow();
  });

  // dl-z5ja.123: a call that failed after it spent counts toward the lane; only the runner records.
  it("records a failed call's cost under its run's pod, and the lane's sum counts it", async () => {
    const since = new Date(Date.now() - 1000).toISOString();
    const p = await scope();
    const run = await api.createRun(p.pod, newRun(p.account, null));
    const before = await runner.spentUsd(["jadwigo-lesson-compose"], since);
    await runner.recordFailedMuseCall(run.id, 1, 0.75);
    await runner.recordFailedMuseCall(
      RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID())),
      1,
      5,
    );
    const after = await runner.spentUsd(["jadwigo-lesson-compose"], since);
    expect(after - before).toBeGreaterThanOrEqual(0.75 - 1e-9);
    expect(after - before).toBeLessThan(5);
    await expect(api.recordFailedMuseCall(run.id, 2, 0.1)).rejects.toThrow();
    await expect(runner.recordFailedMuseCall(run.id, 2, 0)).rejects.toMatchObject({
      type: "BadRequest",
    });
  });

  it("is not the owner: it may not open an account, which only the API's role writes", async () => {
    await expect(runner.createAccount(Uuid.parse(crypto.randomUUID()), "pl")).rejects.toThrow();
  });
});

describe("PostgresStore's run row lock", () => {
  it("keeps seq gapless when steps of one run append at once", async () => {
    const a = await scope();
    const run = await api.createRun(a.pod, newRun(a.account, null));
    const batches = Array.from({ length: 6 }, (_, i) => [
      message(run.id, `step ${i}, first`),
      message(run.id, `step ${i}, second`),
    ]);
    const results = await Promise.all(
      batches.map((events) => api.appendRunEvents(a.pod, run.id, 1, events)),
    );
    expect(results.every((r) => !r.stale)).toBe(true);
    // Each batch's 2 events are numbered next to each other: one batch appends at a time.
    for (const r of results) expect((r.value[1]?.seq ?? 0) - (r.value[0]?.seq ?? 0)).toBe(1);
    const all = await api.listRunEvents(a.pod, run.id, 0);
    expect(all.map((e) => e.seq)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });

  it("lets one of 2 racing claims win, and the other answers stale", async () => {
    const a = await scope();
    const run = await api.createRun(a.pod, newRun(a.account, null));
    const claims = await Promise.all([
      api.updateRun(a.pod, run.id, 1, { attempt: 2 }),
      runner.updateRun(a.pod, run.id, 1, { attempt: 2 }),
    ]);
    expect(claims.map((c) => c.stale).sort()).toEqual([false, true]);
    expect((await api.getRun(a.pod, run.id)).attempt).toBe(2);
  });

  it("hands each inbox row to one of 2 racing takes", async () => {
    const a = await scope();
    const run = await api.createRun(a.pod, newRun(a.account, null));
    const put = await Promise.all(
      ["one", "two", "three"].map((text) => api.putRunInbox(a.pod, inbox(run.id, text))),
    );
    const takes = await Promise.all([
      api.takeRunInbox(a.pod, run.id),
      runner.takeRunInbox(a.pod, run.id),
    ]);
    expect(
      takes
        .flat()
        .map((r) => r.event_id)
        .sort(),
    ).toEqual(put.map((r) => r.event_id).sort());
  });

  it("dedupes an event_id repeated inside one batch before numbering it", async () => {
    const a = await scope();
    const run = await api.createRun(a.pod, newRun(a.account, null));
    const hello = message(run.id, "Halves, grade 2.");
    const { value } = await api.appendRunEvents(a.pod, run.id, 1, [hello, hello]);
    expect(value.map((e) => e.seq)).toEqual([1, 1]);
    expect(await api.listRunEvents(a.pod, run.id, 0)).toHaveLength(1);
  });
});

describe("PostgresStore's lesson revision lock (dl-z5ja.134)", () => {
  it("gives exactly 1 of 2 writers at the same expected revision ok, on 2 connections", async () => {
    const a = await scope();
    const conversation = await api.createConversation(a.pod, {
      id: ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID())),
      created_by: a.account,
      title: null,
    });
    for (let round = 0; round < 5; round++) {
      const first = await api.createRun(a.pod, newRun(a.account, conversation.id));
      const second = await api.createRun(a.pod, newRun(a.account, conversation.id));
      const write = (store: typeof api, run: RunId) =>
        store.unit(() =>
          store.appendLessonRevision(a.pod, run, 1, round, {
            run_id: run,
            event_id: EventId.parse(crypto.randomUUID()),
            type: "lesson_revision",
            payload: { revision: round + 1, call_id: "call_1", lesson_file: { title: "Rows" } },
          }),
        );
      // The API's role and the runner's, each on a connection of its own.
      const results = await Promise.all([write(api, first.id), write(runner, second.id)]);
      expect(results.map((r) => r.ok).sort()).toEqual([false, true]);
      expect(results.find((r) => !r.ok)).toMatchObject({ stale: "revision", latest: round + 1 });
    }
  });
});

describe("PostgresStore's run lock (#575's review)", () => {
  it("holds another unit's updateRun until the unit that locked the run ends", async () => {
    const a = await scope();
    const run = await api.createRun(a.pod, newRun(a.account, null));
    const order: string[] = [];
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let locked = () => {};
    const isLocked = new Promise<void>((resolve) => {
      locked = resolve;
    });
    // An accept: the run's row locked, its attempt read, the unit still open.
    const accept = api.unit(async () => {
      expect((await api.lockRun(a.pod, run.id)).attempt).toBe(1);
      locked();
      await held;
      order.push("accepted");
    });
    await isLocked;
    // An ender's claim, from a unit of its own: it waits for the accept.
    const claim = api.updateRun(a.pod, run.id, 1, { attempt: 2 }).then((claimed) => {
      order.push("claimed");
      return claimed;
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(order).toEqual([]);
    release();
    await accept;
    expect((await claim).stale).toBe(false);
    expect(order).toEqual(["accepted", "claimed"]);
  });

  it("locks only its own pod's run", async () => {
    const a = await scope();
    const b = await scope();
    const run = await api.createRun(a.pod, newRun(a.account, null));
    expect(await api.lockRun(a.pod, run.id)).toEqual(await api.getRun(a.pod, run.id));
    await expect(api.lockRun(b.pod, run.id)).rejects.toMatchObject({ type: "NotFound" });
  });
});
