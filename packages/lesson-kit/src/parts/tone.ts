/**
 * Part: the colour a step, or one part of it, wears after the runner's verdict (docs/17 §2a):
 * green for right, the theme's red for not yet (dl-uukj.29.16; the tone is still named `amber` in
 * code). Only the colour: the words, the sound and the beat
 * stay the runner's. Moved here from blocks/fill_blank/logic.ts when the interaction families came
 * (dl-w3.37.10), so every block and family view reads the same rule; fill_blank re-exports it.
 *
 * The marks rule (docs/18 §0): after a miss the result may mark each part, right or missed. A
 * marked part stays marked until the child changes it; a step marked as a whole clears on the
 * child's first change. Amber is also dashed, so the mark does not rest on colour alone.
 */

import { cn } from "@jadwigo/ui";
import { useCallback, useState } from "react";
import type { Feedback, FeedbackKind } from "../stage/types.ts";

/** `missing` is not a verdict: it marks a part left empty when Check was pressed too soon
 * (docs/17 §2f rule 8). It is a dashed outline in the primary colour, never amber. */
export type Tone = "idle" | "green" | "amber" | "missing";
const TONE: Record<FeedbackKind, Tone> = { praise: "green", try_again: "amber", moved_on: "idle" };

/** The runner praised the answer: the step is right. */
export function praised(feedback: Feedback | null): boolean {
  return toneOf(feedback) === "green";
}

/** The runner asked for another try: the step is missed, for now. */
export function missed(feedback: Feedback | null): boolean {
  return toneOf(feedback) === "amber";
}

/** The whole step's tone. */
export function toneOf(feedback: Feedback | null): Tone {
  return feedback === null ? "idle" : TONE[feedback.kind];
}

/** Gentle motion only when the child's device allows it (WCAG 2.3.3). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * One part's tone: green when the step was right or the result marked the part right, amber when
 * it marked the part missed, and idle once the child changed it or when the result marked no
 * parts (the step is then marked as a whole: see wholeTone).
 */
export function partTone(
  id: string,
  feedback: Feedback | null,
  changed: ReadonlySet<string>,
): Tone {
  if (feedback === null || feedback.kind === "moved_on") return "idle";
  if (feedback.kind === "praise") return "green";
  if (changed.has(id)) return "idle";
  const mark = feedback.parts?.find((p) => p.id === id);
  if (mark === undefined) return "idle";
  return mark.correct ? "green" : "amber";
}

/**
 * One field's tone in a step of several fields or boxes (Slots addendum 2.1, decision dl-4e0f 4b):
 * after a miss only the missed parts are marked. A part the result marked right stays as it was typed,
 * paper and editable, and is judged again on the next Sprawdź; a missed part wears the miss mark
 * until the child changes it. Green only when the whole step is right.
 */
export function fieldTone(
  id: string,
  feedback: Feedback | null,
  changed: ReadonlySet<string>,
): Tone {
  const tone = partTone(id, feedback, changed);
  return tone === "green" && feedback?.kind !== "praise" ? "idle" : tone;
}

/** The tone of the step around its parts: amber after a miss that marked no part, until the
 * child changes anything; green when right. */
export function wholeTone(feedback: Feedback | null, changed: ReadonlySet<string>): Tone {
  if (feedback === null || feedback.kind === "moved_on") return "idle";
  if (feedback.kind === "praise") return "green";
  return feedback.parts === undefined && changed.size === 0 ? "amber" : "idle";
}

/**
 * One part's share of the step's feedback, in a question of several parts (families/compound): the
 * marks under `<partId>.`, the prefix taken off. A part the result marked right reads as praised,
 * green and locked; a missed part keeps its own marks, or is marked as a whole when it has none.
 */
export function feedbackOfPart(feedback: Feedback | null, partId: string): Feedback | null {
  if (feedback === null || feedback.kind !== "try_again" || feedback.parts === undefined)
    return feedback;
  if (feedback.parts.some((p) => p.id === partId && p.correct))
    return { kind: "praise", index: feedback.index };
  const prefix = `${partId}.`;
  const inner = feedback.parts
    .filter((p) => p.id.startsWith(prefix))
    .map((p) => ({ ...p, id: p.id.slice(prefix.length) }));
  return {
    kind: "try_again",
    index: feedback.index,
    ...(inner.length > 0 ? { parts: inner } : {}),
  };
}

/** The classes for a tone, from the kid tokens. Amber is dashed too. */
export const TONE_CLASS: Record<Tone, string> = {
  idle: "",
  green: "border-kid-correct bg-kid-correct-soft text-kid-correct-ink",
  amber: "border-dashed border-kid-try-again bg-kid-try-again-soft text-kid-try-again-ink",
  missing: "border-dashed border-primary",
};

/**
 * The whole-set mark (Choose addendum 1.4, decision dl-n501, option 9b): a group marked as a whole
 * (wholeTone) wears its mark as an outline 6 px outside it, r16, with no fill, no border and no
 * padding, so not one part inside moves by a pixel as the mark comes and goes. Dashed for a miss
 * (and for a group left empty), solid for right. Leave 8 px free around the group for it.
 */
export const WHOLE_CLASS: Record<Tone, string> = {
  idle: "",
  green: "outline-solid outline-2 outline-offset-[0.375rem] outline-kid-correct",
  amber: "outline-dashed outline-2 outline-offset-[0.375rem] outline-kid-try-again",
  missing: "outline-dashed outline-2 outline-offset-[0.375rem] outline-primary",
};

/** A group's whole-set mark as props: the outline, and `data-whole` naming it for a test or a
 * theme. Never `data-tone`: that names a part's own mark, and the theme gives it an edge. */
export function wholeMark(
  tone: Tone,
  className?: string,
): { "data-whole": Tone; className: string } {
  return { "data-whole": tone, className: cn("rounded-2xl", WHOLE_CLASS[tone], className) };
}

/**
 * Which parts the child changed since the last verdict. It starts empty on every attempt: the
 * runner raises attemptNo after a miss, and that is when the marks arrive.
 */
export function useChanged(attemptNo: number): {
  changed: ReadonlySet<string>;
  change(id: string): void;
} {
  // Keyed by the attempt, so the render that brings the marks already starts empty: the step
  // keys move the focus to the first marked part in that same render (stepKeys.ts).
  const [changed, setChanged] = useState<{ attempt: number; ids: ReadonlySet<string> }>({
    attempt: attemptNo,
    ids: NONE,
  });
  const change = useCallback(
    (id: string) =>
      setChanged((prev) => {
        const ids = prev.attempt === attemptNo ? prev.ids : NONE;
        return ids === prev.ids && ids.has(id)
          ? prev
          : { attempt: attemptNo, ids: new Set([...ids, id]) };
      }),
    [attemptNo],
  );
  return { changed: changed.attempt === attemptNo ? changed.ids : NONE, change };
}

const NONE: ReadonlySet<string> = new Set();

/** A mark fades as the child edits its part (paper-behaviour README §3.5): 120 ms, at once under
 * reduced motion. */
export const MARK_FADE =
  "transition-[background-color,border-color,color] duration-[120ms] ease-out motion-reduce:transition-none";

/**
 * The digits of a box the keypad types into, selected after a miss (paper-behaviour README §3.5):
 * the next key replaces them. The system's highlight by default; Zeszyt draws it in the pick's
 * fill and ink, as an input's own selection (foundation.css, `data-selection`, dl-uukj.29.99), on
 * the paper of the active field (Enter addendum 2.1, 2.3). Away after a miss the field drops the
 * selection's look for the miss mark (TONE_CLASS amber) and keeps the selection itself.
 */
export const SELECTION = {
  "data-selection": "",
  className: "rounded-sm bg-[Highlight] text-[HighlightText]",
} as const;

/**
 * The help ladder's outline (families/help.ts rung 1): where to look, on the first missed part
 * (Slots addendum 2.3). A ring, so it never moves the layout (docs/17 §2f rule 2): 3 px, dashed, 4 px
 * out, so it reads as "look here" and never as a verdict (rule 4: no meaning on colour alone).
 * `kid-look` lets a theme draw it its own way: Zeszyt draws it in help's darker yellow
 * (styles/foundation.css).
 */
export const FOCUS_CLASS = "kid-look outline-dashed outline-3 outline-offset-4 outline-primary";

/** A part rung 2 gave away (Slots addendum 2.3): it keeps its size, turns help yellow and locks,
 * the help fill inside a 2 px help edge in help's ink. Zeszyt draws it from `data-help-given`
 * (styles/foundation.css); these are the colours outside it. */
export const GIVEN_CLASS =
  "border-solid border-[var(--kid-help-edge,var(--muted-foreground))] bg-[var(--kid-help,var(--muted))] text-[var(--kid-help-ink,var(--foreground))]";

/** A distractor rung 2 took away from a choice: settled, in the muted card colour, struck through
 * by the caller, and no longer pressable. Not help yellow: it gives no answer, it removes one. */
export const REMOVED_CLASS = "border-solid border-muted-foreground/40 bg-muted text-foreground";
