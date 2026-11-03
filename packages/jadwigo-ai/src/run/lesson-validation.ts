import type { RunEvent } from "@jadwigo/contracts/run";
import { review } from "../verbs/review.ts";

/** The latest revision needs its own successful check; old checks never approve new edits. */
export function lessonValidationIssue(
  log: readonly RunEvent[],
  allowCurrentReview = false,
): string | null {
  const revision = log.filter((event) => event.type === "lesson_revision").at(-1);
  if (revision === undefined) return null;
  // Historical non-lesson revisions are outside the lesson-file protocol.
  if (!("script" in revision.payload.lesson_file)) return null;
  const checked = log
    .filter((event) => event.type === "tool_result")
    .filter((event) => event.payload.verb === "lesson_check")
    .at(-1);
  const stale =
    checked !== undefined &&
    checked.seq < revision.seq &&
    checked.payload.call_id !== revision.payload.call_id;
  if (checked === undefined || stale) {
    // Existing valid draft/edit flows use the same code check directly. Never trust an old
    // tool result: revalidate this actual revision, including a parent's intervening patch.
    if (allowCurrentReview && review(revision.payload.lesson_file).publishable) return null;
    return checked === undefined
      ? "The current lesson has not passed lesson_check."
      : "The lesson changed after its last check. Check the current revision again.";
  }
  const output = checked.payload.output;
  if (
    checked.payload.error !== null ||
    output?.["ok"] !== true ||
    output?.["publishable"] === false
  ) {
    return "The current lesson failed lesson_check. Repair the findings before presenting it as ready.";
  }
  return null;
}
