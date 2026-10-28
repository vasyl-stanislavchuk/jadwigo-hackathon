/**
 * Where this tab keeps the attempt it is playing, so a reload resumes it (dl-5ssh.3.1). The id is
 * the caller's key to the attempt (decision
 * 2026-10-28-an-anonymous-attempt-is-bound-to-its-caller-by-its-id-whoever-ho), so it lives in
 * sessionStorage, one per assignment, and never in the URL or a log. A new tab starts a new attempt.
 */

import { type AssignmentId, AttemptId } from "@jadwigo/contracts";

const keyOf = (assignmentId: AssignmentId): string => `jw.play.attempt.${assignmentId}`;

export const storedAttempt = {
  get(assignmentId: AssignmentId, storage: Storage = window.sessionStorage): AttemptId | null {
    const parsed = AttemptId.safeParse(storage.getItem(keyOf(assignmentId)));
    return parsed.success ? parsed.data : null;
  },
  set(
    assignmentId: AssignmentId,
    attemptId: AttemptId,
    storage: Storage = window.sessionStorage,
  ): void {
    storage.setItem(keyOf(assignmentId), attemptId);
  },
  clear(assignmentId: AssignmentId, storage: Storage = window.sessionStorage): void {
    storage.removeItem(keyOf(assignmentId));
  },
};
