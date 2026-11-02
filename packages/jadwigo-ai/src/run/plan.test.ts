/** The workflow's plan, pure (dl-hin8.19): when a turn starts one, its words, and how a stage moves. */

import type { RunEvent } from "@jadwigo/contracts/run";
import { describe, expect, it } from "vitest";
import { movePlan, settlePlan, startPlan, startsPlan } from "./plan.ts";

const toolCall = { type: "tool_call" } as unknown as RunEvent;
const planned = {
  type: "plan",
  payload: { entries: [{ text: "x", status: "pending" }] },
} as unknown as RunEvent;

describe("the plan (dl-hin8.19)", () => {
  it("starts only on a lesson-building turn's first tool calls, in the run's language", () => {
    expect(startPlan([], "question_search", "en")?.map((e) => e.text)).toEqual([
      "Finding questions in the bank",
      "Drafting the lesson",
      "Checking the lesson",
    ]);
    expect(startPlan([], "lesson_draft", "pl")?.every((e) => e.status === "pending")).toBe(true);
    expect(startPlan([], "lesson_edit", "pl")).toBeNull();
    expect(startPlan([], "learner_week", "pl")).toBeNull();
    expect(startPlan([], undefined, "pl")).toBeNull();
    // Not the turn's first tool calls, or a plan already there.
    expect(startPlan([toolCall], "question_search", "pl")).toBeNull();
    expect(startPlan([planned], "question_search", "pl")).toBeNull();
  });

  it("moves one stage, and answers null when nothing changes", () => {
    const plan = startPlan([], "question_search", "pl");
    const searching = movePlan(plan, "question_search", "in_progress");
    expect(searching?.map((e) => e.status)).toEqual(["in_progress", "pending", "pending"]);
    expect(movePlan(searching, "question_search", "in_progress")).toBeNull();
    expect(movePlan(searching, "lesson_edit", "done")).toBeNull();
    expect(movePlan(null, "lesson_draft", "done")).toBeNull();
    // The plan given is never changed in place.
    expect(plan?.map((e) => e.status)).toEqual(["pending", "pending", "pending"]);
  });

  it("never takes a done stage back, and settles a plan with nothing left under way or waiting", () => {
    const done = movePlan(startPlan([], "question_search", "pl"), "question_search", "done");
    expect(movePlan(done, "question_search", "in_progress")).toBeNull();
    expect(settlePlan(movePlan(done, "lesson_draft", "in_progress"))?.map((e) => e.status)).toEqual(
      ["done", "failed", "failed"],
    );
    expect(settlePlan(null)).toBeNull();
    expect(settlePlan([{ text: "x", status: "done" }])).toBeNull();
    expect(startsPlan("lesson_draft")).toBe(true);
    expect(startsPlan("lesson_edit")).toBe(false);
  });
});
