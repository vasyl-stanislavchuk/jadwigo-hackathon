import { RunEvent } from "@jadwigo/contracts/run";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { foldRun } from "./index.ts";

/** Each `[type, payload]` as one event of run 1, numbered 1..n. */
function logOf(events: readonly (readonly [string, Record<string, unknown>])[]): RunEvent[] {
  return events.map(([type, payload], i) =>
    RunEvent.parse({
      run_id: "run_00000000000000000000000001",
      seq: i + 1,
      event_id: `00000000-0000-4000-8fff-${(i + 1).toString(16).padStart(12, "0")}`,
      created_at: "2026-09-01T08:00:01.000Z",
      type,
      payload,
    }),
  );
}

const call = (id: string, input: Record<string, unknown>) =>
  ["tool_call", { call_id: id, verb: "lesson_draft", input }] as const;
const result = (id: string, output: Record<string, unknown> | null) =>
  [
    "tool_result",
    {
      call_id: id,
      verb: "lesson_draft",
      output,
      error: output === null ? { type: "verb_failed", message: "It failed." } : null,
    },
  ] as const;
const revision = (n: number, title: string) =>
  ["lesson_revision", { revision: n, call_id: "call_1", lesson_file: { title } }] as const;

describe("the tool line's input and output (dl-z5ja.68)", () => {
  it("carries the call's input, then its result's output", () => {
    const input = { request: "equal groups", grade: "2" };
    const running = foldRun(logOf([call("call_1", input)])).chat[0];
    expect(running).toMatchObject({ kind: "tool", state: "running", input });
    expect(running).not.toHaveProperty("output");
    const done = foldRun(logOf([call("call_1", input), result("call_1", { draft_id: "drf_1" })]))
      .chat[0];
    expect(done).toMatchObject({ state: "done", input, output: { draft_id: "drf_1" } });
  });

  it("carries a failed call's output as null", () => {
    const [line] = foldRun(logOf([call("call_1", {}), result("call_1", null)])).chat;
    expect(line).toMatchObject({ state: "failed", output: null });
  });

  it("has no input on a line only an approval opened, and keeps the first call's input", () => {
    const ask = [
      "approval_request",
      { call_id: "call_1", verb: "lesson_draft", summary: "Draft it." },
    ] as const;
    const [pending] = foldRun(logOf([ask])).chat;
    expect(pending).toMatchObject({ kind: "tool", state: "pending" });
    expect(pending).not.toHaveProperty("input");
    const [twice] = foldRun(logOf([call("call_1", { n: 1 }), call("call_1", { n: 2 })])).chat;
    expect(twice).toMatchObject({ input: { n: 1 } });
  });
});

describe("previous_lesson, the one-step undo (dl-z5ja.68)", () => {
  it("is null with no revision or one", () => {
    expect(foldRun([]).previous_lesson).toBeNull();
    expect(foldRun(logOf([revision(1, "One")])).previous_lesson).toBeNull();
  });

  it("is the revision just below the highest, whatever order they were logged in", () => {
    const view = foldRun(logOf([revision(1, "One"), revision(3, "Three"), revision(2, "Two")]));
    expect(view.lesson).toEqual({ revision: 3, lesson_file: { title: "Three" } });
    expect(view.previous_lesson).toEqual({ revision: 2, lesson_file: { title: "Two" } });
  });

  it("keeps the first file of a revision logged twice, as lesson does", () => {
    const view = foldRun(logOf([revision(1, "One"), revision(2, "Two"), revision(2, "Again")]));
    expect(view.lesson?.lesson_file).toEqual({ title: "Two" });
    expect(view.previous_lesson?.lesson_file).toEqual({ title: "One" });
  });

  it("is always the 2nd highest distinct revision", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 1, max: 9 }), { maxLength: 8 }), (numbers) => {
        const view = foldRun(logOf(numbers.map((n) => revision(n, `r${n}`))));
        const distinct = [...new Set(numbers)].sort((a, b) => b - a);
        expect(view.lesson?.revision ?? null).toBe(distinct[0] ?? null);
        expect(view.previous_lesson?.revision ?? null).toBe(distinct[1] ?? null);
      }),
    );
  });
});
