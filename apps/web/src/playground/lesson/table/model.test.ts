import type { Finding } from "@jadwigo/lesson-import/file";
import { LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { lessonFileToSpecs } from "../adapter.ts";
import { readDraft } from "../draft.ts";
import { findingsOf } from "./findings.ts";
import { stepRows } from "./model.ts";

const finding = (step_id: string | null, level: Finding["level"]): Finding => ({
  step_id,
  path: step_id === null ? "title" : `script.parts[2].steps[0].question.help.look`,
  level,
  rule: level === "error" ? "empty-rung" : "long-title",
  text: "what is wrong",
  fix: "what to do",
});

function equalGroups() {
  const read = readDraft(LESSON_FILES.find((f) => (f as { id?: unknown }).id === "equal-groups"));
  if ("error" in read) throw new Error(read.error);
  return lessonFileToSpecs(read.file, "", read.skipped);
}

describe("findingsOf", () => {
  it("reads findings, leaves out what is not one, and maps the old errors", () => {
    const good = finding("s05", "error");
    expect(findingsOf({ ok: false, findings: [good, { step_id: "s02" }, null] })).toEqual([good]);
    expect(findingsOf({ ok: false, errors: [{ step_id: "s02", message: "no key" }] })).toEqual([
      { step_id: "s02", path: "", level: "error", rule: "compile", text: "no key", fix: "" },
    ]);
    expect(findingsOf(null)).toEqual([]);
    expect(findingsOf("half")).toEqual([]);
  });
});

describe("stepRows", () => {
  it("has one row per question step, in order, with its family, key, rungs and tone", () => {
    const rows = stepRows(equalGroups(), [
      finding("s05", "error"),
      finding("s05", "warn"),
      finding("s07", "warn"),
      finding("s02t", "warn"),
      finding(null, "warn"),
    ]);
    expect(rows.map((r) => [r.n, r.step_id, r.family, r.findings, r.tone])).toEqual([
      [1, "s02", "enter", 1, "warn"],
      [2, "s05", "enter", 2, "error"],
      [3, "s06", "sequence", 0, null],
      [4, "s07", "choose", 1, "warn"],
    ]);
    expect(rows[0]).toMatchObject({ key: "10", skipped: null, part: "warm_up" });
    expect(rows[0]?.rungs.of).toBe(5);
    expect(rows[0]?.skills.length).toBeGreaterThan(0);
  });
});
