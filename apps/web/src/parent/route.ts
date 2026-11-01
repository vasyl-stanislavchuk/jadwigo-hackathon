/**
 * The parent's paths (dl-e8ov.2.38, dl-uukj.30.2):
 *
 *   /parent                    sign in, then "Lekcje / Nowa lekcja", the parent app's first screen
 *   /parent/lessons            the family's lessons (dl-xo0q; its table waits on dl-z5ja.106)
 *   /parent/history            every attempt, newest first (its table waits on dl-z5ja.106.1)
 *   /parent/children/<learner> one child's page (dl-uukj.47.3)
 *   /parent?claim=<assignment> the same, then keep the attempt this tab played of that assignment
 *   /parent?for=<learner>      the first screen with "Dla" set to that child (dl-uukj.47.2)
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
import type { Provider } from "../config.ts";

const PARENT_PATH = "/parent";
const ATTEMPTS_PATH = `${PARENT_PATH}/attempts`;
const ASSIGNMENTS_PATH = `${PARENT_PATH}/assignments`;
const LESSONS_PATH = `${PARENT_PATH}/lessons`;
const HISTORY_PATH = `${PARENT_PATH}/history`;
const CHILDREN_PATH = `${PARENT_PATH}/children`;

/** A path with the page's language, when there is one. */
const withLang = (path: string, lang: string | null | undefined): string =>
  lang ? `${path}?${new URLSearchParams({ lang })}` : path;

/** /parent/lessons, the family's lessons. */
export const lessonsPath = ({ lang }: { lang?: string | null } = {}): string =>
  withLang(LESSONS_PATH, lang);

/** /parent/history, every attempt. */
export const historyPath = ({ lang }: { lang?: string | null } = {}): string =>
  withLang(HISTORY_PATH, lang);

/** /parent/children/<learner>, one child's page. */
export const childPath = ({
  learner,
  lang,
}: {
  learner: LearnerId;
  lang?: string | null;
}): string => withLang(`${CHILDREN_PATH}/${learner}`, lang);

/** /parent, with the assignment whose attempt to keep, the child a new lesson is for, and the page's
 * language. */
export function parentPath({
  claim,
  forLearner,
  lang,
}: {
  claim?: AssignmentId | null;
  forLearner?: LearnerId | null;
  lang?: string | null;
} = {}): string {
  const query = new URLSearchParams();
  if (claim) query.set("claim", claim);
  if (forLearner) query.set("for", forLearner);
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
  return withLang(`${ASSIGNMENTS_PATH}/${assignment}`, lang);
}

/** Which parent page a path is: the home (the first screen), the lessons, the history, a child, an
 * attempt or an assignment's overview (null for an id that does not parse), or none. */
export type ParentRoute =
  | { kind: "home" }
  | { kind: "lessons" }
  | { kind: "history" }
  | { kind: "child"; learner: LearnerId | null }
  | { kind: "attempt"; attempt: AttemptId | null }
  | { kind: "assignment"; assignment: AssignmentId | null };

/** The id after `prefix/`, trailing slash dropped; undefined when the path is not under it. */
const idUnder = (path: string, prefix: string): string | undefined =>
  path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1).replace(/\/$/, "") : undefined;

export function parentRoute(path: string): ParentRoute | null {
  const bare = path.replace(/\/$/, "");
  if (bare === PARENT_PATH) return { kind: "home" };
  if (bare === LESSONS_PATH) return { kind: "lessons" };
  if (bare === HISTORY_PATH) return { kind: "history" };
  const child = idUnder(path, CHILDREN_PATH);
  if (child !== undefined) {
    const parsed = LearnerId.safeParse(child);
    return { kind: "child", learner: parsed.success ? parsed.data : null };
  }
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

/** The child `?for` names as the new lesson's ("Dla", dl-uukj.47.2), or null. */
export function forOf(query: URLSearchParams): LearnerId | null {
  const parsed = LearnerId.safeParse(query.get("for"));
  return parsed.success ? parsed.data : null;
}

/** The learner `?learner` names, or null. */
export function learnerOf(query: URLSearchParams): LearnerId | null {
  const parsed = LearnerId.safeParse(query.get("learner"));
  return parsed.success ? parsed.data : null;
}

/**
 * The sign-in jadwigo.pl/zaloguj hands over (dl-5ssh.4.2): `?provider=google|facebook` starts that
 * provider, `?email=` fills the field and sends the code. Anything else is ignored.
 */
export function providerOf(query: URLSearchParams): Provider | null {
  const named = query.get("provider");
  return named === "google" || named === "facebook" ? named : null;
}

/** The address `?email` names, when it looks like one; the auth service checks it for real. */
export function emailOf(query: URLSearchParams): string | null {
  const email = query.get("email")?.trim() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}
