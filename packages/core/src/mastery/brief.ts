import type {
  Brief,
  BriefEntry,
  BriefList,
  GoalId,
  GoalProgress,
  GoalView,
  Language,
  MasteryLevel,
  Skill,
  SkillId,
} from "@jadwigo/contracts";
import { rank } from "./fold.ts";
import type { FoldedMastery, GoalWithSkills, SkillCanDo } from "./types.ts";

/** A skill's row, or the row of a skill with no evidence. */
function rowOf(mastery: ReadonlyMap<SkillId, FoldedMastery>, code: SkillId) {
  return (
    mastery.get(code) ?? {
      level: "not_started" as MasteryLevel,
      needs_attention: false,
      due_at: null,
    }
  );
}

function byCode(mastery: readonly FoldedMastery[]): Map<SkillId, FoldedMastery> {
  return new Map(mastery.map((m) => [m.skill_code, m]));
}

const LIST_ORDER: readonly BriefList[] = ["reteach", "review", "new", "recheck", "school"];
const WHY = {
  reteach: "needs_attention",
  review: "review_due",
  new: "prerequisites_met",
  recheck: "second_day_owed",
  school: "school_tag",
} as const satisfies Record<BriefList, BriefEntry["why"]>;

/**
 * Every skill the active goals need, their prerequisites included (all the way down), with the
 * goals each serves. A prerequisite serves the goals of the skills that need it.
 */
function neededSkills(goals: readonly GoalWithSkills[], skills: readonly Skill[]) {
  const prerequisites = new Map(skills.map((s) => [s.code, s.prerequisites] as const));
  const serves = new Map<SkillId, Set<GoalId>>();
  for (const { goal, skill_codes } of goals) {
    if (goal.status !== "active") continue;
    const stack = [...skill_codes];
    const seen = new Set<SkillId>();
    for (let code = stack.pop(); code !== undefined; code = stack.pop()) {
      if (seen.has(code)) continue;
      seen.add(code);
      const goalIds = serves.get(code) ?? new Set<GoalId>();
      goalIds.add(goal.id);
      serves.set(code, goalIds);
      stack.push(...(prerequisites.get(code) ?? []));
    }
  }
  return { serves, prerequisites };
}

/**
 * One brief over all active goals (decision 2026-10-26): each needed skill on at most one list,
 * the first that holds it of reteach (flagged), review (proficient or better, due by `now`), new
 * (no evidence, every prerequisite familiar or better), recheck (familiar, its second day owed).
 * A skill tried but not yet right without help, and not flagged, is on no list. School is
 * `nothing_recorded` until a parent records what school covers.
 */
export function makeBrief(
  goals: readonly GoalWithSkills[],
  skills: readonly Skill[],
  mastery: readonly FoldedMastery[],
  now: Date,
): Brief {
  const rows = byCode(mastery);
  const { serves, prerequisites } = neededSkills(goals, skills);
  const entries: BriefEntry[] = [];
  for (const [code, goalIds] of serves) {
    const row = rowOf(rows, code);
    let list: BriefList | undefined;
    if (row.needs_attention) list = "reteach";
    else if (
      rank(row.level) >= rank("proficient") &&
      row.due_at !== null &&
      Date.parse(row.due_at) <= now.getTime()
    )
      list = "review";
    else if (
      row.level === "not_started" &&
      (prerequisites.get(code) ?? []).every((p) => rank(rowOf(rows, p).level) >= rank("familiar"))
    )
      list = "new";
    else if (row.level === "familiar") list = "recheck";
    if (list === undefined) continue;
    entries.push({ skill_code: code, list, goal_ids: [...goalIds].sort(), why: WHY[list] });
  }
  entries.sort(
    (a, b) =>
      LIST_ORDER.indexOf(a.list) - LIST_ORDER.indexOf(b.list) ||
      (a.skill_code < b.skill_code ? -1 : a.skill_code > b.skill_code ? 1 : 0),
  );
  return { computed_at: now.toISOString(), entries, school: "nothing_recorded" };
}

/**
 * Where a goal stands: needs attention when any skill is flagged; good when every skill is
 * proficient or better; on its way once any skill has a judged try; not started before that, and
 * for a goal with no skills.
 */
export function statusOf(goal: GoalWithSkills, mastery: readonly FoldedMastery[]): GoalProgress {
  const rows = byCode(mastery);
  const levels = goal.skill_codes.map((code) => rowOf(rows, code));
  if (levels.every((r) => r.level === "not_started")) return "not_started";
  if (levels.some((r) => r.needs_attention)) return "needs_attention";
  if (levels.every((r) => rank(r.level) >= rank("proficient"))) return "good";
  return "on_its_way";
}

/**
 * A goal's view: what the learner can do now (familiar or better, not flagged), what needs
 * attention (flagged), and next (the brief's entries serving this goal, reteach left out since it
 * is the attention list), in brief order.
 */
export function viewOf(
  goal: GoalWithSkills,
  mastery: readonly FoldedMastery[],
  made: Brief,
): GoalView {
  const rows = byCode(mastery);
  const codes = [...goal.skill_codes];
  return {
    goal: goal.goal,
    skill_codes: codes,
    status: statusOf(goal, mastery),
    can_do_now: codes
      .filter(
        (c) => !rowOf(rows, c).needs_attention && rank(rowOf(rows, c).level) >= rank("familiar"),
      )
      .sort(),
    needs_attention: codes.filter((c) => rowOf(rows, c).needs_attention).sort(),
    next: made.entries
      .filter((e) => e.list !== "reteach" && e.goal_ids.includes(goal.goal.id))
      .map((e) => e.skill_code),
  };
}

/** The reviewed lines, in `language`, of every skill at familiar or better, by skill code. */
export function linesOf(
  mastery: readonly FoldedMastery[],
  skills: readonly Skill[],
  language: Language,
): SkillCanDo[] {
  const out: SkillCanDo[] = [];
  for (const m of [...mastery].sort((a, b) => (a.skill_code < b.skill_code ? -1 : 1))) {
    if (rank(m.level) < rank("familiar")) continue;
    const line = skills.find((s) => s.code === m.skill_code)?.can_do?.[language];
    if (line?.reviewed === true) out.push({ skill_code: m.skill_code, line });
  }
  return out;
}
