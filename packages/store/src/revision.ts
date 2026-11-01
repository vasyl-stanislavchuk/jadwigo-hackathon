import { ErrorType, type RunId } from "@jadwigo/contracts";
import type { NewLessonRevision } from "./run.ts";
import { StoreError } from "./store.ts";

/**
 * `appendLessonRevision`'s refusals before anything is read (dl-z5ja.134), the same on both
 * stores: a run with no conversation, an event of another run, or a revision that is not the
 * expected one plus 1.
 */
export function checkRevision(
  conversation: string | null,
  run: RunId,
  expected: number,
  event: NewLessonRevision,
): void {
  if (conversation === null)
    throw new StoreError(ErrorType.enum.BadRequest, "a lesson revision needs a conversation's run");
  if (event.run_id !== run)
    throw new StoreError(ErrorType.enum.BadRequest, "an event belongs to another run");
  if (!Number.isInteger(expected) || expected < 0 || event.payload.revision !== expected + 1)
    throw new StoreError(ErrorType.enum.BadRequest, "a lesson revision is the expected one plus 1");
}
