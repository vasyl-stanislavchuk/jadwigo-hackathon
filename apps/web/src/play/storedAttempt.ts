/**
 * Where this tab keeps the attempt it is playing, so a reload resumes it (dl-5ssh.3.1). The id is
 * the caller's key to the attempt (decision
 * 2026-10-28-an-anonymous-attempt-is-bound-to-its-caller-by-its-id-whoever-ho), so it lives in
 * sessionStorage, one per assignment and learner, and never in the URL or a log. A new tab starts a new
 * attempt. A play link's learner (`?learner=`, dl-1u6fn.5) has a key of its own, so 2 siblings'
 * links in one tab never resume each other's attempt; no learner is the anonymous attempt's key.
 */

import { type AssignmentId, AttemptId, type LearnerId } from "@jadwigo/contracts";

const keyOf = (assignmentId: AssignmentId, learner: LearnerId | null): string =>
  learner === null
    ? `jw.play.attempt.${assignmentId}`
    : `jw.play.attempt.${assignmentId}.${learner}`;

export const storedAttempt = {
  get(
    assignmentId: AssignmentId,
    learner: LearnerId | null = null,
    storage: Storage = window.sessionStorage,
  ): AttemptId | null {
    const parsed = AttemptId.safeParse(storage.getItem(keyOf(assignmentId, learner)));
    return parsed.success ? parsed.data : null;
  },
  set(
    assignmentId: AssignmentId,
    attemptId: AttemptId,
    learner: LearnerId | null = null,
    storage: Storage = window.sessionStorage,
  ): void {
    storage.setItem(keyOf(assignmentId, learner), attemptId);
  },
  clear(
    assignmentId: AssignmentId,
    learner: LearnerId | null = null,
    storage: Storage = window.sessionStorage,
  ): void {
    storage.removeItem(keyOf(assignmentId, learner));
  },
};
