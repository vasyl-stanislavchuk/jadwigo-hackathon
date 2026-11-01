/**
 * The kind line under the lesson's one fixed congratulation (`dl-uukj.30.6`, decision
 * jadwigo-learner-experience 2026-10-31-the-lesson-s-end-draws-each-answer-on-its-card-and-a-kind-summar):
 * picked by how the lesson went, never a number. No line while verdicts are held (every question
 * `done`), since the page does not know how it went.
 */

import type { PageAttemptResult } from "@jadwigo/contracts";
import type { CopyKey } from "@jadwigo/copy";

export function summaryKey(rows: readonly Pick<PageAttemptResult, "ended">[]): CopyKey | null {
  if (rows.length === 0) return null;
  if (rows.some((row) => row.ended === "missed" || row.ended === "skipped")) {
    return "play_summary_some";
  }
  if (rows.every((row) => row.ended === "correct")) return "play_summary_all";
  return null;
}
