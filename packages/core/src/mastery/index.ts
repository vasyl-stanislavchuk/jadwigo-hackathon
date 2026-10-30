import type {
  AttemptId,
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
