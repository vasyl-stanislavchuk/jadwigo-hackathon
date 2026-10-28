// The judges agree with the playground: every case of the golden corpus, synced from the
// playground's family golden test (packages/testing/src/golden/PROVENANCE.md),
// gets the verdict and mistake class the playground's judges gave it. Each question parses as the
// contracts' FamilyQuestion first, so the corpus also holds the contracts to the playground's shapes.
import { FamilyQuestion, QuestionType, valueFor } from "@jadwigo/contracts";
import { GOLDEN_CASES } from "@jadwigo/testing";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { judge } from "./judge.ts";
import type { Question } from "./question.ts";

const parsed = new Map<string, Question>();
function questionOf(c: (typeof GOLDEN_CASES)[number]): Question {
  const known = parsed.get(c.question_id);
  if (known !== undefined) return known;
  const q = {
    ...FamilyQuestion.parse(c.question),
    question_type: QuestionType.parse(c.question.question_type),
  };
  parsed.set(c.question_id, q);
  return q;
}

/** The adapter's stand-in for a value the page cannot commit. */
const isInvalid = (value: unknown): boolean =>
  typeof value === "object" && value !== null && Object.keys(value).join() === "invalid";

const committed = GOLDEN_CASES.filter((c) => !isInvalid(c.value));
const refused = GOLDEN_CASES.filter((c) => isInvalid(c.value));

describe("the golden corpus", () => {
  it("is the synced size, every question a contracts FamilyQuestion", () => {
    expect(GOLDEN_CASES).toHaveLength(1233);
    expect(new Set(GOLDEN_CASES.map((c) => c.question_id)).size).toBe(66);
    for (const c of GOLDEN_CASES) expect(questionOf(c).family).toBe(c.question.family);
  });

  it.each(committed.map((c) => [c.question_id, JSON.stringify(c.value), c] as const))(
    "%s %s",
    (_, __, c) => {
      const q = questionOf(c);
      expect(valueFor(q.family).safeParse(c.value).success).toBe(true);
      const v = judge(q, c.value);
      expect({ correct: v.correct, mistake_class: v.mistake_class }).toEqual({
        correct: c.correct,
        mistake_class: c.mistake_class,
      });
    },
  );

  it("refuses at the wire every value the page cannot commit, and a judge handed one calls it other_wrong", () => {
    expect(refused).toHaveLength(271);
    for (const c of refused) {
      const q = questionOf(c);
      expect(valueFor(q.family).safeParse(c.value).success).toBe(false);
      expect(judge(q, c.value)).toMatchObject({ correct: false, mistake_class: "other_wrong" });
    }
  });
});

describe("every verdict", () => {
  const questions = [...new Set(GOLDEN_CASES.map((c) => c.question_id))].map((id) => {
    const c = GOLDEN_CASES.find((x) => x.question_id === id);
    if (c === undefined) throw new Error(id);
    return questionOf(c);
  });

  it("never throws on any value, and is correct only with no class and no missed part", () => {
    fc.assert(
      fc.property(fc.constantFrom(...questions), fc.jsonValue(), (q, value) => {
        const v = judge(q, value);
        if (v.correct) {
          expect(v.mistake_class).toBeNull();
          expect(v.parts.every((p) => p.correct)).toBe(true);
        } else {
          expect(v.mistake_class).not.toBeNull();
        }
      }),
    );
  });
});
