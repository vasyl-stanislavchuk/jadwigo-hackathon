import type {
  AttemptId,
  LearnerSkillEvidence,
  Skill,
  SkillId,
  SkillKind,
} from "@jadwigo/contracts";
import type { SkillEvent } from "./types.ts";

/**
 * The canonical code for `code`: itself when a skill has it, the skill whose `aliases` hold it,
 * else `code` unchanged. An unknown code is kept under its own string, never dropped.
 */
export function canonicalOf(code: SkillId, skills: readonly Skill[]): SkillId {
  if (skills.some((s) => s.code === code)) return code;
  return skills.find((s) => s.aliases.includes(code))?.code ?? code;
}

/**
 * The evidence grouped by canonical code, each row marked mixed when its attempt carries 2 or
 * more canonical codes or is a review lesson, with the skill's kind (accuracy for a code no
 * catalogue skill holds). Codes in sorted order.
 */
export function eventsBySkill(
  evidence: readonly LearnerSkillEvidence[],
  skills: readonly Skill[],
): { readonly skill_code: SkillId; readonly kind: SkillKind; readonly events: SkillEvent[] }[] {
  const canonical = new Map<SkillId, SkillId>();
  const resolved = evidence.map((row) => {
    let code = canonical.get(row.skill_code);
    if (code === undefined) {
      code = canonicalOf(row.skill_code, skills);
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
  return [...bySkill.keys()].sort().map((skill_code) => ({
    skill_code,
    kind: skills.find((s) => s.code === skill_code)?.kind ?? "accuracy",
    events: bySkill.get(skill_code) ?? [],
  }));
}
