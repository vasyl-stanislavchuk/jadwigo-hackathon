/**
 * When the queen plays (dl-7wlo.40): once a lesson, at the praise for the third question in a row
 * the child got right on the first try with no help. The count is never shown (the no-streak
 * charter), so it is derived from the questions asked rather than kept: a reload past that question
 * never plays her again. A held verdict never says "correct", so she never gives one away.
 */

import type { PageAttemptQuestion } from "@jadwigo/contracts";
import type { RunnerState } from "./runner.ts";

const RUN = 3;

/** The seq of the question that ends the attempt's first run of three clean rights, or null. */
export function queenSeq(questions: readonly PageAttemptQuestion[]): number | null {
  let run = 0;
  for (const q of questions) {
    if (q.ended === null) continue;
    run = q.ended === "correct" && q.tries === 1 && q.help.length === 0 ? run + 1 : 0;
    if (run === RUN) return q.seq;
  }
  return null;
}

/** Whether the praise on screen is the one she plays at. */
export function queenDue(state: RunnerState): boolean {
  return (
    state.phase === "feedback" && state.seq !== null && queenSeq(state.questions) === state.seq
  );
}
