/**
 * How the learner page words what code computed (dl-e8ov.5.7): a skill code as the catalogue's
 * reviewed can-do line for the parent, else the code's last segment made readable; a goal's
 * standing as one word. Never a level name, a score or a percentage (decision jadwigo-hackathon
 * 2026-10-29-parents-never-see-khan-s-level-names-khan-questions-keep-their-c).
 */

import type { GoalProgress, Skill, SkillId } from "@jadwigo/contracts";
import type { CopyKey, Language } from "@jadwigo/copy";

/** Each goal standing's word. */
export const GOAL_STATUS: Record<GoalProgress, CopyKey> = {
  not_started: "parent_goal_status_not_started",
  needs_attention: "parent_goal_status_needs_attention",
  on_its_way: "parent_goal_status_on_its_way",
  good: "parent_goal_status_good",
};

/** A code's last segment, its dashes as spaces and its first letter a capital: `add-within-20`
 * reads "Add within 20". */
export function readable(code: SkillId): string {
  const last = code.slice(code.lastIndexOf(".") + 1).replaceAll("-", " ");
  return last.charAt(0).toUpperCase() + last.slice(1);
}

/** The catalogue row for `code`: its own, else the one that lists it as an alias. */
function skillOf(code: SkillId, catalogue: readonly Skill[]): Skill | undefined {
  return (
    catalogue.find((skill) => skill.code === code) ??
    catalogue.find((skill) => skill.aliases.includes(code))
  );
}

/** The parent's line for `code` in `language`: the catalogue's can-do line once a person has read
 * it, else the code made readable. */
export function skillLine(code: SkillId, catalogue: readonly Skill[], language: Language): string {
  const line = skillOf(code, catalogue)?.can_do?.[language];
  return line?.reviewed ? line.parent : readable(code);
}
