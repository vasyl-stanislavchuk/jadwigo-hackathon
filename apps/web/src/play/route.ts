/**
 * The player's paths (dl-5ssh.3.1, dl-uukj.30.1):
 *
 *   /                                  opens the featured lesson
 *   /play/<assignment id>              plays that assignment; a reload resumes the tab's attempt
 *   /play/<assignment id>/review/<seq> once it is finished, that question again, from the end list
 *
 * Moving around uses the app's pushState helpers (src/nav/location.ts), so both share one
 * live URL.
 */

import { AssignmentId } from "@jadwigo/contracts";

export interface PlayRoute {
  assignmentId: AssignmentId | null;
  /** The question a review path opens, by its seq; absent on the lesson's own path. */
  review?: number;
}

/** The assignment a /play path names, or null when the path is not one. A malformed id, or one
 * whose percent-encoding does not decode, is a player path with no lesson in it:
 * `{ assignmentId: null }`. A review path whose seq is not a whole number above 0 opens the list. */
export function playRoute(path: string): PlayRoute | null {
  const match = path.match(/^\/play\/([^/]+)(?:\/review\/([^/]+))?\/?$/);
  if (match?.[1] === undefined) return null;
  let raw: string;
  try {
    raw = decodeURIComponent(match[1]);
  } catch {
    return { assignmentId: null };
  }
  const parsed = AssignmentId.safeParse(raw);
  if (!parsed.success) return { assignmentId: null };
  const seq = match[2] === undefined || !/^[1-9]\d*$/.test(match[2]) ? null : Number(match[2]);
  return seq === null ? { assignmentId: parsed.data } : { assignmentId: parsed.data, review: seq };
}

export const playPath = (assignmentId: AssignmentId): string => `/play/${assignmentId}`;

export const reviewPath = (assignmentId: AssignmentId, seq: number): string =>
  `${playPath(assignmentId)}/review/${seq}`;
