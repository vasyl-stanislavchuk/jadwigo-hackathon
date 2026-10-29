/**
 * The parent's paths (dl-e8ov.2.38, dl-uukj.30.2):
 *
 *   /parent                    sign in, then the parent home
 *   /parent?claim=<assignment> the same, then keep the attempt this tab played of that assignment
 *   /parent/attempts/<attempt>?learner=<learner>
 *                              one finished lesson of the learner, question by question
 *
 * The claim names the assignment, never the attempt: the attempt id stays in sessionStorage
 * (play/storedAttempt.ts), out of the URL. The attempt page names its learner, whose route the API
 * reads it under; without one the page asks each of the adult's learners in turn.
 */

import { AssignmentId, AttemptId, LearnerId } from "@jadwigo/contracts";

const PARENT_PATH = "/parent";
const ATTEMPTS_PATH = `${PARENT_PATH}/attempts`;

/** /parent, with the assignment whose attempt to keep and the page's language. */
export function parentPath({
  claim,
  lang,
}: {
  claim?: AssignmentId | null;
  lang?: string | null;
} = {}): string {
  const query = new URLSearchParams();
  if (claim) query.set("claim", claim);
  if (lang) query.set("lang", lang);
  return query.size > 0 ? `${PARENT_PATH}?${query}` : PARENT_PATH;
}

/** /parent/attempts/<attempt>, with its learner and the page's language. */
export function attemptPath({
  attempt,
  learner,
  lang,
}: {
  attempt: AttemptId;
  learner?: LearnerId | null;
  lang?: string | null;
}): string {
  const query = new URLSearchParams();
  if (learner) query.set("learner", learner);
  if (lang) query.set("lang", lang);
  const path = `${ATTEMPTS_PATH}/${attempt}`;
  return query.size > 0 ? `${path}?${query}` : path;
}

/** Which parent page a path is: the home, an attempt (null for an id that does not parse), or none. */
export type ParentRoute = { kind: "home" } | { kind: "attempt"; attempt: AttemptId | null };

export function parentRoute(path: string): ParentRoute | null {
  if (path === PARENT_PATH || path === `${PARENT_PATH}/`) return { kind: "home" };
  if (!path.startsWith(`${ATTEMPTS_PATH}/`)) return null;
  const parsed = AttemptId.safeParse(path.slice(ATTEMPTS_PATH.length + 1).replace(/\/$/, ""));
  return { kind: "attempt", attempt: parsed.success ? parsed.data : null };
}

/** Whether the path is one of the parent's pages, for the app's router. */
export function isParentPath(path: string): boolean {
  return parentRoute(path) !== null;
}

/** The assignment `?claim` names, or null. */
export function claimOf(query: URLSearchParams): AssignmentId | null {
  const parsed = AssignmentId.safeParse(query.get("claim"));
  return parsed.success ? parsed.data : null;
}

/** The learner `?learner` names, or null. */
export function learnerOf(query: URLSearchParams): LearnerId | null {
  const parsed = LearnerId.safeParse(query.get("learner"));
  return parsed.success ? parsed.data : null;
}
