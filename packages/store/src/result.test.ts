import {
  type AttemptAnswer,
  AttemptId,
  type AttemptQuestion,
  EventId,
  ID_PREFIXES,
  idOf,
  LessonQuestionId,
  PodId,
} from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { attemptResults } from "./result.ts";

const pod = PodId.parse(idOf(ID_PREFIXES.pod, crypto.randomUUID()));
const attempt = AttemptId.parse(idOf(ID_PREFIXES.attempt, crypto.randomUUID()));
const plums = LessonQuestionId.parse(idOf(ID_PREFIXES.lesson_question, crypto.randomUUID()));
const at = "2026-09-01T08:00:00.000Z";

const question: AttemptQuestion = {
  attempt_id: attempt,
  seq: 1,
  pod_id: pod,
  lesson_question_id: plums,
  added: "planned",
  placed: null,
  added_for: null,
  help_released: 2,
  ended: "skipped",
  asked_at: at,
};

function row(try_no: number, more: Partial<AttemptAnswer>): AttemptAnswer {
  return {
    event_id: EventId.parse(crypto.randomUUID()),
    pod_id: pod,
    attempt_id: attempt,
    seq: 1,
    try_no,
    kind: "try",
    value: { entered: "3" },
    skip_reason: null,
    latency_ms: 100,
    help_used: 0,
    asked_at: at,
    answered_at: at,
    correct: false,
    mistake_class: null,
    parts: null,
    judged_by: "enter@1",
    body_hash: `b${try_no}`,
    ...more,
  };
}

const lookup = () =>
  ({ say: "How many plums?", family: "enter", question_type: "production" }) as const;

describe("attemptResults", () => {
  it("orders mistake classes by first try, counts tries not skips, and keeps the latest skip's reason", () => {
    // Given out of order, as rows may come back from a query without one.
    const answers = [
      row(4, { kind: "skip", value: null, correct: null, skip_reason: "help_twin", help_used: 2 }),
      row(2, { mistake_class: "off_by_one", help_used: 1 }),
      row(1, { mistake_class: "value_off" }),
      row(3, { mistake_class: "value_off", help_used: 1 }),
    ];
    const [result] = attemptResults([question], answers, lookup);
    expect(result).toMatchObject({
      tries: 3,
      first_try_correct: false,
      correct: false,
      mistake_classes: ["value_off", "off_by_one"],
      help_used: 2,
      skip_reason: "help_twin",
      time_ms: 400,
    });
  });

  it("reads first_try_correct only from try 1", () => {
    const answers = [row(1, {}), row(2, { correct: true })];
    const [result] = attemptResults([{ ...question, ended: "correct" }], answers, lookup);
    expect(result).toMatchObject({ first_try_correct: false, correct: true, tries: 2 });
  });
});
