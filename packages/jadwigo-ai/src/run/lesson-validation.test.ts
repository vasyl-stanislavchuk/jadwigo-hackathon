import { EventId } from "@jadwigo/contracts";
import type { RunEvent } from "@jadwigo/contracts/run";
import { FIXED_NOW } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { contextFor, runId } from "../testing/context.ts";
import { createVerbs, fixtureBank } from "../verbs/index.ts";
import { lessonValidationIssue } from "./lesson-validation.ts";

const run = runId();
const base = (seq: number) => ({
  run_id: run,
  seq,
  event_id: EventId.parse(crypto.randomUUID()),
  created_at: FIXED_NOW.toISOString(),
});
function revision(seq: number, call_id = "edit"): RunEvent {
  return {
    ...base(seq),
    type: "lesson_revision",
    payload: { revision: seq, call_id, lesson_file: { script: { parts: [] } } },
  };
}
function checked(seq: number, ok = true, call_id = "check"): RunEvent {
  return {
    ...base(seq),
    type: "tool_result",
    payload: { call_id, verb: "lesson_check", error: null, output: { ok, publishable: ok } },
  };
}

describe("current lesson validation", () => {
  it("requires a check after a draft or edit", () => {
    expect(lessonValidationIssue([revision(1)])).not.toBeNull();
    expect(lessonValidationIssue([revision(1), checked(2), revision(3)])).not.toBeNull();
  });
  it("accepts a check of the current revision including the check's own revision", () => {
    expect(lessonValidationIssue([revision(1), checked(2)])).toBeNull();
    expect(
      lessonValidationIssue([revision(1), checked(2, true, "same"), revision(3, "same")]),
    ).toBeNull();
  });
  it("refuses failure and a newer failed check after a passing one", () => {
    expect(lessonValidationIssue([revision(1), checked(2, false)])).not.toBeNull();
    expect(lessonValidationIssue([revision(1), checked(2), checked(3, false)])).not.toBeNull();
    const failed: RunEvent = {
      ...base(3),
      type: "tool_result",
      payload: {
        call_id: "bad",
        verb: "lesson_check",
        output: null,
        error: { type: "copied-rung", message: "Use lesson_edit" },
      },
    };
    expect(lessonValidationIssue([revision(1), checked(2), failed])).not.toBeNull();
  });
  it("does not impose lesson validation on a conversation with no lesson", () => {
    expect(lessonValidationIssue([])).toBeNull();
  });
  it("freshly reviews the actual current file in legacy engine flows, never an old approval", async () => {
    const draft = await createVerbs({ bank: fixtureBank() }).lesson_draft.run(
      contextFor(run, "draft"),
      {
        request: "a short lesson",
        grade: "1",
        names: [],
        topic: "addition",
      },
    );
    if (draft.lesson_file === undefined) throw new Error("expected a draft");
    const valid: RunEvent = {
      ...base(1),
      type: "lesson_revision",
      payload: { revision: 1, call_id: "draft", lesson_file: draft.lesson_file },
    };
    expect(lessonValidationIssue([valid], true)).toBeNull();
    const invalid: RunEvent = {
      ...base(3),
      type: "lesson_revision",
      payload: { revision: 2, call_id: "edit", lesson_file: { ...draft.lesson_file, language: 7 } },
    };
    expect(lessonValidationIssue([valid, checked(2), invalid], true)).not.toBeNull();
  });
});
