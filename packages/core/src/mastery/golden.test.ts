import { PodId, type Skill } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { warsawDate } from "./days.ts";
import { event, GOLDEN, row } from "./golden.ts";
import { foldLearner, masteryOf } from "./index.ts";

const NOW = new Date("2026-11-01T00:00:00.000Z");

describe("masteryOf, the golden cases", () => {
  for (const c of GOLDEN) {
    it(c.name, () => {
      const got = masteryOf(c.answers.map(event), c.kind, NOW);
      expect({ level: got.level, needs_attention: got.needs_attention, tries: got.tries }).toEqual({
        level: c.level,
        needs_attention: c.needs_attention,
        tries: c.tries,
      });
    });
  }
});

describe("the Warsaw day", () => {
  it("is Warsaw's calendar date, not UTC's", () => {
    expect(warsawDate("2026-10-30T22:30:00.000Z")).toBe("2026-10-30");
    expect(warsawDate("2026-10-30T23:30:00.000Z")).toBe("2026-10-31");
    expect(warsawDate("2026-07-01T22:30:00.000Z")).toBe("2026-07-02");
  });
});

describe("the FSRS card", () => {
  it("is null with no review, and a skip is no review", () => {
    const got = masteryOf(
      [event({ attempt: 1, at: "2026-10-26T09:00:00.000Z", correct: null, skip: true })],
      "accuracy",
      NOW,
    );
    expect(got).toEqual({
      level: "not_started",
      needs_attention: false,
      tries: 0,
      last_answered_at: "2026-10-26T09:00:00.000Z",
      due_at: null,
      card: null,
    });
  });

  it("after one clean is learning step 1, due in 10 minutes, under py-fsrs's names", () => {
    const got = masteryOf(
      [event({ attempt: 1, at: "2026-10-26T09:00:00.000Z", correct: true })],
      "accuracy",
      NOW,
    );
    expect(got.card).toEqual({
      state: 1,
      step: 1,
      stability: 2.3065,
      difficulty: 2.11810397,
      due: "2026-10-26T09:10:00.000Z",
      last_review: "2026-10-26T09:00:00.000Z",
    });
    expect(got.due_at).toBe(got.card?.due);
  });

  it("reviews once per attempt, at its last answer, rated by its worst event", () => {
    const got = masteryOf(
      [
        event({ attempt: 1, at: "2026-10-26T09:00:00.000Z", correct: true }),
        event({ attempt: 1, seq: 2, at: "2026-10-26T09:01:00.000Z", correct: false }),
        event({ attempt: 2, at: "2026-10-27T09:00:00.000Z", correct: true }),
        event({ attempt: 3, at: "2026-10-29T09:00:00.000Z", correct: true, help: 1 }),
      ],
      "accuracy",
      NOW,
    );
    expect(got).toEqual({
      level: "familiar",
      needs_attention: false,
      tries: 4,
      last_answered_at: "2026-10-29T09:00:00.000Z",
      due_at: "2026-10-29T09:06:00.000Z",
      card: {
        state: 1,
        step: 1,
        stability: 4.52234725,
        difficulty: 7.59678469,
        due: "2026-10-29T09:06:00.000Z",
        last_review: "2026-10-29T09:00:00.000Z",
      },
    });
  });
});

const POD = PodId.parse("pod_6et2fhbnwvb45aw9atcfzs33za");
function skill(code: string, kind: Skill["kind"], aliases: string[] = []): Skill {
  return {
    pod_id: POD,
    code,
    topic_id: null,
    kind,
    status: "reviewed",
    can_do: null,
    aliases,
    prerequisites: [],
    source: "bank",
    created_at: "2026-10-30T08:00:00.000Z",
  };
}

describe("foldLearner", () => {
  const skills = [
    skill("maths.multiplication.row-7", "accuracy", ["maths.mul.7x"]),
    skill("maths.multiplication.row-8", "speed"),
  ];

  it("folds an alias into its canonical code, and counts one answer carrying both once", () => {
    const got = foldLearner(
      [
        row({ attempt: 1, at: "2026-10-26T09:00:00.000Z", correct: true, skill: "maths.mul.7x" }),
        row({ attempt: 1, at: "2026-10-26T09:00:00.000Z", correct: true }),
        row({ attempt: 2, at: "2026-10-27T09:00:00.000Z", correct: true, skill: "maths.mul.7x" }),
      ],
      skills,
      NOW,
    );
    expect(got.map((m) => [m.skill_code, m.level, m.tries])).toEqual([
      ["maths.multiplication.row-7", "proficient", 2],
    ]);
  });

  it("counts the brain-path alias curriculum.math.multiplication.row-7 for maths.multiplication.row-7", () => {
    const aliased = [
      skill("maths.multiplication.row-7", "accuracy", ["curriculum.math.multiplication.row-7"]),
    ];
    const got = foldLearner(
      [
        row({
          attempt: 1,
          at: "2026-11-04T09:00:00.000Z",
          correct: true,
          skill: "curriculum.math.multiplication.row-7",
        }),
        row({ attempt: 2, at: "2026-11-05T09:00:00.000Z", correct: true }),
      ],
      aliased,
      NOW,
    );
    expect(got.map((m) => [m.skill_code, m.level])).toEqual([
      ["maths.multiplication.row-7", "proficient"],
    ]);
  });

  it("calls an attempt mixed when it holds 2 canonical codes, or is a review lesson", () => {
    const base = [
      row({ attempt: 1, at: "2026-10-26T09:00:00.000Z", correct: true }),
      row({ attempt: 2, at: "2026-10-27T09:00:00.000Z", correct: true }),
    ];
    const plain = row({ attempt: 3, at: "2026-10-29T09:00:00.000Z", correct: true });
    const levelOf = (rows: ReturnType<typeof row>[]) =>
      foldLearner(rows, skills, NOW).find((m) => m.skill_code === "maths.multiplication.row-7")
        ?.level;
    expect(levelOf([...base, plain])).toBe("proficient");
    expect(levelOf([...base, { ...plain, lesson_kind: "review" }])).toBe("mastered");
    expect(
      levelOf([
        ...base,
        plain,
        row({
          attempt: 3,
          seq: 2,
          at: "2026-10-29T09:01:00.000Z",
          correct: true,
          skill: "maths.mul.7x",
        }),
      ]),
    ).toBe("proficient");
    expect(
      levelOf([
        ...base,
        plain,
        row({
          attempt: 3,
          seq: 2,
          at: "2026-10-29T09:01:00.000Z",
          correct: true,
          skill: "maths.multiplication.row-8",
        }),
      ]),
    ).toBe("mastered");
  });

  it("keeps an unknown code under its own string, as an accuracy skill, sorted by code", () => {
    const got = foldLearner(
      [
        row({ attempt: 1, at: "2026-10-26T09:00:00.000Z", correct: true, skill: "x.unknown" }),
        row({
          attempt: 1,
          seq: 2,
          at: "2026-10-26T09:00:00.000Z",
          correct: false,
          skill: "maths.multiplication.row-8",
        }),
      ],
      skills,
      NOW,
    );
    expect(got.map((m) => [m.skill_code, m.level, m.needs_attention])).toEqual([
      ["maths.multiplication.row-8", "attempted", true],
      ["x.unknown", "familiar", false],
    ]);
  });
});
