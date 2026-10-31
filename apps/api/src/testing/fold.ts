// Stand-ins for packages/core's learner knowledge functions, which the route tests put in place of
// the real ones (`vi.mock("@jadwigo/core", ...)` in knowledge.test.ts and knowledge.int.test.ts).
// The routes' job is the wiring: what they read, in which pod, what they write and what they
// refuse. The levels, the brief and the digest are core's, tested there (wave dl-e8ov.5-1, lane
// core), and the happy-path journey runs the real ones end to end (dl-e8ov.5.46). Simple rules, so
// a test can say what to expect: a skill with a right answer is familiar, else attempted, and one
// whose last answer was wrong needs attention.
import { createHash } from "node:crypto";
import type {
  Brief,
  GoalView,
  LearnerSkillEvidence,
  ReportDigest,
  Skill,
} from "@jadwigo/contracts";
import type { DigestInput, FoldedMastery, GoalWithSkills } from "@jadwigo/core";

function foldLearner(
  evidence: readonly LearnerSkillEvidence[],
  _skills: readonly Skill[],
  _now: Date,
): FoldedMastery[] {
  const bySkill = new Map<string, LearnerSkillEvidence[]>();
  for (const row of evidence)
    bySkill.set(row.skill_code, [...(bySkill.get(row.skill_code) ?? []), row]);
  return [...bySkill.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([skill_code, rows]) => {
      const last = rows.at(-1);
      return {
        skill_code,
        level: rows.some((r) => r.correct === true) ? "familiar" : "attempted",
        needs_attention: last?.correct === false,
        tries: rows.length,
        last_answered_at: last?.answered_at ?? null,
        due_at: null,
        card: null,
      };
    });
}

function brief(
  goals: readonly GoalWithSkills[],
  _skills: readonly Skill[],
  mastery: readonly FoldedMastery[],
  now: Date,
): Brief {
  return {
    computed_at: now.toISOString(),
    entries: mastery
      .filter((m) => m.needs_attention)
      .map((m) => ({
        skill_code: m.skill_code,
        list: "reteach",
        goal_ids: goals.filter((g) => g.skill_codes.includes(m.skill_code)).map((g) => g.goal.id),
        why: "needs_attention",
      })),
    school: "nothing_recorded",
  };
}

function goalView(goal: GoalWithSkills, mastery: readonly FoldedMastery[], made: Brief): GoalView {
  const mine = mastery.filter((m) => goal.skill_codes.includes(m.skill_code));
  const attention = mine.filter((m) => m.needs_attention).map((m) => m.skill_code);
  return {
    goal: goal.goal,
    skill_codes: [...goal.skill_codes],
    status:
      mine.length === 0 ? "not_started" : attention.length > 0 ? "needs_attention" : "on_its_way",
    can_do_now: mine.filter((m) => m.level === "familiar").map((m) => m.skill_code),
    needs_attention: attention,
    next: made.entries
      .filter((e) => goal.skill_codes.includes(e.skill_code))
      .map((e) => e.skill_code),
  };
}

function dreamDigest(input: DigestInput): { digest: ReportDigest; inputs_hash: string } {
  const inPeriod = input.evidence_after.filter((e) => e.answered_at >= input.period.starts_at);
  const levelBefore = new Map(input.mastery_before.map((m) => [m.skill_code, m.level]));
  const lastAttempt = new Map(input.evidence_after.map((e) => [e.skill_code, e.attempt_id]));
  const skills_moved = input.mastery_after.flatMap((m) => {
    const from = levelBefore.get(m.skill_code) ?? "not_started";
    const attempt_id = lastAttempt.get(m.skill_code);
    return from === m.level || attempt_id === undefined
      ? []
      : [{ skill_code: m.skill_code, from, to: m.level, attempt_id }];
  });
  const focus = input.mastery_after[0]?.skill_code;
  const digest: ReportDigest = {
    shape: "digest/1",
    counts: {
      attempts: new Set(inPeriod.map((e) => e.attempt_id)).size,
      questions: new Set(inPeriod.map((e) => `${e.attempt_id} ${e.seq}`)).size,
      days_played: new Set(inPeriod.map((e) => e.answered_at.slice(0, 10))).size,
    },
    skills_moved,
    needs_attention: [],
    mistakes: [],
    brief: input.brief,
    goals: input.goals.map((g) => ({ goal_id: g.goal.id, status: "on_its_way" })),
    standing: [{ question: "next_focus", verdict: "on_track", citations: [] }],
    proposals:
      focus === undefined
        ? []
        : [
            {
              id: "p1",
              kind: "focus",
              list: "review",
              skill_codes: [focus],
              citations: [{ kind: "skill", skill_code: focus }],
            },
          ],
    asks: [],
  };
  const inputs = input.evidence_after.map(
    (e) => `${e.attempt_id} ${e.seq} ${e.try_no} ${e.skill_code}`,
  );
  const goals = input.goals.map((g) => `${g.goal.id} ${g.skill_codes.join(",")}`);
  const inputs_hash = createHash("sha256")
    .update([...inputs, ...goals].join("\n"))
    .digest("hex");
  return { digest, inputs_hash };
}

/** What the route tests put in place of core's learner knowledge functions. */
export const STAND_IN_CORE = { foldLearner, brief, goalView, dreamDigest };
