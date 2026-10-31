import { Uuid } from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { describe, expect, it } from "vitest";
import { finishedAttempt } from "./attempt.ts";

const ROW_7 = "maths.multiplication.row-7";
const ROW_8 = "maths.multiplication.row-8";

/** A signed-in parent's pod with one made-up learner. */
async function family(store: InMemoryStore) {
  const { pod, account } = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  const { learner } = await store.addLearner(pod, { first_name: "Kasztan" });
  return { pod, account, learner: learner.id };
}

describe("finishedAttempt", () => {
  it("plays a finished real attempt whose answers land as the learner's evidence, at the instants given", async () => {
    const store = new InMemoryStore();
    const f = await family(store);

    // 22:30 UTC on 1 September is 00:30 on 2 September in Warsaw: 2 Warsaw days, 1 UTC day apart.
    const day1 = await finishedAttempt({
      store,
      pod: f.pod,
      learner: f.learner,
      questions: [
        { skills: [ROW_7], correct: true, answered_at: "2026-09-01T07:00:00.000Z" },
        { skills: [ROW_7], correct: true, answered_at: "2026-09-01T07:01:00.000Z" },
      ],
    });
    const day2 = await finishedAttempt({
      store,
      pod: f.pod,
      learner: f.learner,
      questions: [
        { skills: [ROW_7], correct: true, answered_at: "2026-09-01T22:30:00.000Z" },
        { skills: [ROW_8], correct: false, help_used: 2, answered_at: "2026-09-01T22:31:00.000Z" },
      ],
    });

    expect(day1.record.attempt).toMatchObject({
      status: "finished",
      learner_id: f.learner,
      mode: "real",
    });
    expect(day2.record.questions.map((q) => [q.seq, q.ended, q.help_released])).toEqual([
      [1, "correct", 0],
      [2, "skipped", 2],
    ]);

    const evidence = await store.getLearnerEvidence(f.pod, f.learner);
    expect(
      evidence.map((e) => [
        e.attempt_id,
        e.seq,
        e.try_no,
        e.kind,
        e.skill_code,
        e.correct,
        e.help_used,
        e.answered_at,
      ]),
    ).toEqual([
      [day1.record.attempt.id, 1, 1, "try", ROW_7, true, 0, "2026-09-01T07:00:00.000Z"],
      [day1.record.attempt.id, 2, 1, "try", ROW_7, true, 0, "2026-09-01T07:01:00.000Z"],
      [day2.record.attempt.id, 1, 1, "try", ROW_7, true, 0, "2026-09-01T22:30:00.000Z"],
      [day2.record.attempt.id, 2, 1, "try", ROW_8, false, 2, "2026-09-01T22:31:00.000Z"],
      [day2.record.attempt.id, 2, 2, "skip", ROW_8, null, 2, "2026-09-01T22:31:01.000Z"],
    ]);
  });

  it("ends a miss `missed` after its one try when the assignment holds verdicts", async () => {
    const store = new InMemoryStore();
    const f = await family(store);

    const held = await finishedAttempt({
      store,
      pod: f.pod,
      learner: f.learner,
      hold_verdicts: true,
      questions: [{ skills: [ROW_8], correct: false, answered_at: "2026-09-01T07:00:00.000Z" }],
    });

    expect(held.assignment.hold_verdicts).toBe(true);
    expect(held.record.questions.map((q) => q.ended)).toEqual(["missed"]);
    expect(held.record.answers.map((a) => [a.try_no, a.kind, a.correct])).toEqual([
      [1, "try", false],
    ]);
  });

  it("plays anonymously without a learner, and a claim brings the answers into the learner's evidence", async () => {
    const store = new InMemoryStore();
    const played = await family(store);
    const claimer = await family(store);

    const anonymous = await finishedAttempt({
      store,
      pod: played.pod,
      questions: [
        { skills: [ROW_7, ROW_8], correct: true, answered_at: "2026-09-01T07:00:00.000Z" },
      ],
    });
    expect(anonymous.assignment.identity).toBe("none");
    expect(anonymous.record.attempt.learner_id).toBeNull();
    expect(await store.getLearnerEvidence(claimer.pod, claimer.learner)).toEqual([]);

    await store.claimAttempt(claimer.pod, {
      attempt: anonymous.record.attempt.id,
      learner: claimer.learner,
      account: claimer.account,
    });

    const evidence = await store.getLearnerEvidence(claimer.pod, claimer.learner);
    expect(evidence.map((e) => [e.skill_code, e.correct])).toEqual([
      [ROW_7, true],
      [ROW_8, true],
    ]);
  });

  it("refuses help past the third rung, which only the twin skip may release", async () => {
    const store = new InMemoryStore();
    const f = await family(store);

    await expect(
      finishedAttempt({
        store,
        pod: f.pod,
        learner: f.learner,
        questions: [
          { skills: [ROW_7], correct: true, help_used: 4, answered_at: "2026-09-01T07:00:00.000Z" },
        ],
      }),
    ).rejects.toThrow(/help_used is 0 to 3/);
  });
});
