import { RunEvent } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { positionOf, stepIds } from "./lessonFile.ts";
import { type DoneCall, emptyMerge, mergeCall, mergeWords } from "./lines.ts";

/** long-turn's lesson file at a revision, as the engine wrote it. */
function revision(n: number): unknown {
  const log = RUN_LOGS.find((l) => l.name === "long-turn");
  if (log === undefined) throw new Error("no golden log long-turn");
  const found = log.events
    .map((e) => RunEvent.parse(e))
    .find((e) => e.type === "lesson_revision" && e.payload.revision === n);
  if (found?.type !== "lesson_revision") throw new Error(`long-turn has no revision ${n}`);
  return found.payload.lesson_file;
}

/** One lesson_edit that changed `ids` and wrote `wrote` over `before`. */
const edit = (ids: string[], before: unknown, wrote: unknown): DoneCall => ({
  verb: "lesson_edit",
  input: {},
  output: { changed_step_ids: ids },
  before,
  wrote,
  known: new Set(stepIds(before)),
});

describe("an edit line names only the questions it changed (dl-uukj.47.71.44)", () => {
  const before = revision(4);
  const after = revision(5);

  it("lists s05's question number from long-turn's s01 + s05 edit, leaving the narration step out", () => {
    // s01 is the warm-up line, no question, so it has no number (dl-uukj.47.71.32).
    expect(positionOf(after, "s01")).toBeNull();
    const s05 = positionOf(after, "s05");
    expect(s05).not.toBeNull();
    const merge = emptyMerge("lesson_edit");
    mergeCall(merge, edit(["s05", "s01"], before, after));
    const { words } = mergeWords(merge);
    expect(words.copyKey).not.toBe("chat_tool_lesson_edit");
    expect(words.values).toEqual({ list: String(s05) });
  });

  it("falls back to the verb's plain words only when no question was touched", () => {
    const merge = emptyMerge("lesson_edit");
    mergeCall(merge, edit(["s01"], before, after));
    expect(mergeWords(merge).words).toEqual({ copyKey: "chat_tool_lesson_edit", values: {} });
  });
});
