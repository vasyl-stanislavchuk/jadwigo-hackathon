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
  ReportPatch,
  type Skills,
} from "@jadwigo/contracts";
import { brief, dreamDigest, foldLearner, goalView, resolveSkill } from "@jadwigo/core";
import type { Store } from "@jadwigo/store";
import type { Claims } from "./auth.ts";
import { authorizeMember } from "./authorize.ts";
import { ApiError, badRequest } from "./errors.ts";

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

/** `GET /api/v1/learners/{id}/skills`: folded on read from the evidence, never from the cache alone. */
export async function getLearnerSkills(
  store: Store,
  claims: Claims,
  id: LearnerId,
): Promise<LearnerSkills> {
  const { pod, learner } = await learnerOf(store, claims, id);
  const now = new Date();
  const catalogue = await store.listSkills(pod);
  const goals = await store.listGoals(pod, id);
  const evidence = await store.getLearnerEvidence(pod, id);
  const folded = foldLearner(evidence, catalogue, now);
  const made = brief(goals, catalogue, folded, now);
  const computed_at = now.toISOString();
  return {
    learner,
    skills: folded.map(({ card: _card, ...row }) => ({
      ...row,
      pod_id: pod,
      learner_id: id,
      computed_at,
    })),
    catalogue: [...catalogue],
    goals: goals.map((goal) => goalView(goal, folded, made)),
    brief: made,
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
  const { pod, learner } = await learnerOf(store, claims, id);
  return { learner, goals: [...(await store.listGoals(pod, id))] };
}

/** `POST /api/v1/learners/{id}/goals`: each code resolved to its canonical one first. */
export async function createGoal(
  store: Store,
  claims: Claims,
  id: LearnerId,
  raw: unknown,
): Promise<LearnerGoals> {
  const { pod, learner } = await learnerOf(store, claims, id);
  const parsed = GoalCreate.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const catalogue = await store.listSkills(pod);
  await store.addGoal(pod, id, {
    name: parsed.data.name,
    words: parsed.data.words ?? null,
    skill_codes: parsed.data.skill_codes.map((code) => resolveSkill(code, catalogue)),
  });
  return { learner, goals: [...(await store.listGoals(pod, id))] };
}

/** `PATCH /api/v1/learners/{id}/goals/{goal}`. */
export async function patchGoal(
  store: Store,
  claims: Claims,
  id: LearnerId,
  goal: GoalId,
  raw: unknown,
): Promise<LearnerGoals> {
  const { pod, learner } = await learnerOf(store, claims, id);
  const parsed = GoalPatch.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const { skill_codes, ...rest } = parsed.data;
  const catalogue = skill_codes === undefined ? [] : await store.listSkills(pod);
  await store.updateGoal(pod, id, goal, {
    ...rest,
    ...(skill_codes === undefined
      ? {}
      : { skill_codes: skill_codes.map((code) => resolveSkill(code, catalogue)) }),
  });
  return { learner, goals: [...(await store.listGoals(pod, id))] };
}

/** `GET /api/v1/learners/{id}/reports`: newest first. */
export async function getLearnerReports(
  store: Store,
  claims: Claims,
  id: LearnerId,
): Promise<LearnerReports> {
  const { pod, learner } = await learnerOf(store, claims, id);
  return { learner, reports: [...(await store.listReports(pod, id))] };
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
  const now = new Date();
  const catalogue = await store.listSkills(pod);
  const goals = await store.listGoals(pod, id);
  const evidence = await store.getLearnerEvidence(pod, id);
  const before = await store.getMastery(pod, id);
  const last = (await store.listReports(pod, id))[0];
  const starts_at = last?.period_ends_at ?? new Date(0).toISOString();
  const ends_at = now.toISOString();
  const after = foldLearner(evidence, catalogue, now);
  const made = brief(goals, catalogue, after, now);
  const { digest, inputs_hash } = dreamDigest({
    evidence_before: evidence.filter((e) => e.answered_at < starts_at),
    evidence_after: evidence,
    mastery_before: before,
    mastery_after: after,
    brief: made,
    goals,
    period: { starts_at, ends_at },
  });
  await store.replaceMastery(pod, id, after);
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
  return store.updateReport(pod, id, report, {
    narrative: parsed.data.narrative,
    decisions: parsed.data.decisions?.map((d) => ({ ...d, decided_by: account })),
  });
}
