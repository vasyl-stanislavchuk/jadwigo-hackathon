import type {
  Brief,
  CanDoLine,
  Goal,
  LearnerSkillEvidence,
  LearnerSkillMastery,
  Skill,
  SkillId,
} from "@jadwigo/contracts";

/** The mastery functions' own types, re-exported unchanged from `./index.ts`. */

/** A goal with the codes of its skills, as the store lists them. */
export interface GoalWithSkills {
  readonly goal: Goal;
  readonly skill_codes: readonly SkillId[];
}

/** A mastery row as the fold makes it: the store adds the pod, the learner and `computed_at`. */
export type FoldedMastery = Omit<LearnerSkillMastery, "pod_id" | "learner_id" | "computed_at">;

/**
 * One evidence row of one canonical skill code, with whether its attempt was mixed: 2 or more
 * canonical codes, or a `review` lesson. The first try of each (attempt, seq) decides.
 */
export type SkillEvent = LearnerSkillEvidence & { readonly mixed: boolean };

/** One skill's level and the rest of its row, from its events alone. */
export type SkillMastery = Omit<FoldedMastery, "skill_code">;

/** A report's period: the evidence it reads is answered inside it. */
export interface ReportPeriod {
  readonly starts_at: string;
  readonly ends_at: string;
}

/** What `dreamDigest` reads: the evidence and mastery before and after the period, the brief and goals. */
export interface DigestInput {
  readonly evidence_before: readonly LearnerSkillEvidence[];
  readonly evidence_after: readonly LearnerSkillEvidence[];
  readonly mastery_before: readonly FoldedMastery[];
  readonly mastery_after: readonly FoldedMastery[];
  readonly brief: Brief;
  readonly goals: readonly GoalWithSkills[];
  readonly period: ReportPeriod;
  /**
   * The catalogue the pod reads (`listSkills`), as `foldLearner` takes it: the digest resolves
   * aliases and knows each code's kind from it, so a speed skill never shows as a mastered mover.
   */
  readonly skills: readonly Skill[];
}

/** One reviewed can-do line of a skill, in the language asked for. */
export interface SkillCanDo {
  readonly skill_code: SkillId;
  readonly line: CanDoLine;
}
