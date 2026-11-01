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
    expect(me.pod.id).toBe(a.pod);
    expect(me.learners.map((l) => [l.learner.first_name, l.goals.map((g) => g.name)])).toEqual([
      ["Mole", ["Tables of 2"]],
    ]);
    await expect(runner.getMe(a.pod, b.account)).rejects.toThrow();
    await expect(runner.addLearner(a.pod, { first_name: "Vole", goals: [] })).rejects.toThrow();
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
