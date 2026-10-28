/**
 * Try it's one-step lesson, with the authored data standing in for the server. A commit is looked up
 * (question.ts lookUp): a scenario, the key's accepted answer or a known wrong answer gives its
 * outcome, praise or try again with its marks, and its mistake class picks the help written for it;
 * a value none of them names is not judged, and the step stays as it was. A scenario played from
 * its button gives the same state with no commit at all (playScenario). Help is released rung by
 * rung from the authored ladder (lesson-kit's help functions), rungs 3 and 4 after one real miss, and
 * rung 4 swaps in the twin. Moving on shows the solution, read from the key (lesson-kit solutionOf).
 *
 * The feedback follows the lesson's rules (the source playground's runner reducer): a miss stays on
 * the step with its answer; a right answer waits for Dalej; the worked solution comes with a right
 * answer, and after a second miss on a Choose step with no ladder.
 */

import type { Verdict } from "@jadwigo/contracts";
import {
  type FamilySpec,
  type Feedback,
  gateOpen,
  HelpRung,
  helpLeft,
  helpNext,
  type LastMiss,
  lastMissOf,
  NO_MISS,
  pageHelpOf,
  solutionLines,
  solutionOf,
} from "@jadwigo/lesson-kit";
import type { Found } from "./question.ts";

type PageHelp = ReturnType<typeof pageHelpOf>;
type SolutionLines = ReturnType<typeof solutionLines>;

/** One commit, for the owner's readout: what was committed and what the data says it is, if anything. */
export interface TryAttempt {
  /** 1 for the first commit on the step. */
  n: number;
  value: unknown;
  found: Found | null;
}

export interface TryState {
  phase: "live" | "feedback" | "solution";
  attemptNo: number;
  /** Misses on the item being answered (the twin counts from zero). */
  misses: number;
  feedback: Feedback | null;
  help: PageHelp | null;
  helpRefused: boolean;
  workedSolution: string[] | null;
  solution: unknown;
  solutionLines: SolutionLines | null;
  lastMiss: LastMiss;
  /** Rung 4 swapped in the twin: it is the item answered now. */
  onTwin: boolean;
  counts: { praise: number; try_again: number };
  attempts: TryAttempt[];
}

export const initialTry: TryState = {
  phase: "live",
  attemptNo: 1,
  misses: 0,
  feedback: null,
  help: null,
  helpRefused: false,
  workedSolution: null,
  solution: null,
  solutionLines: null,
  lastMiss: NO_MISS,
  onTwin: false,
  counts: { praise: 0, try_again: 0 },
  attempts: [],
};

/** The item being answered: the example, or its twin once rung 4 swapped it in. */
export function currentOf(spec: FamilySpec, state: TryState): FamilySpec {
  const twin = spec.help?.twin;
  return state.onTwin && twin !== undefined ? (twin as FamilySpec) : spec;
}

/** A miss as the verdict help reads its last miss from. */
function missOf(scenario: Found): Pick<Verdict, "correct" | "parts" | "mistake_class"> {
  return {
    correct: false,
    mistake_class: scenario.mistake_class,
    parts: scenario.marks.map((m) => ({
      ...m,
      mistake_class: m.correct ? null : scenario.mistake_class,
    })),
  };
}

const chooseWorked = (spec: FamilySpec): string[] | null =>
  spec.family === "choose" ? (spec.key.worked_solution ?? null) : null;

/** A commit: what the data says it is (null when nothing does, and nothing is judged). */
export function commitTry(
  spec: FamilySpec,
  state: TryState,
  value: unknown,
  found: Found | null,
): TryState {
  if (state.phase !== "live") return state;
  const attempts = [...state.attempts, { n: state.attempts.length + 1, value, found }];
  if (found === null) return { ...state, attempts };
  const current = currentOf(spec, state);
  if (found.outcome === "correct") {
    return {
      ...state,
      attempts,
      phase: "feedback",
      feedback: { kind: "praise", index: state.counts.praise },
      counts: { ...state.counts, praise: state.counts.praise + 1 },
      workedSolution: state.onTwin ? null : (spec.help?.worked ?? chooseWorked(spec)),
    };
  }
  const misses = state.misses + 1;
  return {
    ...state,
    attempts,
    phase: "live",
    feedback: {
      kind: "try_again",
      index: state.counts.try_again,
      ...(found.marks.length > 0 ? { parts: found.marks } : {}),
    },
    counts: { ...state.counts, try_again: state.counts.try_again + 1 },
    attemptNo: state.attemptNo + 1,
    misses,
    helpRefused: false,
    lastMiss: lastMissOf(current, missOf(found)),
    workedSolution:
      spec.help === undefined && misses >= 2 ? chooseWorked(current) : state.workedSolution,
  };
}

/** A scenario played from its button: the state its commit would give, with nothing committed by
 * the child. The view is seeded with its value, so it shows as if the child had answered. */
export function playScenario(spec: FamilySpec, value: unknown, found: Found): TryState {
  return commitTry(spec, initialTry, value, found);
}

/** A help request: the next rung written, rungs 3 and 4 after one real miss. */
export function askHelp(spec: FamilySpec, state: TryState): TryState {
  if (state.phase !== "live") return state;
  const rung = state.help?.rung ?? HelpRung.None;
  const to = helpNext(spec, rung, gateOpen(state.misses));
  if (to === null) return { ...state, helpRefused: true };
  const help = pageHelpOf(spec, to, state.lastMiss);
  const swapped = help.twin !== null && !state.onTwin;
  return {
    ...state,
    help,
    helpRefused: false,
    ...(swapped ? { onTwin: true, feedback: null, misses: 0, attemptNo: state.attemptNo + 1 } : {}),
  };
}

/** Whether a help request can still give something (the Help button's offer). */
export const canAskHelp = (spec: FamilySpec, state: TryState): boolean =>
  helpLeft(spec, state.help?.rung ?? HelpRung.None);

/** "Jeszcze nie wiem": the step ends on its solution, read from the key. */
export function moveOn(spec: FamilySpec, state: TryState): TryState {
  if (state.phase !== "live") return state;
  const current = currentOf(spec, state);
  const solution = current.family === "explain" ? null : solutionOf(current);
  const lines = state.onTwin ? [] : solutionLines(spec);
  return {
    ...state,
    phase: solution === null ? "feedback" : "solution",
    feedback: { kind: "moved_on", index: 0 },
    solution,
    solutionLines: lines.length > 0 ? lines : null,
  };
}

/** Dalej shows after a right answer and under a solution, never after a miss. */
export const nextVisible = (state: TryState): boolean =>
  state.phase === "solution" || (state.phase === "feedback" && state.feedback?.kind === "praise");
