import type { Run } from "@jadwigo/contracts/run";
import { RunEvent } from "@jadwigo/contracts/run";
import { type ChatItem, foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import type { Turn } from "./conversation.ts";
import { changedOf, changedSteps, undoOf } from "./revisions.ts";

/** The happy turn's 2 lesson files, revision 1 and revision 2. */
function revisions(): unknown[] {
  const log = RUN_LOGS.find((l) => l.name === "happy-turn");
  return (log?.events ?? []).flatMap((e) => {
    const event = e as { type: string; payload: { lesson_file?: unknown } };
    return event.type === "lesson_revision" ? [event.payload.lesson_file] : [];
  });
}

function withSay(file: unknown, id: string, say: string): unknown {
  const copy = structuredClone(file) as {
    script: { parts: { steps: { id: string; say?: unknown }[] }[] };
  };
  for (const part of copy.script.parts)
    for (const step of part.steps) if (step.id === id) step.say = { pl: say };
  return copy;
}

describe("changedSteps (dl-z5ja.30)", () => {
  it("highlights nothing for the first lesson the pane draws", () => {
    const [first] = revisions();
    expect([...changedSteps(null, first)]).toEqual([]);
  });

  it("names only the step whose content changed", () => {
    const [, second] = revisions();
    const edited = withSay(second, "s03", "Ile jest grup?");
    expect([...changedSteps(second, edited)]).toEqual(["s03"]);
    expect([...changedSteps(second, structuredClone(second))]).toEqual([]);
  });

  it("names a step the revision adds", () => {
    const [, second] = revisions();
    const added = structuredClone(second) as { script: { parts: { steps: unknown[] }[] } };
    added.script.parts[0]?.steps.push({ id: "s09", say: { pl: "Nowy krok" } });
    expect([...changedSteps(second, added)]).toEqual(["s09"]);
  });
});

describe("changedOf (dl-z5ja.30)", () => {
  /** The happy turn, with its chat ending on the tool line `last` when one is given. */
  function happyTurn(last?: Extract<ChatItem, { kind: "tool" }>): Turn {
    const log = RUN_LOGS.find((l) => l.name === "happy-turn");
    const view = foldRun((log?.events ?? []).map((e) => RunEvent.parse(e)));
    if (last) view.chat.push(last);
    return { run: { id: view.lesson ? "run" : "none" } as unknown as Run, view };
  }

  const edit = (data: unknown): Extract<ChatItem, { kind: "tool" }> => ({
    kind: "tool",
    seq: 99,
    call_id: "call_edit",
    verb: "lesson_edit",
    state: "done",
    error: null,
    view: { kind: "lesson_edit", data: data as never },
  });

  it("takes the last lesson_edit's changed_step_ids from its view", () => {
    expect([...changedOf([happyTurn(edit({ changed_step_ids: ["s05"] }))])]).toEqual(["s05"]);
  });

  it("marks nothing for a no-op edit", () => {
    expect([...changedOf([happyTurn(edit({ changed_step_ids: [] }))])]).toEqual([]);
  });

  it("diffs against previous_lesson when the edit has no readable view, or the draft wrote last", () => {
    // Revisions 1 and 2 of the happy turn hold the same steps.
    expect([...changedOf([happyTurn(edit({ changed: "s05" }))])]).toEqual([]);
    expect([...changedOf([happyTurn()])]).toEqual([]);
    expect([...changedOf([])]).toEqual([]);
  });
});

describe("undoOf (dl-z5ja.30)", () => {
  const happy = (change: (view: ReturnType<typeof foldRun>) => void = () => {}): Turn => {
    const log = RUN_LOGS.find((l) => l.name === "happy-turn");
    const view = foldRun((log?.events ?? []).map((e) => RunEvent.parse(e)));
    change(view);
    return { run: {} as Run, view };
  };

  it("goes back to the revision before the latest, for the steps it changed", () => {
    const turn = happy((view) => {
      view.chat.push({
        kind: "tool",
        seq: 99,
        call_id: "call_edit",
        verb: "lesson_edit",
        state: "done",
        error: null,
        view: { kind: "lesson_edit", data: { changed_step_ids: ["s05"] } },
      });
    });
    expect(undoOf([turn])).toEqual({ revision: 1, question_ids: ["s05"], language: "pl" });
  });

  it("offers nothing when nothing changed or there is no revision before", () => {
    expect(undoOf([happy()])).toBeNull();
    expect(
      undoOf([
        happy((view) => {
          view.previous_lesson = null;
        }),
      ]),
    ).toBeNull();
    expect(undoOf([])).toBeNull();
  });
});
