import type {
  Brief,
  GoalProgress,
  GoalView,
  Language,
  LearnerSkillEvidence,
  ReportDigest,
  Skill,
  SkillId,
  SkillKind,
} from "@jadwigo/contracts";
import { linesOf, makeBrief, statusOf, viewOf } from "./brief.ts";
import { makeDigest } from "./digest.ts";

export { DIGEST_RULES_VERSION } from "./digest.ts";

import { canonicalOf, eventsBySkill } from "./events.ts";
import { foldSkill } from "./fold.ts";
import type {
  DigestInput,
  FoldedMastery,
  GoalWithSkills,
  SkillCanDo,
  SkillEvent,
  SkillMastery,
} from "./types.ts";

/**
 * The learner knowledge base's pure functions (wave 1 of epic dl-e8ov.5). Step 0 lands the
 * signatures; the core lane fills them, with golden cases and property tests. Code computes every
 * level and the brief, and the AI never recomputes one. Every function takes `now`.
 */

export type {
  DigestInput,
  FoldedMastery,
  GoalWithSkills,
  ReportPeriod,
  SkillCanDo,
  SkillEvent,
  SkillMastery,
} from "./types.ts";

/**
 * The canonical code for `code`: itself when a skill has it, the skill whose `aliases` hold it,
 * else `code` unchanged. An unknown code is kept under its own string, never dropped.
 */
export function resolveSkill(code: SkillId, skills: readonly Skill[]): SkillId {
  return canonicalOf(code, skills);
}

/** One skill's level, `needs_attention`, tries, dates and FSRS card from its events. */
export function masteryOf(
  events: readonly SkillEvent[],
  kind: SkillKind,
  _now: Date,
): SkillMastery {
  return foldSkill(events, kind);
}

/** Every skill code the learner has evidence on, resolved to its canonical code, folded. */
export function foldLearner(
  evidence: readonly LearnerSkillEvidence[],
  skills: readonly Skill[],
  now: Date,
): FoldedMastery[] {
  return eventsBySkill(evidence, skills).map(({ skill_code, kind, events }) => ({
    skill_code,
    ...masteryOf(events, kind, now),
  }));
}

/** What the next lesson should hold: reteach, review, new, recheck and school (nothing recorded). */
export function brief(
  goals: readonly GoalWithSkills[],
  skills: readonly Skill[],
  mastery: readonly FoldedMastery[],
  now: Date,
): Brief {
  return makeBrief(goals, skills, mastery, now);
}

/** Where a goal stands for the parent, from its skills' mastery. */
export function goalStatus(goal: GoalWithSkills, mastery: readonly FoldedMastery[]): GoalProgress {
  return statusOf(goal, mastery);
}

/**
 * A goal as the parent's learner page shows it: `goalStatus`, and its skills sorted into what the
 * learner can do now, what needs attention, and what the brief puts next.
 */
export function goalView(
  goal: GoalWithSkills,
  mastery: readonly FoldedMastery[],
  brief: Brief,
): GoalView {
  return viewOf(goal, mastery, brief);
}

/** The reviewed can-do lines of the skills the learner can do, in `language`. */
export function canDoLines(
  mastery: readonly FoldedMastery[],
  skills: readonly Skill[],
  language: Language,
): SkillCanDo[] {
  return linesOf(mastery, skills, language);
}

/** Code's half of a report, and the hash of what it read: the same inputs give the same hash. */
export function dreamDigest(input: DigestInput): {
  readonly digest: ReportDigest;
  readonly inputs_hash: string;
} {
  return makeDigest(input);
}
