/**
 * Part: the step's states, one closed table (docs/17 §2f rule 3, dl-w3.41). Each state has one
 * icon, one set of words and one tone, so a state looks and reads the same in every family, and
 * the meaning never rests on colour alone (rule 4). A new state is a new row here, never a one-off
 * in a view; stepContract.test.ts fails a verdict icon imported anywhere else.
 *
 * The status area shows answering, incomplete, checking, right, not yet and moved on. The help
 * area's cards use the boost and worked rows, and the help ladder's look, smaller, almost and twin
 * rows (families/help.ts).
 */

import { type CopyKey, copy, copyAt } from "@jadwigo/copy";
import {
  Check,
  CircleDot,
  Eye,
  Footprints,
  Lightbulb,
  type LucideIcon,
  Pencil,
  Repeat2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Category, Feedback, Language } from "../stage/types.ts";
import type { Tone } from "./tone.ts";

export const StepStatus = {
  Answering: "answering",
  Incomplete: "incomplete",
  Checking: "checking",
  Right: "right",
  NotYet: "not_yet",
  Boost: "boost",
  Worked: "worked",
  MovedOn: "moved_on",
  Look: "look",
  Smaller: "smaller",
  Almost: "almost",
  Twin: "twin",
} as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

export interface StatusRow {
  /** The icon, `spinner` for the kid Spinner, or null for none. */
  icon: LucideIcon | "spinner" | null;
  /** Where the words come from: a copy key, `list` for the feedback line's own list
   * (praise, try_again), `incomplete` for the family's own reason, or null for none. */
  words: CopyKey | "list" | "incomplete" | null;
  tone: Tone;
}

export const STATUS: Record<StepStatus, StatusRow> = {
  answering: { icon: null, words: null, tone: "idle" },
  incomplete: { icon: CircleDot, words: "incomplete", tone: "missing" },
  checking: { icon: "spinner", words: "checking", tone: "idle" },
  // The band's discs (lesson frame README §3): a check, a pencil to fix the marked part, an eye on the solution.
  right: { icon: Check, words: "list", tone: "green" },
  not_yet: { icon: Pencil, words: "list", tone: "amber" },
  boost: { icon: Lightbulb, words: "hint", tone: "idle" },
  worked: { icon: Lightbulb, words: "worked_solution", tone: "idle" },
  moved_on: { icon: Eye, words: "moved_on", tone: "idle" },
  look: { icon: Eye, words: "help_look", tone: "idle" },
  smaller: { icon: Lightbulb, words: "help_smaller", tone: "idle" },
  almost: { icon: Footprints, words: "help_almost", tone: "idle" },
  twin: { icon: Repeat2, words: "help_twin", tone: "idle" },
};

/** Which feedback kind is which state: the one place a view's status reads the runner's kinds. */
const BY_KIND: Record<Feedback["kind"], StepStatus> = {
  praise: "right",
  try_again: "not_yet",
  moved_on: "moved_on",
};

export interface StatusInput {
  feedback: Feedback | null;
  /** The answer is on its way to the judge. */
  checking?: boolean | undefined;
  /** The child pressed Check before the answer was complete; the family's reason. */
  incomplete?: CopyKey | null | undefined;
}

/** The status area's state. Checking first, then a reason for an incomplete answer, then the verdict. */
export function statusOf({
  feedback,
  checking = false,
  incomplete = null,
}: StatusInput): StepStatus {
  if (checking) return StepStatus.Checking;
  if (incomplete !== null) return StepStatus.Incomplete;
  return feedback === null ? StepStatus.Answering : BY_KIND[feedback.kind];
}

/** The words for a state, in the learner's language. */
export function statusWords(
  state: StepStatus,
  input: StatusInput & { language: Language; category: Category },
): string | null {
  const row = STATUS[state];
  if (row.words === null) return null;
  if (row.words === "incomplete")
    return input.incomplete ? copy(input.language, input.incomplete) : null;
  // A moved-on step may carry its own line (runner/reducer StepEnding): the calm one after "Not
  // sure yet", or noted when the verdict is held.
  if (state === StepStatus.MovedOn && input.feedback?.line)
    return copy(input.language, input.feedback.line, {}, input.category);
  if (row.words === "list") {
    const feedback = input.feedback;
    return feedback === null
      ? null
      : copyAt(input.language, feedback.kind, feedback.index, {}, input.category);
  }
  return copy(input.language, row.words);
}

/** The words after the praise, on its line: why a right "none of these" is right (dl-w3.70.4), or
 * the other accepted form of a typed answer (dl-w3.68.1), or null. The why line is markdown and
 * TeX, as Khan wrote it, so the line draws it with RichText. Only on a right answer: the runner sets it on praise alone, and this checks again. */
export function alsoWords(
  input: Pick<StatusInput, "feedback"> & { language: Language; category: Category },
): string | null {
  const { feedback } = input;
  if (feedback?.kind !== "praise") return null;
  // A right equation the other way round: the question's form (Enter addendum 3.7).
  if (feedback.swapped)
    return copy(input.language, "sides_swapped_form", { form: feedback.swapped }, input.category);
  // Why a right "none of these" is right (dl-w3.70.4): the item's own words, after the praise.
  if (feedback.why) return feedback.why;
  if (!feedback.also) return null;
  return copy(input.language, "other_form", { form: feedback.also }, input.category);
}

/** What Check found missing: the family's reason and the parts to mark (none: the whole answer). */
export interface MissingMark {
  reason: CopyKey;
  parts: readonly string[];
}

/**
 * The missing mark of a press too soon (docs/17 §2f rule 8). It lasts until the child changes the
 * answer or a new attempt starts, and it is never a verdict: nothing is graded or written.
 */
export function useMissing(attemptNo: number): {
  missing: MissingMark | null;
  flag(mark: MissingMark): void;
  clear(): void;
} {
  const [missing, setMissing] = useState<MissingMark | null>(null);
  useEffect(() => setMissing(null), [attemptNo]);
  const flag = useCallback((mark: MissingMark) => setMissing(mark), []);
  const clear = useCallback(() => setMissing((m) => (m === null ? m : null)), []);
  return { missing, flag, clear };
}

/** A part's tone, with the missing mark over it while it stands. */
export function orMissing(tone: Tone, id: string | null, missing: MissingMark | null): Tone {
  if (missing === null) return tone;
  if (id === null ? missing.parts.length === 0 : missing.parts.includes(id)) return "missing";
  return tone;
}
