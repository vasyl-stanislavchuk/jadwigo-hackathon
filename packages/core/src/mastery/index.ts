import type {
  AttemptId,
  Brief,
  CanDoLine,
  Goal,
  GoalProgress,
  GoalView,
  Language,
  LearnerSkillEvidence,
  LearnerSkillMastery,
  ReportDigest,
  Skill,
  SkillId,
  SkillKind,
} from "@jadwigo/contracts";
import { foldSkill } from "./fold.ts";

/**
 * The learner knowledge base's pure functions (wave 1 of epic dl-e8ov.5). Step 0 lands the
 * signatures; the core lane fills them, with golden cases and property tests. Code computes every
 * level and the brief, and the AI never recomputes one. Every function takes `now`.
 */

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
}

/** One reviewed can-do line of a skill, in the language asked for. */
export interface SkillCanDo {
  readonly skill_code: SkillId;
  readonly line: CanDoLine;
}

function notBuilt(name: string): never {
  throw new Error(`not built: core lane (${name})`);
}

/**
 * The canonical code for `code`: itself when a skill has it, the skill whose `aliases` hold it,
 * else `code` unchanged. An unknown code is kept under its own string, never dropped.
 */
export function resolveSkill(code: SkillId, skills: readonly Skill[]): SkillId {
  if (skills.some((s) => s.code === code)) return code;
  return skills.find((s) => s.aliases.includes(code))?.code ?? code;
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
  const canonical = new Map<SkillId, SkillId>();
  const resolved = evidence.map((row) => {
    let code = canonical.get(row.skill_code);
    if (code === undefined) {
      code = resolveSkill(row.skill_code, skills);
      canonical.set(row.skill_code, code);
    }
    return { ...row, skill_code: code };
  });
  const codesOf = new Map<AttemptId, Set<SkillId>>();
  const reviewed = new Set<AttemptId>();
  for (const row of resolved) {
    const codes = codesOf.get(row.attempt_id) ?? new Set<SkillId>();
    codes.add(row.skill_code);
    codesOf.set(row.attempt_id, codes);
    if (row.lesson_kind === "review") reviewed.add(row.attempt_id);
  }
  const bySkill = new Map<SkillId, SkillEvent[]>();
  for (const row of resolved) {
    const mixed = (codesOf.get(row.attempt_id)?.size ?? 0) >= 2 || reviewed.has(row.attempt_id);
    const events = bySkill.get(row.skill_code) ?? [];
    events.push({ ...row, mixed });
    bySkill.set(row.skill_code, events);
  }
  return [...bySkill.keys()].sort().map((skill_code) => {
    // A code no catalogue skill holds has no kind; it is read as an accuracy skill.
    const kind = skills.find((s) => s.code === skill_code)?.kind ?? "accuracy";
    return { skill_code, ...masteryOf(bySkill.get(skill_code) ?? [], kind, now) };
  });
}

/** What the next lesson should hold: reteach, review, new, recheck and school (nothing recorded). */
export function brief(
  _goals: readonly GoalWithSkills[],
  _skills: readonly Skill[],
  _mastery: readonly FoldedMastery[],
  _now: Date,
): Brief {
  return notBuilt("brief");
}

/** Where a goal stands for the parent, from its skills' mastery. */
export function goalStatus(
  _goal: GoalWithSkills,
  _mastery: readonly FoldedMastery[],
): GoalProgress {
  return notBuilt("goalStatus");
}

/**
 * A goal as the parent's learner page shows it: `goalStatus`, and its skills sorted into what the
 * learner can do now, what needs attention, and what the brief puts next.
 */
export function goalView(
  _goal: GoalWithSkills,
  _mastery: readonly FoldedMastery[],
  _brief: Brief,
): GoalView {
  return notBuilt("goalView");
}

/** The reviewed can-do lines of the skills the learner can do, in `language`. */
export function canDoLines(
  _mastery: readonly FoldedMastery[],
  _skills: readonly Skill[],
  _language: Language,
): SkillCanDo[] {
  return notBuilt("canDoLines");
}

/** Code's half of a report, and the hash of what it read: the same inputs give the same hash. */
export function dreamDigest(_input: DigestInput): {
  readonly digest: ReportDigest;
  readonly inputs_hash: string;
} {
  return notBuilt("dreamDigest");
}
