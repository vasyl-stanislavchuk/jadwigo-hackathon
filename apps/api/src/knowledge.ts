import {
  type AccountId,
  ErrorType,
  GoalCreate,
  type GoalId,
  GoalPatch,
  type Learner,
  type LearnerGoals,
  type LearnerId,
  type LearnerReport,
  type LearnerReportId,
  type LearnerReports,
  type LearnerSkills,
  type PodId,
  ReportCreate,
  type ReportNarrative,
  ReportPatch,
  type Skills,
} from "@jadwigo/contracts";
import { brief, dreamDigest, foldLearner, goalView, resolveSkill } from "@jadwigo/core";
import type { Store } from "@jadwigo/store";
import type { Claims } from "./auth.ts";
import { authorizeMember } from "./authorize.ts";
import { ApiError, badRequest } from "./errors.ts";
import { rebuildAfter } from "./mastery.ts";
import { narrativeProblems } from "./narrative.ts";

/**
 * The learner knowledge base's routes (wave 1 of epic dl-e8ov.5): a learner of the caller's pod,
 * its skills, goals and reports. Step 0 lands them on the Store seam and core's stubs; the
 * store-api lane fills what the stubs leave out. Code computes every level, list and digest
 * (packages/core); a route only reads, folds and writes.
 */

/** The caller's pod and account, and the learner the path names in it; another pod's is 404. */
async function learnerOf(
  store: Store,
  claims: Claims,
  id: LearnerId,
): Promise<{ pod: PodId; account: AccountId; learner: Learner }> {
  const { pod, account } = await authorizeMember(store, claims);
  const me = await store.getMe(pod, account);
  const learner = me.learners.find((l) => l.learner.id === id)?.learner;
  if (!learner) throw new ApiError(ErrorType.enum.NotFound, "no such learner");
  return { pod, account, learner };
}

/**
 * A learner's catalogue, goals, folded mastery and brief, read and folded in one go: the fold
 * reads the evidence, never the cache alone.
 */
async function folded(store: Store, pod: PodId, id: LearnerId, now: Date) {
  const catalogue = await store.listSkills(pod);
  const goals = await store.listGoals(pod, id);
  const evidence = await store.getLearnerEvidence(pod, id);
  const mastery = foldLearner(evidence, catalogue, now);
  const made = brief(goals, catalogue, mastery, now);
  const views = goals.map((goal) => goalView(goal, mastery, made));
  return { catalogue, goals, evidence, mastery, brief: made, views };
}

/** `GET /api/v1/learners/{id}/skills`: folded on read from the evidence, never from the cache alone. */
export async function getLearnerSkills(
  store: Store,
  claims: Claims,
  id: LearnerId,
): Promise<LearnerSkills> {
  const { pod, learner } = await learnerOf(store, claims, id);
  const now = new Date();
  const read = await folded(store, pod, id, now);
  const computed_at = now.toISOString();
  return {
    learner,
    skills: read.mastery.map(({ card: _card, ...row }) => ({
      ...row,
      pod_id: pod,
      learner_id: id,
      computed_at,
    })),
    catalogue: [...read.catalogue],
    goals: read.views,
    brief: read.brief,
  };
}

/** `GET /api/v1/skills`: the catalogue the caller's pod reads. */
export async function listSkills(store: Store, claims: Claims): Promise<Skills> {
  const { pod } = await authorizeMember(store, claims);
  return { skills: [...(await store.listSkills(pod))] };
}

/** `GET /api/v1/learners/{id}/goals`: oldest first. */
export async function getLearnerGoals(
  store: Store,
  claims: Claims,
  id: LearnerId,
): Promise<LearnerGoals> {
  const { pod } = await learnerOf(store, claims, id);
  return { goals: (await folded(store, pod, id, new Date())).views };
}

/** `POST /api/v1/learners/{id}/goals`: each code resolved to its canonical one first. */
export async function createGoal(
  store: Store,
  claims: Claims,
  id: LearnerId,
  raw: unknown,
): Promise<LearnerGoals> {
  const { pod } = await learnerOf(store, claims, id);
  const parsed = GoalCreate.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const catalogue = await store.listSkills(pod);
  await store.addGoal(pod, id, {
    name: parsed.data.name,
    // Lessons are in Polish only for now, so a goal's lessons are Polish whatever the pod's
    // language (jadwigo-hackathon/decisions/2026-10-29-lessons-are-in-polish-only-for-now-other-lesson-languages-are-pa).
    lesson_language: "pl",
    // An empty `words` is none: the column refuses an empty string.
    words: parsed.data.words || null,
    skill_codes: parsed.data.skill_codes.map((code) => resolveSkill(code, catalogue)),
  });
  // A new goal's skills join the fold. A fold that fails is logged and never refuses the goal.
  await rebuildAfter(store, id, new Date());
  return { goals: (await folded(store, pod, id, new Date())).views };
}

/** `PATCH /api/v1/learners/{id}/goals/{goal}`. */
export async function patchGoal(
  store: Store,
  claims: Claims,
  id: LearnerId,
  goal: GoalId,
  raw: unknown,
): Promise<LearnerGoals> {
  const { pod } = await learnerOf(store, claims, id);
  const parsed = GoalPatch.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const { skill_codes, status } = parsed.data;
  const catalogue = skill_codes === undefined ? [] : await store.listSkills(pod);
  await store.updateGoal(pod, id, goal, {
    status,
    ...(skill_codes === undefined
      ? {}
      : { skill_codes: skill_codes.map((code) => resolveSkill(code, catalogue)) }),
  });
  return { goals: (await folded(store, pod, id, new Date())).views };
}

/** `GET /api/v1/learners/{id}/reports`: newest first. */
export async function getLearnerReports(
  store: Store,
  claims: Claims,
  id: LearnerId,
): Promise<LearnerReports> {
  const { pod } = await learnerOf(store, claims, id);
  return { reports: [...(await store.listReports(pod, id))] };
}

/**
 * `POST /api/v1/learners/{id}/reports`: code's digest over the evidence since the last report.
 * The fold, the brief and the digest run before anything is written; the mastery cache is
 * replaced with the fold, and when the inputs are the last report's, the new one is its copy,
 * `reused: true`.
 */
export async function createReport(
  store: Store,
  claims: Claims,
  id: LearnerId,
  raw: unknown,
): Promise<LearnerReport> {
  const { pod } = await learnerOf(store, claims, id);
  const parsed = ReportCreate.safeParse(raw ?? {});
  if (!parsed.success) throw badRequest(parsed.error.issues);
  return makeReport(store, pod, id, new Date());
}

/**
 * A report on a learner of `pod` over the evidence since its last report: the folds, the brief and
 * the digest run before anything is written, then the mastery cache is replaced with the fold and
 * the report written. `createReport` and the dream script (`src/dream.ts`) both call it.
 */
export async function makeReport(
  store: Store,
  pod: PodId,
  id: LearnerId,
  now: Date,
): Promise<LearnerReport> {
  const last = (await store.listReports(pod, id))[0];
  const read = await folded(store, pod, id, now);
  const ends_at = now.toISOString();
  // The period runs from the last report's end, or the learner's first evidence, to now. The
  // digest replays it: `before` is the fold of what was answered before it starts, `after` the
  // fold of everything, whatever the cache held.
  const starts_at = last?.period_ends_at ?? read.evidence[0]?.answered_at ?? ends_at;
  const earlier = read.evidence.filter((e) => e.answered_at < starts_at);
  const { digest, inputs_hash } = dreamDigest({
    evidence_before: earlier,
    evidence_after: read.evidence,
    mastery_before: foldLearner(earlier, read.catalogue, now),
    mastery_after: read.mastery,
    brief: read.brief,
    goals: read.goals,
    period: { starts_at, ends_at },
  });
  await store.replaceMastery(pod, id, read.mastery);
  const reused = last !== undefined && last.inputs_hash === inputs_hash;
  return store.putReport(pod, {
    learner_id: id,
    period_starts_at: starts_at,
    period_ends_at: ends_at,
    inputs_hash,
    reused,
    digest: reused ? last.digest : digest,
  });
}

/** `PATCH /api/v1/learners/{id}/reports/{report}`: the narrative once, or the parent's decisions. */
export async function patchReport(
  store: Store,
  claims: Claims,
  id: LearnerId,
  report: LearnerReportId,
  raw: unknown,
): Promise<LearnerReport> {
  const { pod, account } = await learnerOf(store, claims, id);
  const parsed = ReportPatch.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  if (parsed.data.narrative !== undefined) {
    await checkNarrative(store, pod, id, report, parsed.data.narrative);
  }
  return store.updateReport(pod, id, report, {
    narrative: parsed.data.narrative,
    decisions: parsed.data.decisions?.map((d) => ({ ...d, decided_by: account })),
  });
}

/**
 * Refuses a narrative its report's digest does not hold up (`narrativeProblems`), `BadRequest`
 * with every problem named. A report outside the learner's newest `LIMITS.reportsPerLearner` is
 * `NotFound`: a narrative is written soon after its report.
 */
export async function checkNarrative(
  store: Store,
  pod: PodId,
  id: LearnerId,
  report: LearnerReportId,
  narrative: ReportNarrative,
): Promise<void> {
  const stored = (await store.listReports(pod, id)).find((r) => r.id === report);
  if (stored === undefined) throw new ApiError(ErrorType.enum.NotFound, "no such report");
  const problems = narrativeProblems(narrative, stored.digest);
  if (problems.length > 0) {
    throw new ApiError(
      ErrorType.enum.BadRequest,
      `the narrative does not hold: ${problems.join("; ")}`,
    );
  }
}
