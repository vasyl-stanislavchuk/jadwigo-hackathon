import {
  type Assignment,
  type AssignmentId,
  type AttemptId,
  ErrorType,
  type PodId,
} from "@jadwigo/contracts";
import type { MemberScope, Store } from "@jadwigo/store";
import type { Claims } from "./auth.ts";
import { ApiError } from "./errors.ts";

/**
 * What a request asks to touch: an assignment it starts an attempt on, or an attempt it plays.
 * `learner` is the learner a start names, if any.
 */
export type Caller =
  | { readonly assignment: AssignmentId; readonly learner: boolean }
  | { readonly attempt: AttemptId };

export interface Scope {
  readonly pod: PodId;
  readonly assignment: Assignment;
}

/**
 * Runs first on every route. The pod comes from the id; row-level security and every Store call
 * then scope to it. An attempt is bound to its caller by its id: whoever holds the attempt id may
 * read and answer it, since only the start reply carries it (decision
 * 2026-10-28-an-anonymous-attempt-is-bound-to-its-caller-by-its-id-whoever-ho). A token can
 * replace the id here later without changing a route.
 *
 * An unknown id, or one another pod holds, is 404 `NotFound`: never another pod's data. An
 * assignment for `learners` starts only with a learner named; one for `anyone` starts for anyone.
 * The window (`opens_at` to `closes_at`) is the store's, at the start.
 */
export async function authorize(store: Store, caller: Caller): Promise<Scope> {
  if ("attempt" in caller) {
    const pod = await store.findAttemptPod(caller.attempt);
    if (pod === undefined) throw notFound("attempt");
    const { attempt } = await store.getAttempt(pod, caller.attempt);
    return { pod, assignment: await store.getAssignment(pod, attempt.assignment_id) };
  }
  const pod = await store.findAssignmentPod(caller.assignment);
  if (pod === undefined) throw notFound("assignment");
  const assignment = await store.getAssignment(pod, caller.assignment);
  if (assignment.audience === "learners" && !caller.learner)
    throw new ApiError(
      ErrorType.enum.BadRequest,
      "this assignment is for a pod's learners: name one",
    );
  return { pod, assignment };
}

function notFound(what: string): ApiError {
  return new ApiError(ErrorType.enum.NotFound, `no such ${what}`);
}

/**
 * A token route's scope, by the member rows: the pod and account of the signed-in user the
 * verified token names. Before the first sign-in has made an account it is 409 `AccountMissing`:
 * `POST /api/v1/accounts` comes first. Every read after it is scoped to that pod, so another pod's
 * learner or attempt list is 404.
 */
export async function authorizeMember(store: Store, claims: Claims): Promise<MemberScope> {
  const member = await store.findMember(claims.sub);
  if (member === undefined)
    throw new ApiError(
      ErrorType.enum.AccountMissing,
      "sign in once more: this user has no account",
    );
  return member;
}
