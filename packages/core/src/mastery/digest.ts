import type {
  AttemptId,
  BriefList,
  Citation,
  LearnerSkillEvidence,
  MasteryLevel,
  ReportDigest,
  Skill,
  SkillId,
} from "@jadwigo/contracts";
import { statusOf } from "./brief.ts";
import { warsawDay } from "./days.ts";
import { canonicalOf, eventsBySkill } from "./events.ts";
import { happenings, levelSteps, rank } from "./fold.ts";
import { sha256Hex } from "./sha256.ts";
import type { DigestInput } from "./types.ts";

type Digest = ReportDigest;

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const skillCite = (skill_code: SkillId): Citation => ({ kind: "skill", skill_code });
const attemptCite = (attempt_id: AttemptId): Citation => ({ kind: "attempt", attempt_id });

/** The evidence answered inside the period, its ends included. */
function inPeriod(input: DigestInput): LearnerSkillEvidence[] {
  const from = Date.parse(input.period.starts_at);
  const to = Date.parse(input.period.ends_at);
  return input.evidence_after.filter((e) => {
    const at = Date.parse(e.answered_at);
    return at >= from && at <= to;
  });
}

/** Each canonical skill's level steps over all the evidence to the period's end, as the fold steps them. */
function stepsBySkill(evidence: readonly LearnerSkillEvidence[], skills: readonly Skill[]) {
  const steps = new Map<SkillId, ReturnType<typeof levelSteps>>();
  for (const { skill_code, kind, events } of eventsBySkill(evidence, skills))
    steps.set(skill_code, levelSteps(happenings(events), kind));
  return steps;
}

/**
 * Bumped whenever a rule of the fold, the brief or the digest changes, so a report after the fix
 * hashes differently and createReport writes a new digest instead of reusing the old one.
 */
export const DIGEST_RULES_VERSION = 1;

/**
 * The hash of what the digest read: the rules version, the period's evidence by (attempt, seq,
 * try, code), sorted, and the catalogue's codes, sorted. The same evidence gives the same hash.
 */
function hashOf(period: readonly LearnerSkillEvidence[], skills: readonly Skill[]): string {
  const evidence = period
    .map((e) => [e.attempt_id, e.seq, e.try_no, e.skill_code].join("|"))
    .sort(compare);
  const codes = skills.map((s) => s.code).sort(compare);
  return sha256Hex(JSON.stringify({ rules: DIGEST_RULES_VERSION, evidence, skills: codes }));
}

export function makeDigest(input: DigestInput): { digest: Digest; inputs_hash: string } {
  const skills = input.skills ?? [];
  const canonical = (code: SkillId) => canonicalOf(code, skills);
  const period = inPeriod(input);
  const from = Date.parse(input.period.starts_at);
  const to = Date.parse(input.period.ends_at);
  const inside = (ms: number) => ms >= from && ms <= to;

  const counts = {
    attempts: new Set(period.map((e) => e.attempt_id)).size,
    questions: new Set(period.map((e) => `${e.attempt_id}#${e.seq}`)).size,
    days_played: new Set(
      period.filter((e) => e.kind === "try").map((e) => warsawDay(e.answered_at)),
    ).size,
  };

  const before = new Map(input.mastery_before.map((m) => [m.skill_code, m]));
  const after = [...input.mastery_after].sort((a, b) => compare(a.skill_code, b.skill_code));
  const steps = stepsBySkill(input.evidence_after, skills);

  // A skill moved when its level differs from the last report's. The attempt that moved it is the
  // first attempt in the period after which the folded level equals the new level, the period's
  // attempts taken in order of their last answer on the skill; else the period's last attempt on it.
  const skills_moved: Digest["skills_moved"] = [];
  for (const m of after) {
    const from_level: MasteryLevel = before.get(m.skill_code)?.level ?? "not_started";
    if (from_level === m.level) continue;
    const levelAfter = new Map<AttemptId, { ms: number; level: MasteryLevel }>();
    for (const s of steps.get(m.skill_code) ?? []) {
      if (!inside(s.happening.ms)) continue;
      levelAfter.set(s.happening.attempt_id, { ms: s.happening.ms, level: s.level });
    }
    const ordered = [...levelAfter.entries()].sort(
      ([a, x], [b, y]) => x.ms - y.ms || compare(a, b),
    );
    const mover = ordered.find(([, x]) => x.level === m.level)?.[0] ?? ordered.at(-1)?.[0];
    if (mover === undefined) continue;
    skills_moved.push({
      skill_code: m.skill_code,
      from: from_level,
      to: m.level,
      attempt_id: mover,
    });
  }

  const misses = period.filter((e) => e.kind === "try" && e.correct === false);
  const needs_attention: Digest["needs_attention"] = after
    .filter((m) => m.needs_attention)
    .map((m) => {
      const mine = misses.filter((e) => canonical(e.skill_code) === m.skill_code);
      const classes = new Set(
        mine.flatMap((e) => (e.mistake_class === null ? [] : [e.mistake_class])),
      );
      const attempts = [...new Set(mine.map((e) => e.attempt_id))].sort(compare);
      return {
        skill_code: m.skill_code,
        mistake_classes: [...classes].sort(compare),
        citations: [skillCite(m.skill_code), ...attempts.map(attemptCite)],
      };
    });

  const byClass = new Map<
    string,
    { answers: Set<string>; codes: Set<SkillId>; attempts: Set<AttemptId> }
  >();
  for (const e of misses) {
    if (e.mistake_class === null) continue;
    const entry = byClass.get(e.mistake_class) ?? {
      answers: new Set<string>(),
      codes: new Set<SkillId>(),
      attempts: new Set<AttemptId>(),
    };
    entry.answers.add(`${e.attempt_id}#${e.seq}#${e.try_no}`);
    entry.codes.add(canonical(e.skill_code));
    entry.attempts.add(e.attempt_id);
    byClass.set(e.mistake_class, entry);
  }
  const mistakes: Digest["mistakes"] = [...byClass.entries()]
    .sort(([a], [b]) => compare(a, b))
    .map(([mistake_class, e]) => ({
      mistake_class,
      times: e.answers.size,
      skill_codes: [...e.codes].sort(compare),
      citations: [...e.attempts].sort(compare).map(attemptCite),
    }));

  const goals: Digest["goals"] = input.goals.map((g) => ({
    goal_id: g.goal.id,
    status: statusOf(g, input.mastery_after),
  }));

  const stuck = [...steps.entries()]
    .filter(([, s]) => s.filter((x) => x.dropped && inside(x.happening.ms)).length >= 2)
    .map(([code]) => code)
    .sort(compare);
  const flagged = needs_attention.map((n) => n.skill_code);
  const movedUp = skills_moved.filter((m) => rank(m.to) > rank(m.from)).map((m) => m.skill_code);
  const skillsStanding: Digest["standing"][number] =
    period.length === 0
      ? { question: "skills_standing", verdict: "nothing_recorded", citations: [] }
      : stuck.length > 0
        ? { question: "skills_standing", verdict: "stuck", citations: stuck.map(skillCite) }
        : flagged.length > 0
          ? { question: "skills_standing", verdict: "watch", citations: flagged.map(skillCite) }
          : { question: "skills_standing", verdict: "on_track", citations: movedUp.map(skillCite) };
  const nextFocus: Digest["standing"][number] =
    input.brief.entries.length > 0
      ? {
          question: "next_focus",
          verdict: "on_track",
          citations: [...new Set(input.brief.entries.map((e) => e.skill_code))].map(skillCite),
        }
      : { question: "next_focus", verdict: "nothing_recorded", citations: [] };

  const proposals: Digest["proposals"] = [];
  for (const list of ["reteach", "recheck", "new"] as const satisfies readonly BriefList[]) {
    const codes = input.brief.entries.filter((e) => e.list === list).map((e) => e.skill_code);
    if (codes.length === 0) continue;
    proposals.push({
      id: `p${proposals.length + 1}`,
      kind: "focus",
      list,
      skill_codes: codes,
      citations: codes.map(skillCite),
    });
  }

  const abouts: Digest["asks"][number]["about"][] = [];
  if (input.goals.some((g) => g.goal.status === "active" && g.skill_codes.length === 0))
    abouts.push("goal_without_skills");
  if (period.length === 0) abouts.push("no_evidence_in_period");
  const asks = abouts.map((about, i) => ({ id: `a${i + 1}`, about }));

  const digest: Digest = {
    shape: "digest/1",
    counts,
    skills_moved,
    needs_attention,
    mistakes,
    brief: input.brief,
    goals,
    standing: [skillsStanding, nextFocus],
    proposals,
    asks,
  };
  return { digest, inputs_hash: hashOf(period, skills) };
}
