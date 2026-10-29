import {
  type Assignment,
  type AssignmentId,
  type AttemptId,
  ErrorType,
  type PodId,
} from "@jadwigo/contracts";
import type { AttemptRecord, Store } from "@jadwigo/store";
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

/** An attempt's scope, with its record as authorize() read it. */
export interface AttemptScope extends Scope {
  readonly record: AttemptRecord;
}

/**
 * Runs first on every route. The pod comes from the id; row-level security and every Store call
 * then scope to it. An attempt is bound to its caller by its id: whoever holds the attempt id may
 * read and answer it, since only the start reply carries it (decision
 * 2026-10-28-an-anonymous-attempt-is-bound-to-its-caller-by-its-id-whoever-ho). A token can
 * replace the id here later without changing a route. An attempt is read with its assignment in
 * one go (`openAttempt`), and the route goes on from that record rather than reading it again.
 *
 * An unknown id, or one another pod holds, is 404 `NotFound`: never another pod's data. An
 * assignment for `learners` starts only with a learner named; one for `anyone` starts for anyone.
 * The window (`opens_at` to `closes_at`) is the store's, at the start.
 */
export async function authorize(
  store: Store,
  caller: { readonly attempt: AttemptId },
): Promise<AttemptScope>;
export async function authorize(store: Store, caller: Caller): Promise<Scope>;
export async function authorize(store: Store, caller: Caller): Promise<Scope> {
  if ("attempt" in caller) {
    const opened = await store.openAttempt(caller.attempt);
    if (opened === undefined) throw notFound("attempt");
    return opened;
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
