import {
  AttemptId,
  type Goal,
  GoalId,
  ID_PREFIXES,
  idOf,
  LearnerId,
  type LearnerSkillEvidence,
  type MasteryLevel,
  PodId,
  type Skill,
  type SkillKind,
} from "@jadwigo/contracts";
import type { FoldedMastery, GoalWithSkills, SkillEvent } from "./types.ts";

/**
 * The fold's golden cases (dl-e8ov.2.4): each names one rule of the levels and holds the fold to
 * it. Invented ids and times only. The days are Warsaw days: from 25 October 2026 Warsaw is UTC+1.
 */

const POD = PodId.parse("pod_6et2fhbnwvb45aw9atcfzs33za");
const LEARNER = LearnerId.parse(idOf(ID_PREFIXES.learner, "0f0e0d0c-0b0a-4908-8706-050403020100"));

/** The attempt numbered `n`, as a branded id. */
export function attempt(n: number): AttemptId {
  const tail = n.toString(16).padStart(12, "0");
  return AttemptId.parse(idOf(ID_PREFIXES.attempt, `00000000-0000-4000-8000-${tail}`));
}

/** One answer in short: its attempt, question, time, and what happened. */
export interface Answer {
  readonly attempt: number;
  readonly seq?: number;
  readonly at: string;
  readonly try_no?: number;
  /** `null` with `skip: true`. */
  readonly correct: boolean | null;
  readonly help?: number;
  readonly skip?: boolean;
  readonly mixed?: boolean;
  readonly held?: boolean;
  readonly skill?: string;
  readonly lesson_kind?: LearnerSkillEvidence["lesson_kind"];
}

/** The evidence row an answer stands for. */
export function row(a: Answer): LearnerSkillEvidence {
  return {
    pod_id: POD,
    learner_id: LEARNER,
    attempt_id: attempt(a.attempt),
    seq: a.seq ?? 1,
    try_no: a.try_no ?? 1,
    kind: a.skip === true ? "skip" : "try",
    skill_code: a.skill ?? "maths.multiplication.row-7",
    answered_at: a.at,
    correct: a.skip === true ? null : a.correct,
    help_used: a.help ?? 0,
    latency_ms: 4000,
    mistake_class: a.correct === false ? "off_by_one" : null,
    added: "planned",
    lesson_kind: a.lesson_kind ?? "practice",
    hold_verdicts: a.held ?? false,
  };
}

/** The event `masteryOf` reads for an answer. */
export function event(a: Answer): SkillEvent {
  return { ...row(a), mixed: a.mixed ?? false };
}

export interface GoldenCase {
  readonly name: string;
  readonly kind: SkillKind;
  readonly answers: readonly Answer[];
  readonly level: MasteryLevel;
  readonly needs_attention: boolean;
  readonly tries: number;
}

const clean = (attempt: number, at: string, more: Partial<Answer> = {}): Answer => ({
  attempt,
  at,
  correct: true,
  ...more,
});
const miss = (attempt: number, at: string, more: Partial<Answer> = {}): Answer => ({
  attempt,
  at,
  correct: false,
  ...more,
});

export const GOLDEN: readonly GoldenCase[] = [
  {
    name: "no evidence is not started",
    kind: "accuracy",
    answers: [],
    level: "not_started",
    needs_attention: false,
    tries: 0,
  },
  {
    name: "a skip alone stays not started",
    kind: "accuracy",
    answers: [{ attempt: 1, at: "2026-10-26T09:00:00.000Z", correct: null, skip: true }],
    level: "not_started",
    needs_attention: false,
    tries: 0,
  },
  {
    name: "one clean try is familiar",
    kind: "accuracy",
    answers: [clean(1, "2026-10-26T09:00:00.000Z")],
    level: "familiar",
    needs_attention: false,
    tries: 1,
  },
  {
    name: "right with help on the first try stays attempted",
    kind: "accuracy",
    answers: [clean(1, "2026-10-26T09:00:00.000Z", { help: 1 })],
    level: "attempted",
    needs_attention: false,
    tries: 1,
  },
  {
    name: "the first try decides: wrong then right is a miss",
    kind: "accuracy",
    answers: [
      miss(1, "2026-10-26T09:00:00.000Z"),
      clean(1, "2026-10-26T09:00:10.000Z", { try_no: 2 }),
    ],
    level: "attempted",
    needs_attention: true,
    tries: 2,
  },
  {
    name: "a held-verdict miss is a miss",
    kind: "accuracy",
    answers: [
      clean(1, "2026-10-26T09:00:00.000Z"),
      miss(2, "2026-10-27T09:00:00.000Z", { held: true }),
    ],
    level: "attempted",
    needs_attention: true,
    tries: 2,
  },
  {
    name: "cleans at 22:30Z and 23:30Z on 30 October are 2 Warsaw days",
    kind: "accuracy",
    answers: [clean(1, "2026-10-30T22:30:00.000Z"), clean(2, "2026-10-30T23:30:00.000Z")],
    level: "proficient",
    needs_attention: false,
    tries: 2,
  },
  {
    name: "2 cleans on one Warsaw day stay familiar",
    kind: "accuracy",
    answers: [clean(1, "2026-10-30T07:00:00.000Z"), clean(2, "2026-10-30T19:00:00.000Z")],
    level: "familiar",
    needs_attention: false,
    tries: 2,
  },
  {
    name: "a miss, then cleans on 2 days, is proficient",
    kind: "accuracy",
    answers: [
      miss(1, "2026-10-26T09:00:00.000Z"),
      clean(2, "2026-10-27T09:00:00.000Z"),
      clean(3, "2026-10-28T09:00:00.000Z"),
    ],
    level: "proficient",
    needs_attention: false,
    tries: 3,
  },
  {
    name: "a miss restarts the 2 days: proficient drops to familiar and needs 2 new days",
    kind: "accuracy",
    answers: [
      clean(1, "2026-10-26T09:00:00.000Z"),
      clean(2, "2026-10-27T09:00:00.000Z"),
      miss(3, "2026-10-28T09:00:00.000Z"),
      clean(4, "2026-10-29T09:00:00.000Z"),
    ],
    level: "familiar",
    needs_attention: true,
    tries: 4,
  },
  {
    name: "a clean in a mixed attempt 2 Warsaw days after proficient is mastered",
    kind: "accuracy",
    answers: [
      clean(1, "2026-11-04T09:00:00.000Z"),
      clean(2, "2026-11-05T09:00:00.000Z"),
      clean(3, "2026-11-08T09:00:00.000Z", { mixed: true }),
    ],
    level: "mastered",
    needs_attention: false,
    tries: 3,
  },
  {
    name: "a speed skill stops at proficient",
    kind: "speed",
    answers: [
      clean(1, "2026-11-04T09:00:00.000Z"),
      clean(2, "2026-11-05T09:00:00.000Z"),
      clean(3, "2026-11-08T09:00:00.000Z", { mixed: true }),
    ],
    level: "proficient",
    needs_attention: false,
    tries: 3,
  },
  {
    name: "mastered needs a mixed attempt",
    kind: "accuracy",
    answers: [
      clean(1, "2026-10-26T09:00:00.000Z"),
      clean(2, "2026-10-27T09:00:00.000Z"),
      clean(3, "2026-10-29T09:00:00.000Z"),
    ],
    level: "proficient",
    needs_attention: false,
    tries: 3,
  },
  {
    name: "mastered needs 2 Warsaw days after proficient, not 1",
    kind: "accuracy",
    answers: [
      clean(1, "2026-10-26T09:00:00.000Z"),
      clean(2, "2026-10-27T09:00:00.000Z"),
      clean(3, "2026-10-28T09:00:00.000Z", { mixed: true }),
    ],
    level: "proficient",
    needs_attention: false,
    tries: 3,
  },
  {
    name: "a miss drops at most one level per attempt",
    kind: "accuracy",
    answers: [
      clean(1, "2026-10-26T09:00:00.000Z"),
      clean(2, "2026-10-27T09:00:00.000Z"),
      miss(3, "2026-10-28T09:00:00.000Z", { seq: 1 }),
      miss(3, "2026-10-28T09:01:00.000Z", { seq: 2 }),
    ],
    level: "familiar",
    needs_attention: true,
    tries: 4,
  },
  {
    name: "misses never drop below attempted",
    kind: "accuracy",
    answers: [
      clean(1, "2026-10-26T09:00:00.000Z"),
      miss(2, "2026-10-27T09:00:00.000Z"),
      miss(3, "2026-10-28T09:00:00.000Z"),
    ],
    level: "attempted",
    needs_attention: true,
    tries: 3,
  },
  {
    name: "needs attention clears after 2 attempts without a miss",
    kind: "accuracy",
    answers: [
      miss(1, "2026-10-26T09:00:00.000Z"),
      clean(2, "2026-10-27T09:00:00.000Z", { help: 2 }),
      clean(3, "2026-10-28T09:00:00.000Z", { help: 1 }),
    ],
    level: "attempted",
    needs_attention: false,
    tries: 3,
  },
  {
    name: "skip-only attempts do not clear needs attention",
    kind: "accuracy",
    answers: [
      miss(1, "2026-10-26T09:00:00.000Z"),
      { attempt: 2, at: "2026-10-27T09:00:00.000Z", correct: null, skip: true },
      { attempt: 3, at: "2026-10-28T09:00:00.000Z", correct: null, skip: true },
    ],
    level: "attempted",
    needs_attention: true,
    tries: 1,
  },
  {
    name: "proficient from cleans on 4 and 5 November, then a miss on 6 November, is familiar",
    kind: "accuracy",
    answers: [
      clean(1, "2026-11-04T09:00:00.000Z"),
      clean(2, "2026-11-05T09:00:00.000Z"),
      miss(3, "2026-11-06T09:00:00.000Z"),
    ],
    level: "familiar",
    needs_attention: true,
    tries: 3,
  },
  {
    name: "clean, miss, clean over 1 and 2 November is familiar: 1 clean day since the miss",
    kind: "accuracy",
    answers: [
      clean(1, "2026-11-01T09:00:00.000Z"),
      miss(2, "2026-11-01T15:00:00.000Z"),
      clean(3, "2026-11-02T09:00:00.000Z"),
    ],
    level: "familiar",
    needs_attention: true,
    tries: 3,
  },
  {
    name: "then cleans on 3 and 4 November in 2 later attempts are proficient, the flag gone",
    kind: "accuracy",
    answers: [
      clean(1, "2026-11-01T09:00:00.000Z"),
      miss(2, "2026-11-01T15:00:00.000Z"),
      clean(3, "2026-11-02T09:00:00.000Z"),
      clean(4, "2026-11-03T09:00:00.000Z"),
      clean(5, "2026-11-04T09:00:00.000Z"),
    ],
    level: "proficient",
    needs_attention: false,
    tries: 5,
  },
];

/** The goal numbered `n`, over `codes`. */
export function goal(
  n: number,
  codes: readonly string[],
  status: Goal["status"] = "active",
): GoalWithSkills {
  const tail = n.toString(16).padStart(12, "0");
  return {
    goal: {
      id: GoalId.parse(idOf(ID_PREFIXES.goal, `00000000-0000-4000-9000-${tail}`)),
      pod_id: POD,
      learner_id: LEARNER,
      name: `Goal ${n}`,
      words: null,
      lesson_language: "pl",
      status,
      created_at: "2026-10-01T08:00:00.000Z",
    },
    skill_codes: [...codes],
  };
}

/** A catalogue skill. */
export function catalogueSkill(code: string, more: Partial<Skill> = {}): Skill {
  return {
    pod_id: POD,
    code,
    topic_id: null,
    kind: "accuracy",
    status: "reviewed",
    can_do: null,
    aliases: [],
    prerequisites: [],
    source: "bank",
    created_at: "2026-10-01T08:00:00.000Z",
    ...more,
  };
}

/** A folded mastery row. */
export function masteryRow(
  code: string,
  level: MasteryLevel,
  more: Partial<FoldedMastery> = {},
): FoldedMastery {
  return {
    skill_code: code,
    level,
    needs_attention: false,
    tries: level === "not_started" ? 0 : 1,
    last_answered_at: level === "not_started" ? null : "2026-10-26T09:00:00.000Z",
    due_at: null,
    card: null,
    ...more,
  };
}
