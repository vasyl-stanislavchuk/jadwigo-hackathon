/**
 * The parent's paths (dl-e8ov.2.38, dl-uukj.30.2):
 *
 *   /parent                    sign in, then the parent home
 *   /parent?claim=<assignment> the same, then keep the attempt this tab played of that assignment
 *   /parent/attempts/<attempt>?learner=<learner>
 *                              one finished lesson of the learner, question by question
 *   /parent/assignments/<assignment>
 *                              the lesson overview: every attempt the pod reads of that assignment,
 *                              against its questions (dl-uukj.30.4)
 *
 * The claim names the assignment, never the attempt: the attempt id stays in sessionStorage
 * (play/storedAttempt.ts), out of the URL. The attempt page names its learner, whose route the API
 * reads it under; without one the page asks each of the adult's learners in turn.
 */

import { AssignmentId, AttemptId, LearnerId } from "@jadwigo/contracts";

const PARENT_PATH = "/parent";
const ATTEMPTS_PATH = `${PARENT_PATH}/attempts`;
const ASSIGNMENTS_PATH = `${PARENT_PATH}/assignments`;

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

/** /parent/assignments/<assignment>, the lesson overview, with the page's language. */
export function assignmentPath({
  assignment,
  lang,
}: {
  assignment: AssignmentId;
  lang?: string | null;
}): string {
  const path = `${ASSIGNMENTS_PATH}/${assignment}`;
  return lang ? `${path}?${new URLSearchParams({ lang })}` : path;
}

/** Which parent page a path is: the home, an attempt or an assignment's overview (null for an id
 * that does not parse), or none. */
export type ParentRoute =
  | { kind: "home" }
  | { kind: "attempt"; attempt: AttemptId | null }
  | { kind: "assignment"; assignment: AssignmentId | null };

/** The id after `prefix/`, trailing slash dropped; undefined when the path is not under it. */
const idUnder = (path: string, prefix: string): string | undefined =>
  path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1).replace(/\/$/, "") : undefined;

export function parentRoute(path: string): ParentRoute | null {
  if (path === PARENT_PATH || path === `${PARENT_PATH}/`) return { kind: "home" };
  const attempt = idUnder(path, ATTEMPTS_PATH);
  if (attempt !== undefined) {
    const parsed = AttemptId.safeParse(attempt);
    return { kind: "attempt", attempt: parsed.success ? parsed.data : null };
  }
  const assignment = idUnder(path, ASSIGNMENTS_PATH);
  if (assignment !== undefined) {
    const parsed = AssignmentId.safeParse(assignment);
    return { kind: "assignment", assignment: parsed.success ? parsed.data : null };
  }
  return null;
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
