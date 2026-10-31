import { ReportDigest } from "@jadwigo/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { attempt, catalogueSkill, goal, row } from "./golden.ts";
import {
  brief,
  DIGEST_RULES_VERSION,
  type DigestInput,
  dreamDigest,
  foldLearner,
} from "./index.ts";
import { sha256Hex } from "./sha256.ts";

const row7 = "maths.multiplication.row-7";
const row8 = "maths.multiplication.row-8";
const SKILLS = [
  catalogueSkill(row7, { aliases: ["curriculum.math.multiplication.row-7"] }),
  catalogueSkill(row8),
];
const GOALS = [goal(1, [row7, row8]), goal(2, [])];
const PERIOD = { starts_at: "2026-10-25T23:00:00.000Z", ends_at: "2026-10-31T12:00:00.000Z" };
const NOW = new Date(PERIOD.ends_at);

/** Proficient on × 7 before the period; inside it, 2 misses drop × 7 twice and × 8 gets to proficient. */
const BEFORE = [
  row({ attempt: 1, at: "2026-10-20T09:00:00.000Z", correct: true, skill: row7 }),
  row({ attempt: 2, at: "2026-10-21T09:00:00.000Z", correct: true, skill: row7 }),
];
const DURING = [
  row({ attempt: 3, seq: 1, at: "2026-10-26T09:00:00.000Z", correct: false, skill: row7 }),
  row({
    attempt: 3,
    seq: 1,
    try_no: 2,
    at: "2026-10-26T09:00:20.000Z",
    correct: true,
    skill: row7,
  }),
  row({ attempt: 3, seq: 2, at: "2026-10-26T09:01:00.000Z", correct: true, skill: row8 }),
  row({ attempt: 4, seq: 1, at: "2026-10-27T09:00:00.000Z", correct: false, skill: row7 }),
  row({ attempt: 5, seq: 1, at: "2026-10-28T09:00:00.000Z", correct: true, skill: row8 }),
];

function inputOf(before: typeof BEFORE, all: typeof BEFORE): DigestInput {
  const mastery_before = foldLearner(before, SKILLS, NOW);
  const mastery_after = foldLearner(all, SKILLS, NOW);
  return {
    evidence_before: before,
    evidence_after: all,
    mastery_before,
    mastery_after,
    brief: brief(GOALS, SKILLS, mastery_after, NOW),
    goals: GOALS,
    period: PERIOD,
    skills: SKILLS,
  };
}

const skill = (skill_code: string) => ({ kind: "skill" as const, skill_code });
const att = (n: number) => ({ kind: "attempt" as const, attempt_id: attempt(n) });

describe("dreamDigest, a fixture period", () => {
  const input = inputOf(BEFORE, [...BEFORE, ...DURING]);
  const { digest, inputs_hash } = dreamDigest(input);

  it("validates against ReportDigest", () => {
    expect(ReportDigest.parse(digest)).toEqual(digest);
  });

  it("counts, moves, flags, groups mistakes, judges the standing questions and proposes", () => {
    const g1 = GOALS[0]?.goal.id;
    const g2 = GOALS[1]?.goal.id;
    expect({ ...digest, brief: undefined }).toEqual({
      shape: "digest/1",
      counts: { attempts: 3, questions: 4, days_played: 3 },
      skills_moved: [
        { skill_code: row7, from: "proficient", to: "attempted", attempt_id: attempt(4) },
        { skill_code: row8, from: "not_started", to: "proficient", attempt_id: attempt(5) },
      ],
      needs_attention: [
        {
          skill_code: row7,
          mistake_classes: ["off_by_one"],
          citations: [skill(row7), att(3), att(4)],
        },
      ],
      mistakes: [
        { mistake_class: "off_by_one", times: 2, skill_codes: [row7], citations: [att(3), att(4)] },
      ],
      brief: undefined,
      goals: [
        { goal_id: g1, status: "needs_attention" },
        { goal_id: g2, status: "not_started" },
      ],
      standing: [
        { question: "skills_standing", verdict: "stuck", citations: [skill(row7)] },
        { question: "next_focus", verdict: "on_track", citations: [skill(row7)] },
      ],
      proposals: [
        { id: "p1", kind: "focus", list: "reteach", skill_codes: [row7], citations: [skill(row7)] },
      ],
      asks: [{ id: "a1", about: "goal_without_skills" }],
    });
    expect(digest.brief).toBe(input.brief);
  });

  it("hashes the rules version, the after mastery, the goals and the catalogue codes, not the period", () => {
    const mastery = [...input.mastery_after]
      .sort((a, b) => (a.skill_code < b.skill_code ? -1 : 1))
      .map((m) => [
        m.skill_code,
        m.level,
        m.needs_attention,
        m.tries,
        m.last_answered_at,
        m.due_at,
      ]);
    const goals = GOALS.map((g) =>
      [g.goal.id, g.goal.status, ...[...g.skill_codes].sort()].join("|"),
    ).sort();
    expect(inputs_hash).toBe(
      sha256Hex(
        JSON.stringify({ rules: DIGEST_RULES_VERSION, mastery, goals, skills: [row7, row8] }),
      ),
    );
    expect(DIGEST_RULES_VERSION).toBe(2);
    const reordered = { ...input, evidence_after: [...input.evidence_after].reverse() };
    expect(dreamDigest(reordered).inputs_hash).toBe(inputs_hash);
    expect(dreamDigest({ ...input, goals: [] }).inputs_hash).not.toBe(inputs_hash);
    expect(
      dreamDigest({ ...input, skills: [...SKILLS, catalogueSkill("maths.x.y")] }).inputs_hash,
    ).not.toBe(inputs_hash);
  });

  it("reuses across periods: no new evidence gives the same hash with an empty period, one more try does not (dl-liwi.35)", () => {
    const all = [...BEFORE, ...DURING];
    const next = { starts_at: PERIOD.ends_at, ends_at: "2026-11-02T12:00:00.000Z" };
    const quiet = dreamDigest({ ...inputOf(all, all), period: next });
    expect(quiet.digest.counts).toEqual({ attempts: 0, questions: 0, days_played: 0 });
    expect(quiet.inputs_hash).toBe(inputs_hash);
    const more = row({ attempt: 6, at: "2026-11-01T09:00:00.000Z", correct: true, skill: row8 });
    const busy = dreamDigest({ ...inputOf(all, [...all, more]), period: next });
    expect(busy.digest.counts.attempts).toBe(1);
    expect(busy.inputs_hash).not.toBe(inputs_hash);
  });

  it("names the first attempt after which the level is the new one, and folds aliases into it", () => {
    // × 8 reaches familiar on attempt 3, drops on 4, is familiar again on 5: the mover is 3.
    // The alias row on attempt 3 counts for × 7, and the skip-only day 30 October is no day played.
    const rows = [
      row({ attempt: 3, seq: 1, at: "2026-10-26T09:00:00.000Z", correct: true, skill: row8 }),
      row({
        attempt: 3,
        seq: 2,
        at: "2026-10-26T09:01:00.000Z",
        correct: false,
        skill: "curriculum.math.multiplication.row-7",
      }),
      row({ attempt: 4, seq: 1, at: "2026-10-27T09:00:00.000Z", correct: false, skill: row8 }),
      row({ attempt: 5, seq: 1, at: "2026-10-28T09:00:00.000Z", correct: true, skill: row8 }),
      row({
        attempt: 6,
        seq: 1,
        at: "2026-10-30T09:00:00.000Z",
        correct: null,
        skip: true,
        skill: row8,
      }),
    ];
    const got = dreamDigest(inputOf([], rows)).digest;
    expect(got.counts).toEqual({ attempts: 4, questions: 5, days_played: 3 });
    expect(got.skills_moved).toEqual([
      { skill_code: row7, from: "not_started", to: "attempted", attempt_id: attempt(3) },
      { skill_code: row8, from: "not_started", to: "familiar", attempt_id: attempt(3) },
    ]);
    expect(got.mistakes).toEqual([
      {
        mistake_class: "off_by_one",
        times: 2,
        skill_codes: [row7, row8],
        citations: [att(3), att(4)],
      },
    ]);
  });

  it("knows a speed skill from the catalogue: it moves to proficient, never to mastered", () => {
    const speedy = [catalogueSkill(row7), catalogueSkill(row8, { kind: "speed" })];
    const rows = [
      row({ attempt: 3, seq: 1, at: "2026-10-26T09:00:00.000Z", correct: true, skill: row8 }),
      row({ attempt: 4, seq: 1, at: "2026-10-27T09:00:00.000Z", correct: true, skill: row8 }),
      row({ attempt: 5, seq: 1, at: "2026-10-29T09:00:00.000Z", correct: true, skill: row8 }),
      row({ attempt: 5, seq: 2, at: "2026-10-29T09:01:00.000Z", correct: true, skill: row7 }),
    ];
    const mastery_after = foldLearner(rows, speedy, NOW);
    const got = dreamDigest({
      ...inputOf([], rows),
      mastery_after,
      brief: brief(GOALS, speedy, mastery_after, NOW),
      skills: speedy,
    }).digest;
    expect(got.skills_moved.find((m) => m.skill_code === row8)).toEqual({
      skill_code: row8,
      from: "not_started",
      to: "proficient",
      attempt_id: attempt(4),
    });
  });

  it("says nothing recorded and asks when the period has no evidence", () => {
    const quiet = dreamDigest({
      ...inputOf(BEFORE, BEFORE),
      goals: [GOALS[0] ?? goal(1, [])],
    }).digest;
    expect(ReportDigest.parse(quiet)).toEqual(quiet);
    expect(quiet.counts).toEqual({ attempts: 0, questions: 0, days_played: 0 });
    expect(quiet.skills_moved).toEqual([]);
    expect(quiet.standing[0]).toEqual({
      question: "skills_standing",
      verdict: "nothing_recorded",
      citations: [],
    });
    expect(quiet.asks).toEqual([{ id: "a1", about: "no_evidence_in_period" }]);
  });

  it("is on track when something moved up and nothing is flagged, watch when a skill is flagged once", () => {
    const up = dreamDigest(
      inputOf(BEFORE, [...BEFORE, ...DURING.slice(2, 3), ...DURING.slice(4)]),
    ).digest;
    expect(up.standing[0]).toEqual({
      question: "skills_standing",
      verdict: "on_track",
      citations: [skill(row8)],
    });
    const once = dreamDigest(inputOf(BEFORE, [...BEFORE, ...DURING.slice(0, 3)])).digest;
    expect(once.standing[0]).toEqual({
      question: "skills_standing",
      verdict: "watch",
      citations: [skill(row7)],
    });
  });
});

const HOUR = 3_600_000;
const START = Date.parse("2026-10-20T00:00:00.000Z");
const evidence = fc.array(
  fc.record({
    attempt: fc.integer({ min: 1, max: 8 }),
    seq: fc.integer({ min: 1, max: 3 }),
    hours: fc.integer({ min: 0, max: 24 * 12 }),
    correct: fc.boolean(),
    help: fc.integer({ min: 0, max: 1 }),
    skill: fc.constantFrom(row7, row8, "x.unknown"),
  }),
  { maxLength: 30 },
);

describe("dreamDigest, as properties", () => {
  it("cites only attempts of the period's evidence, and skills the evidence, mastery or brief name", () => {
    fc.assert(
      fc.property(evidence, (raws) => {
        const all = raws.map((r) =>
          row({ ...r, at: new Date(START + r.hours * HOUR).toISOString() }),
        );
        const before = all.filter((e) => e.answered_at < PERIOD.starts_at);
        const input = inputOf(before, all);
        const { digest } = dreamDigest(input);
        expect(ReportDigest.parse(digest)).toEqual(digest);
        const attempts = new Set(
          all
            .filter((e) => e.answered_at >= PERIOD.starts_at && e.answered_at <= PERIOD.ends_at)
            .map((e) => e.attempt_id),
        );
        const codes = new Set([
          ...all.map((e) => e.skill_code),
          ...input.mastery_after.map((m) => m.skill_code),
          ...input.brief.entries.map((e) => e.skill_code),
        ]);
        const citations = [
          ...digest.needs_attention.flatMap((n) => n.citations),
          ...digest.mistakes.flatMap((m) => m.citations),
          ...digest.standing.flatMap((s) => s.citations),
          ...digest.proposals.flatMap((p) => p.citations),
          ...digest.skills_moved.map((m) => ({
            kind: "attempt" as const,
            attempt_id: m.attempt_id,
          })),
        ];
        for (const c of citations) {
          if (c.kind === "attempt") expect(attempts.has(c.attempt_id)).toBe(true);
          if (c.kind === "skill") expect(codes.has(c.skill_code)).toBe(true);
        }
      }),
    );
  });
});
