import { describe, expect, it } from "vitest";
import { idOf } from "./ids.ts";
import { AttemptResult } from "./records.ts";
import {
  AttemptAnswerRequest,
  PageAttemptResult,
  pageAttemptResult,
  pageEnded,
  SentAt,
  verdictsHeld,
} from "./wire.ts";

const TRY = {
  event_id: "0190f3c4-5b6a-4c8d-9e0f-112233445566",
  seq: 1,
  try_no: 1,
  latency_ms: 1000,
  asked_at: "2026-09-01T08:00:00.000Z",
  answered_at: "2026-09-01T08:00:01.000Z",
  kind: "try",
  value: { entered: "6" },
};

const ROW = AttemptResult.parse({
  pod_id: idOf("pod_", "00000000-0000-4000-8000-00000000000a"),
  attempt_id: idOf("att_", "00000000-0000-4000-8000-0000000006a1"),
  seq: 1,
  lesson_question_id: idOf("lq_", "00000000-0000-4000-8000-0000000003a1"),
  added: "planned",
  placed: null,
  added_for: null,
  say: "How many apples?",
  family: "enter",
  question_type: "production",
  tries: 2,
  first_try_correct: false,
  correct: true,
  mistake_classes: ["value_off"],
  help_used: 1,
  skip_reason: null,
  time_ms: 4000,
  ended: "correct",
});

describe("the answer request's times", () => {
  it("takes a time with its offset, so a device on local time is not refused", () => {
    const local = {
      ...TRY,
      asked_at: "2026-09-01T10:00:00+02:00",
      answered_at: "2026-09-01T10:00:01+02:00",
    };
    expect(AttemptAnswerRequest.safeParse(local).success).toBe(true);
  });

  it("refuses a time finer than a millisecond, so both stores compare the same instants", () => {
    const fine = { ...TRY, asked_at: "2026-09-01T08:00:00.0005Z" };
    expect(AttemptAnswerRequest.safeParse(fine).success).toBe(false);
  });

  it("refuses a time outside the years 1 to 9999 in UTC", () => {
    for (const at of ["0000-01-01T00:00:00+14:00", "9999-12-31T23:59:59-12:00"]) {
      expect(SentAt.safeParse(at).success, at).toBe(false);
    }
    expect(SentAt.safeParse("9999-12-31T23:59:59Z").success).toBe(true);
  });

  it("refuses an answer given before its question was asked", () => {
    const early = { ...TRY, answered_at: "2026-09-01T07:59:59.000Z" };
    expect(AttemptAnswerRequest.safeParse(early).success).toBe(false);
  });
});

describe("held verdicts", () => {
  it("are held while the assignment holds them and the attempt is not finished", () => {
    expect(verdictsHeld({ hold_verdicts: true }, { status: "in_progress" })).toBe(true);
    expect(verdictsHeld({ hold_verdicts: true }, { status: "paused" })).toBe(true);
    expect(verdictsHeld({ hold_verdicts: true }, { status: "finished" })).toBe(false);
    expect(verdictsHeld({ hold_verdicts: false }, { status: "in_progress" })).toBe(false);
  });

  it("show an ended question as done, and an open one as open", () => {
    expect(pageEnded("correct", true)).toBe("done");
    expect(pageEnded("skipped", true)).toBe("done");
    expect(pageEnded("missed", true)).toBe("done");
    expect(pageEnded("missed", false)).toBe("missed");
    expect(pageEnded("correct", false)).toBe("correct");
    expect(pageEnded(null, true)).toBeNull();
  });
});

describe("the child's after-lesson list", () => {
  it("carries what was asked, how it ended and the help used: no score, no timer", () => {
    const row = pageAttemptResult(ROW, false);
    expect(PageAttemptResult.strict().parse(row)).toEqual({
      seq: 1,
      lesson_question_id: ROW.lesson_question_id,
      say: "How many apples?",
      added: "planned",
      ended: "correct",
      help_used: 1,
    });
    for (const field of ["tries", "first_try_correct", "correct", "mistake_classes", "time_ms"]) {
      expect(row, field).not.toHaveProperty(field);
    }
  });

  it("shows done while verdicts are held", () => {
    expect(pageAttemptResult(ROW, true).ended).toBe("done");
  });
});
