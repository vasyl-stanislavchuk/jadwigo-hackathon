import type { ReportDigest, ReportNarrative } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { narrativeProblems } from "./narrative.ts";

const DIGEST: ReportDigest = {
  shape: "digest/1",
  counts: { attempts: 2, questions: 5, days_played: 1 },
  skills_moved: [],
  needs_attention: [],
  mistakes: [],
  brief: {
    computed_at: "2026-09-01T09:00:00.000Z",
    entries: [
      { skill_code: "maths.multiplication.row-7", list: "review", goal_ids: [], why: "review_due" },
    ],
    school: "nothing_recorded",
  },
  goals: [],
  standing: [],
  proposals: [],
  asks: [],
};

function narrative(headline: string): ReportNarrative {
  return {
    language: "pl",
    headline,
    direction_now: "Powtarzamy.",
    answers: [
      {
        question: "next_focus",
        answer: "Powtórka.",
        citations: [{ kind: "skill", skill_code: "maths.multiplication.row-7" }],
      },
    ],
    proposals: [],
    asks: [],
    made_by: "test",
  };
}

describe("narrativeProblems", () => {
  it("lets a narrative give the digest's counts and the digits of a skill code it names", () => {
    expect(narrativeProblems(narrative("2 lekcje, 5 pytań, mnożenie przez 7."), DIGEST)).toEqual(
      [],
    );
  });

  it("refuses a number the digest does not give", () => {
    expect(narrativeProblems(narrative("Mnożenie przez 8."), DIGEST)).toEqual([
      "the number 8 is not in the digest",
    ]);
  });

  it("refuses a level name in any of its Polish and English forms", () => {
    for (const headline of [
      "Opanował siódemki.",
      "Liczy biegle.",
      "Jest zaznajomiony z tym.",
      "Podjęto próbę mnożenia.",
      "Mnożenie nie rozpoczęte.",
      "Nierozpoczęte dzielenie.",
      "Mnożenie próbowane raz.",
      "Proficiency in groups.",
      "Not started yet.",
      "Attempted the sevens.",
    ]) {
      expect([headline, narrativeProblems(narrative(headline), DIGEST)]).toEqual([
        headline,
        [expect.stringMatching(/^the text names a level: /)],
      ]);
    }
  });

  it("lets a word that only holds a level name pass, as the cli lane's mirror does", () => {
    expect(narrativeProblems(narrative("Próbujemy dalej, bez pośpiechu."), DIGEST)).toEqual([]);
  });

  it("refuses a citation the digest does not hold", () => {
    const cited = narrative("Dobrze.");
    const problems = narrativeProblems(
      {
        ...cited,
        answers: [
          {
            ...cited.answers[0],
            question: "next_focus",
            answer: "Tak.",
            citations: [{ kind: "skill", skill_code: "maths.other" }],
          },
        ],
      },
      DIGEST,
    );
    expect(problems).toEqual(["the citation skill maths.other is not in the digest"]);
  });
});
