// Every written example is a question the v0 data model holds (packages/contracts), in both
// languages, and carries every state the playground shows: a correct and a missed scenario, each
// with its marks, and values in its family's shape.
import {
  FamilyQuestion,
  Help,
  PartMark,
  QUESTION_TYPE_FAMILY,
  QuestionType,
  valueFor,
} from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { EXAMPLES, examplesFor } from "./index.ts";
import { LANGUAGES, resolve } from "./localize.ts";
import type { WrittenQuestion } from "./types.ts";

function parses(question: WrittenQuestion, language: "pl" | "en"): string[] {
  const q = resolve<WrittenQuestion>(question, language);
  const problems: string[] = [];
  if (QUESTION_TYPE_FAMILY[q.question_type] !== q.family) problems.push("family");
  if (typeof q.say !== "string") problems.push("say");
  const parsed = FamilyQuestion.safeParse({ family: q.family, data: q.data, key: q.key });
  if (!parsed.success) problems.push(...parsed.error.issues.map((i) => i.path.join(".")));
  const help = Help.safeParse(q.help ?? {});
  if (!help.success) problems.push(...help.error.issues.map((i) => `help.${i.path.join(".")}`));
  return problems;
}

describe("written examples", () => {
  it("give every question type 1 or 2 examples", () => {
    for (const type of QuestionType.options) {
      expect(examplesFor(type).length, type).toBeGreaterThanOrEqual(1);
      expect(examplesFor(type).length, type).toBeLessThanOrEqual(2);
    }
  });

  it("have ids unique within their question type", () => {
    const ids = EXAMPLES.map((e) => `${e.question.question_type}/${e.id}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const example of EXAMPLES) {
    const name = `${example.question.question_type}/${example.id}`;
    describe(name, () => {
      it.each(LANGUAGES)("is a question the contracts hold, in %s", (language) => {
        expect(parses(example.question, language)).toEqual([]);
        if (example.twin) expect(parses(example.twin, language)).toEqual([]);
      });

      it("shows a correct and a missed scenario", () => {
        const outcomes = new Set(example.scenarios.map((s) => s.outcome));
        expect([...outcomes].sort()).toEqual(["correct", "incorrect"]);
      });

      it.each(LANGUAGES)(
        "carries values in its family's shape and marks the page may see, in %s",
        (language) => {
          for (const scenario of example.scenarios) {
            if (scenario.only && !scenario.only.includes(language)) continue;
            const value = resolve(scenario.value, language);
            expect(valueFor(example.question.family).safeParse(value).success).toBe(true);
            for (const mark of scenario.marks) expect(PartMark.strict().parse(mark)).toEqual(mark);
            if (scenario.outcome === "correct") expect(scenario.mistake_class).toBeNull();
          }
        },
      );
    });
  }
});
