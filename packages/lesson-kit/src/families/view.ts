/**
 * What every family view takes (dl-w3.37.12), one component per family drawing the step in each
 * render mode (docs/18 §8a, after ClassTime's modes in classtime-data-model.md §4):
 * - play: the learner answers. Never given the key. After the step ends without a right answer the
 *   runner passes `solution` and the view turns into its solution view, with the learner's own
 *   answer still on it (owner, 2026-10-12).
 * - solution: the learner's answer next to the right one, in the same layout, for the learner.
 * - review: the same for a parent, from the key and the verdict. The view draws the marks; the
 *   panel around it names the mistake classes and the latency.
 * - preview: inert, for an author. The key is drawn only when asked.
 * - print: static, for paper, where the question type prints.
 * The props are a union on `mode`, so a play view cannot be handed a key.
 */

import type { CopyKey } from "@jadwigo/copy";
import type {
  HelpOffer,
  LessonProgress,
  MoveOnOffer,
  NextOffer,
  StepShellProps,
} from "../parts/StepShell.tsx";
import type { Clock, Instant } from "../stage/clock.ts";
import type { Category, Feedback, Language, PageSolutionLine } from "../stage/types.ts";
import { solutionOf } from "./answer.ts";
import type {
  FamilyName,
  FamilySpec,
  FamilyValue,
  PageFamilySpec,
  SpecOf,
  Verdict,
} from "./types.ts";

export const ViewMode = {
  Play: "play",
  Solution: "solution",
  Review: "review",
  Preview: "preview",
  Print: "print",
} as const;
export type ViewModeName = (typeof ViewMode)[keyof typeof ViewMode];

export type PageSpecOf<F extends FamilyName> = Extract<PageFamilySpec, { family: F }>;
type KeyOf<F extends FamilyName> = SpecOf<F>["key"];

interface FamilyCommit<V> {
  value: V;
  t1: Instant;
  modality: "click" | "keyboard";
}

interface Common<F extends FamilyName> {
  spec: PageSpecOf<F>;
  language: Language;
  category: Category;
  clock: Clock;
}

/** What the runner adds around the answer (docs/17 §2f): whether the answer is on its way to the
 * judge, the help note (families/help.ts), moving on and the lesson's progress. A view drawn
 * without a runner (its own tests) has none of them. */
export interface StepContext {
  checking: boolean;
  moveOn: MoveOnOffer | null;
  ladder?: HelpOffer | null | undefined;
  /** Dalej after a verdict (runner/moveOn.ts nextVisible, dl-w3.68.32): the shell draws it where
   * Check was. */
  next?: NextOffer | null | undefined;
  progress?: LessonProgress | null | undefined;
  /**
   * The server's soft ask on a value about to be committed (`packages/core`, Enter
   * addendum 3.4): a copy key to show as the "checked too soon" line, with nothing marked and
   * nothing recorded, or null to commit. The judge runs first, so it never names the key. Absent
   * where the runner offers none.
   */
  nudge?(value: unknown): CopyKey | null;
}

export type PlayProps<F extends FamilyName> = Common<F> & {
  mode: typeof ViewMode.Play;
  live: boolean;
  attemptNo: number;
  feedback: Feedback | null;
  workedSolution?: string[] | null | undefined;
  /** Set once the step ended without a right answer: the view shows its solution. */
  solution?: FamilyValue[F] | null | undefined;
  /** The solution card's lines, released with the solution (Choose addendum 1.2): StepShell draws
   * them under the answer. */
  solutionLines?: PageSolutionLine[] | null | undefined;
  onCommit(commit: FamilyCommit<FamilyValue[F]>): void;
  around?: StepContext | undefined;
  /**
   * Playground review only (dl-w3.47); a lesson never sets them. `initialValue` seeds the view's
   * own state with an answer, as if the learner had made it; `initialIncomplete` presses Check
   * too soon on mount, so the missing marks show. A view reads both once, when it mounts.
   */
  initialValue?: FamilyValue[F] | undefined;
  initialIncomplete?: boolean | undefined;
};

export type ViewProps<F extends FamilyName> =
  | PlayProps<F>
  | (Common<F> & {
      mode: typeof ViewMode.Solution;
      value: FamilyValue[F] | null;
      solution: FamilyValue[F];
    })
  | (Common<F> & {
      mode: typeof ViewMode.Review;
      value: FamilyValue[F] | null;
      answerKey: KeyOf<F>;
      verdict: Verdict;
    })
  | (Common<F> & { mode: typeof ViewMode.Preview; answerKey?: KeyOf<F>; showKey: boolean })
  | (Common<F> & { mode: typeof ViewMode.Print });

/**
 * What a view draws outside play: the answer shown (the learner's, if any) and the right answer
 * (when this mode shows it). Review and preview read the right answer from the key; solution is
 * handed it.
 */
export function answers<F extends FamilyName>(
  props: Exclude<ViewProps<F>, PlayProps<F>>,
): { shown: FamilyValue[F] | null; right: FamilyValue[F] | null } {
  switch (props.mode) {
    case ViewMode.Solution:
      return { shown: props.value, right: props.solution };
    case ViewMode.Review:
      return {
        shown: props.value,
        right: solutionOf({ ...props.spec, key: props.answerKey } as FamilySpec) as FamilyValue[F],
      };
    case ViewMode.Preview:
      return {
        shown: null,
        right:
          props.showKey && props.answerKey !== undefined
            ? (solutionOf({ ...props.spec, key: props.answerKey } as FamilySpec) as FamilyValue[F])
            : null,
      };
    case ViewMode.Print:
      return { shown: null, right: null };
  }
}

/** The help a play view draws in its answer area (families/help.ts): the parts rung 1 outlines,
 * and the parts rung 2 gave away, in the family's Given shape. Both empty without a ladder. */
export function helpIn<F extends FamilyName>(
  props: PlayProps<F>,
  ...parts: readonly (readonly string[])[]
): { focus: ReadonlySet<string>; given: unknown } {
  const help = props.around?.ladder?.help ?? null;
  const focus = new Set(help?.focus ?? []);
  // A ring round every option (or every gap, group or card) points nowhere: the help card's words
  // ("check each number") carry it alone, and no ring is drawn (owner, 2026-10-19, dl-w3.46.28).
  const everywhere = parts.some((ids) => ids.length > 1 && ids.every((id) => focus.has(id)));
  return { focus: everywhere ? new Set() : focus, given: help?.given ?? null };
}

/** Whether a play view should draw its solution now. */
export function showingSolution<F extends FamilyName>(
  props: PlayProps<F>,
): props is PlayProps<F> & { solution: FamilyValue[F] } {
  return props.solution !== undefined && props.solution !== null;
}

/** The StepShell props every play view passes the same way: the words, the verdict, the help. */
export function shellOf<F extends FamilyName>(
  props: PlayProps<F>,
): Pick<
  StepShellProps,
  | "language"
  | "category"
  | "feedback"
  | "workedSolution"
  | "solutionLines"
  | "checking"
  | "moveOn"
  | "ladder"
  | "next"
  | "progress"
  | "instruction"
> {
  // The instruction as the Stem shows it (families/Stem.tsx): the step's text when it replaces
  // `say`, else `say`. The quiet Sprawdź's tooltip repeats it (paper-behaviour README §3.5).
  const stem = (props.spec.data as { stem?: { text?: string; text_replaces_say?: boolean } }).stem;
  return {
    instruction: stem?.text && stem.text_replaces_say ? stem.text : props.spec.say,
    language: props.language,
    category: props.category,
    feedback: props.feedback,
    workedSolution: props.workedSolution ?? null,
    solutionLines: props.solutionLines ?? null,
    checking: props.around?.checking ?? false,
    moveOn: props.around?.moveOn ?? null,
    ladder: props.around?.ladder ?? null,
    next: props.around?.next ?? null,
    progress: props.around?.progress ?? null,
  };
}
