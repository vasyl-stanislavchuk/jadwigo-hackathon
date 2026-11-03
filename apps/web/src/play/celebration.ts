/**
 * When a celebration plays (dl-7wlo.40, dl-7wlo.43): at the praise for the third question in a row
 * the child got right on the first try with no help, and at most twice a lesson. A miss, help, a
 * skip or a held verdict starts the count again, and so does a celebration: the second needs three
 * more clean rights after the first. The count is never shown (the no-streak charter), so it is
 * derived from the questions asked rather than kept: a reload past that question never plays it
 * again. A held verdict never says "correct", so it never gives one away.
 *
 * Who plays (the owner, 2026-11-03): the queen or Pani Iwona, the first picked at random, the
 * second the other one.
 */

import type { PageAttemptQuestion } from "@jadwigo/contracts";
import type { RunnerState } from "./runner.ts";

const RUN = 3;
const MOST = 2;

export type Cast = "queen" | "iwona";

/** The seqs of the questions that end the attempt's runs of three clean rights, at most two. */
export function celebrationSeqs(questions: readonly PageAttemptQuestion[]): number[] {
  const seqs: number[] = [];
  let run = 0;
  for (const q of questions) {
    if (q.ended === null) continue;
    run = q.ended === "correct" && q.tries === 1 && q.help.length === 0 ? run + 1 : 0;
    if (run === RUN) {
      seqs.push(q.seq);
      if (seqs.length === MOST) break;
      run = 0;
    }
  }
  return seqs;
}

/** The celebration due at the praise on screen, first (0) or second (1), or null. */
export function celebrationDue(state: RunnerState): number | null {
  if (state.phase !== "feedback" || state.seq === null) return null;
  const at = celebrationSeqs(state.questions).indexOf(state.seq);
  return at === -1 ? null : at;
}

/** A coin for the first celebration; `draw` is a number in [0, 1), Math.random's. */
export function firstCast(draw: number): Cast {
  return draw < 0.5 ? "queen" : "iwona";
}

/** Who plays the celebration at `index`: the first cast, then the other one. */
export function castOf(index: number, first: Cast): Cast {
  if (index === 0) return first;
  return first === "queen" ? "iwona" : "queen";
}
