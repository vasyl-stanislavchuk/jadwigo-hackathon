import { AssignmentId, EventId, ID_PREFIXES, idOf, PodId, Uuid } from "@jadwigo/contracts";
import { RunId } from "@jadwigo/contracts/run";
import { describe, expect, it } from "vitest";
import { attachmentContract } from "./attachment.contract.ts";
import { learnerKnowledgeContract } from "./knowledge.contract.ts";
import { InMemoryStore } from "./memory.ts";
import { runContract } from "./run.contract.ts";
import { seed, storeContract } from "./store.contract.ts";

storeContract("InMemoryStore", () => new InMemoryStore());
learnerKnowledgeContract("InMemoryStore", () => new InMemoryStore());
runContract("InMemoryStore", () => new InMemoryStore());
attachmentContract("InMemoryStore", () => new InMemoryStore());

describe("InMemoryStore", () => {
  it("stamps records with the clock it is given", async () => {
    const store = new InMemoryStore({ now: () => new Date("2026-10-27T09:00:00.000Z") });
    const pod = await store.putPod({
      id: PodId.parse(idOf(ID_PREFIXES.pod, crypto.randomUUID())),
      name: "Pod of foxes",
      language: "pl",
    });
    expect(pod.created_at).toBe("2026-10-27T09:00:00.000Z");
  });

  // dl-z5ja.89: what the Muse lane has spent, across pods, since a time.
  it("sums the model_response costs of a workflow's runs across pods since a time", async () => {
    let now = new Date("2026-11-01T08:00:00.000Z");
    const store = new InMemoryStore({ now: () => now });
    const call = (run: RunId, cost_usd: number) => ({
      run_id: run,
      event_id: EventId.parse(crypto.randomUUID()),
      type: "model_response" as const,
      payload: {
        response_id: "resp_1",
        call_no: 1,
        text: null,
        tool_calls: [],
        usage: { input_tokens: 1, output_tokens: 1, cached_tokens: 0 },
        cost_usd,
        model: "a-model",
        tier: "contributor" as const,
      },
    });
    const runIn = async () => {
      const m = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
      const run = await store.createRun(m.pod, {
        id: RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID())),
        created_by: m.account,
        conversation_id: null,
        workflow: "jadwigo-lesson-compose",
        resumes: null,
        cap_usd: 1,
        idle_deadline_at: null,
        max_deadline_at: "2026-11-01T09:00:00.000Z",
      });
      return { pod: m.pod, run: run.id };
    };
    const a = await runIn();
    const b = await runIn();
    await store.appendRunEvents(a.pod, a.run, 1, [call(a.run, 0.0125)]);
    now = new Date("2026-11-01T10:00:00.000Z");
    await store.appendRunEvents(a.pod, a.run, 1, [call(a.run, 0.02)]);
    await store.appendRunEvents(b.pod, b.run, 1, [
      call(b.run, 0.03),
      {
        run_id: b.run,
        event_id: EventId.parse(crypto.randomUUID()),
        type: "usage",
        payload: { spent_usd: 5, cap_usd: 9 },
      },
    ]);
    const workflows = ["jadwigo-lesson-compose"] as const;
    expect(await store.spentUsd(workflows, "2026-11-01T09:00:00.000Z")).toBeCloseTo(0.05, 10);
    expect(await store.spentUsd(workflows, "2026-11-01T00:00:00.000Z")).toBeCloseTo(0.0625, 10);
    expect(await store.spentUsd([], "2026-11-01T00:00:00.000Z")).toBe(0);
    // dl-z5ja.123: a call that failed after it spent counts too; an unknown run records nothing.
    await store.recordFailedMuseCall(b.run, 2, 0.5);
    await store.recordFailedMuseCall(RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID())), 1, 9);
    await expect(store.recordFailedMuseCall(b.run, 3, 0)).rejects.toMatchObject({
      type: "BadRequest",
    });
    expect(await store.spentUsd(workflows, "2026-11-01T09:00:00.000Z")).toBeCloseTo(0.55, 10);
  });

  it("lists open assignments made at the same instant in id order", async () => {
    const store = new InMemoryStore({ now: () => new Date("2026-10-27T09:00:00.000Z") });
    const a = await seed(store);
    const ids = ["c", "a", "b"].map((n) =>
      AssignmentId.parse(idOf(ID_PREFIXES.assignment, `0000000${n}-0000-4000-8000-000000000000`)),
    );
    for (const id of ids) {
      await store.putAssignment(a.pod, {
        audience: "anyone",
        identity: "none",
        lesson_id: a.lesson,
        id,
      });
    }
    const open = (await store.listOpenAssignments(a.pod)).map((o) => o.assignment.id);
    expect(open).toEqual([a.assignment, ...ids].sort());
  });
});
