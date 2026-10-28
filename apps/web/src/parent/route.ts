/**
 * The parent's path (dl-e8ov.2.38):
 *
 *   /parent                    sign in, then the parent home
 *   /parent?claim=<assignment> the same, then keep the attempt this tab played of that assignment
 *
 * The claim names the assignment, never the attempt: the attempt id stays in sessionStorage
 * (play/storedAttempt.ts), out of the URL.
 */

import { AssignmentId } from "@jadwigo/contracts";

export const PARENT_PATH = "/parent";

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

/** The assignment `?claim` names, or null. */
export function claimOf(query: URLSearchParams): AssignmentId | null {
  const parsed = AssignmentId.safeParse(query.get("claim"));
  return parsed.success ? parsed.data : null;
}
