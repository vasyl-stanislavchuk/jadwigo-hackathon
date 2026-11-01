import {
  AccountCreate,
  type AssignmentAttempts,
  type AssignmentId,
  AttemptClaim,
  type AttemptId,
  type Claim,
  ErrorType,
  type LearnerAttempts,
  LearnerCreate,
  type LearnerId,
  type LearnerSnapshot,
  type Me,
  type Pod,
  type PodId,
  PodPatch,
} from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";
import type { Claims } from "./auth.ts";
import { authorizeMember } from "./authorize.ts";
import { ApiError, badRequest } from "./errors.ts";
import { learnerFed, rebuildAfter } from "./mastery.ts";

/** Before the first sign-in has made an account. */
const NO_ACCOUNT: Me = { account: null, member: null, pod: null, learners: [] };

/** `GET /api/v1/me`: the caller's pod, account, member row and learners, or nothing yet. */
export async function getMe(store: Store, claims: Claims): Promise<Me> {
  const member = await store.findMember(claims.sub);
  return member ? store.getMe(member.pod, member.account) : NO_ACCOUNT;
}

/**
 * `POST /api/v1/accounts`: the first sign-in makes the pod, the account and a `parent` member in
 * one unit. Idempotent per signed-in user: a 2nd call makes nothing and returns the same `Me`.
 */
export async function createAccount(store: Store, claims: Claims, raw: unknown): Promise<Me> {
  const parsed = AccountCreate.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const member = await store.createAccount(claims.sub, parsed.data.language);
  return store.getMe(member.pod, member.account);
}

/**
 * `PATCH /api/v1/pods/{id}`: the parent gives or withdraws the pod's consent to the AI
 * (dl-z5ja.112). Only the caller's own pod: another pod's id is 404, as row-level security answers.
 */
export async function patchPod(
  store: Store,
  claims: Claims,
  id: PodId,
  raw: unknown,
): Promise<Pod> {
  const { pod } = await authorizeMember(store, claims);
  if (id !== pod) throw new ApiError(ErrorType.enum.NotFound, "no such pod");
  const parsed = PodPatch.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  return store.setAiConsent(pod, parsed.data.ai_consented);
}

/** `POST /api/v1/learners`: a child, with up to 5 goal stubs, in the caller's pod. */
export async function createLearner(
  store: Store,
  claims: Claims,
  raw: unknown,
): Promise<LearnerSnapshot> {
  const { pod } = await authorizeMember(store, claims);
  const parsed = LearnerCreate.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const { first_name, age_group, goals } = parsed.data;
  return store.addLearner(pod, { first_name, age_group, goals: goals?.map((g) => g.name) });
}

/**
 * `POST /api/v1/attempts/{id}/claims`: the tab's anonymous attempt gets a learner of the caller's
 * pod, by the token's account. The attempt id alone does not authorize it: the store finds the
 * attempt wherever it was played, and the learner and account must be the caller's.
 */
export async function claimAttempt(
  store: Store,
  claims: Claims,
  id: AttemptId,
  raw: unknown,
): Promise<Claim> {
  const { pod, account } = await authorizeMember(store, claims);
  const parsed = AttemptClaim.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const attempt = await store.claimAttempt(pod, {
    attempt: id,
    learner: parsed.data.learner_id,
    account,
  });
  if (!attempt.learner_id || !attempt.claimed_by || !attempt.claimed_at)
    throw new ApiError(ErrorType.enum.AttemptClaimed, "this attempt has no claim");
  // The claimed attempt's evidence joins the learner's mastery. A rebuild that fails is logged
  // and never refuses the claim.
  const learner = learnerFed(attempt);
  if (learner !== undefined) await rebuildAfter(store, learner, new Date());
  return {
    attempt_id: attempt.id,
    learner_id: attempt.learner_id,
    claimed_by: attempt.claimed_by,
    claimed_at: attempt.claimed_at,
  };
}

/** `GET /api/v1/learners/{id}/attempts`: a learner of the caller's pod and its attempts, newest first. */
export async function getLearnerAttempts(
  store: Store,
  claims: Claims,
  id: LearnerId,
): Promise<LearnerAttempts> {
  const { pod } = await authorizeMember(store, claims);
  return store.getLearnerAttempts(pod, id);
}

/**
 * `GET /api/v1/assignments/{id}/attempts`: the lesson overview, the assignment's attempts the
 * caller's pod reads with their full `attempt_result` rows (never `pageAttemptResult`'s: they are
 * the parent's). Another pod's assignment, with none of its attempts claimed here, is 404.
 */
export async function getAssignmentAttempts(
  store: Store,
  claims: Claims,
  id: AssignmentId,
): Promise<AssignmentAttempts> {
  const { pod } = await authorizeMember(store, claims);
  return store.getAssignmentAttempts(pod, id);
}
