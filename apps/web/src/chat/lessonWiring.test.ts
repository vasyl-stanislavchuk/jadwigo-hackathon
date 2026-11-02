/** The ghost rows' count (dl-z5ja.108.1): how many steps the open turn's lesson_draft is writing. */

import { type Run, RunEvent } from "@jadwigo/contracts/run";
import { foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import type { Turn } from "./conversation.ts";
import { ghostsOf } from "./lessonWiring.ts";

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
