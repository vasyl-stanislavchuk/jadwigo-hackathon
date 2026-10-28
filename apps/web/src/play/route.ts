/**
 * The player's paths (dl-5ssh.3.1):
 *
 *   /                       opens the featured lesson
 *   /play/<assignment id>   plays that assignment; a reload resumes the tab's attempt
 *
 * Moving around uses the playground's pushState helpers (playground/route.ts), so both share one
 * live URL.
 */

import { AssignmentId } from "@jadwigo/contracts";

/** The assignment a /play path names, or null when the path is not one. A malformed id is a
 * player path with no lesson in it: `{ assignmentId: null }`. */
export function playRoute(path: string): { assignmentId: AssignmentId | null } | null {
  const match = path.match(/^\/play\/([^/]+)\/?$/);
  if (match?.[1] === undefined) return null;
  const parsed = AssignmentId.safeParse(decodeURIComponent(match[1]));
  return { assignmentId: parsed.success ? parsed.data : null };
}

export const playPath = (assignmentId: AssignmentId): string => `/play/${assignmentId}`;
