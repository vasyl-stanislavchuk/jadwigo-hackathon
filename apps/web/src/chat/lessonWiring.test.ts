/** The ghost rows' count (dl-z5ja.108.1): how many steps the open turn's lesson_draft is writing. */

import { type Run, RunEvent } from "@jadwigo/contracts/run";
import { foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import type { Turn } from "./conversation.ts";
import { ghostsOf, readyOf } from "./lessonWiring.ts";

const eventsOf = (name: string): RunEvent[] =>
  (RUN_LOGS.find((l) => l.name === name)?.events ?? []).map((e) => RunEvent.parse(e));

/** happy-turn's log up to `seq`, as the page's one turn, with lesson_draft's input changed by `input`. */
function turnAt(seq: number, input: Record<string, unknown> = {}): Turn[] {
  const events = eventsOf("happy-turn")
    .filter((e) => e.seq <= seq)
    .map((e) =>
      e.type === "tool_call" && e.payload.verb === "lesson_draft"
        ? RunEvent.parse({
            ...e,
            payload: { ...e.payload, input: { ...e.payload.input, ...input } },
          })
        : e,
    );
  return [{ run: { id: events[0]?.run_id } as unknown as Run, view: foldRun(events) }];
}

describe("ghostsOf (dl-z5ja.108.1)", () => {
  it("says the count lesson_draft was asked for while it runs", () => {
    expect(ghostsOf(turnAt(5, { count: 6 }))).toBe(6);
  });

  it("says 1 while lesson_draft runs with no count: a lesson is coming, its size unknown", () => {
    expect(ghostsOf(turnAt(5))).toBe(1);
  });

  it("says none once lesson_draft is done, once the turn is over, and before any turn", () => {
    expect(ghostsOf(turnAt(6, { count: 6 }))).toBe(0);
    expect(ghostsOf(turnAt(17, { count: 6 }))).toBe(0);
    expect(ghostsOf(turnAt(4))).toBe(0);
    expect(ghostsOf([])).toBe(0);
  });
});

/** happy-turn whole, its lesson_check answering `publishable` as its view, as the engine writes it. */
function checked(publishable: boolean, extra: RunEvent[] = [], writer?: string): Turn[] {
  const events = eventsOf("happy-turn").map((e) =>
    e.type === "tool_result" && e.payload.verb === "lesson_check"
      ? RunEvent.parse({
          ...e,
          payload: {
            ...e.payload,
            view: { kind: "lesson_check", data: { publishable, findings: [] } },
          },
        })
      : e,
  );
  const all = [...events, ...extra];
  return [
    {
      run: { id: all[0]?.run_id } as unknown as Run,
      view: foldRun(all),
      ...(writer === undefined ? {} : { writer }),
    },
  ];
}

describe("readyOf (dl-z5ja.108.1.1)", () => {
  it("is ready once the latest check says publishable and nothing wrote the lesson after it", () => {
    expect(readyOf(checked(true, [], "call_2"))).toBe(true);
    expect(readyOf(checked(true))).toBe(true);
  });

  it("is not ready when the check found it not publishable, or before any check", () => {
    expect(readyOf(checked(false))).toBe(false);
    expect(readyOf(turnAt(7))).toBe(false);
    expect(readyOf([])).toBe(false);
  });

  it("is not ready once the parent's own patch wrote the lesson after the check", () => {
    expect(readyOf(checked(true, [], "00000000-0000-4000-8000-000000000999"))).toBe(false);
  });

  it("is not ready once the AI edited the lesson after the check", () => {
    const first = eventsOf("happy-turn")[0];
    const edit = (seq: number, type: string, payload: unknown) =>
      RunEvent.parse({
        ...first,
        seq,
        event_id: `00000000-0000-4000-8000-0000000001${seq}`,
        type,
        payload,
      });
    const later = [
      edit(20, "tool_call", { call_id: "call_9", verb: "lesson_edit", input: {} }),
      edit(21, "tool_result", { call_id: "call_9", verb: "lesson_edit", output: {}, error: null }),
    ];
    expect(readyOf(checked(true, later))).toBe(false);
  });
});
