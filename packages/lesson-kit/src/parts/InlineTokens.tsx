/**
 * Part: a text the learner marks by tapping words in it (dl-w3.61.2, mark_numbers). The text is rich
 * text (RichText) with an `{id}` marker where each token sits. Each token is a toggle button inside
 * the sentence, so the sentence reads as written and the learner taps where the number is.
 *
 * Nothing moves when a token is picked: a pick changes the token's background and border only,
 * never its weight or its size. Every token keeps a border from the start (transparent for a plain
 * word), and its 56px tap target comes from padding and the kid layer's minimum, so the line is as
 * tall before the first tap as after it. Each token is a button with `aria-pressed`, so Tab reaches
 * it.
 *
 * Keys, as for several options (paper-behaviour README §3.3): Space switches the focused token, the
 * four arrows move the focus between tokens in reading order, wrapping and stepping over one the
 * help ladder took away, and Enter is the step's (StepShell.tsx), which checks: every token carries
 * data-option for it, so Enter never switches a token. A mark fades in its 120 ms as a change clears it.
 *
 * With `words`, every other word of the text is a token too (the playground's `mark=words` switch):
 * the caller gets its id as `w:<n>`, its place among the words, and decides what it means.
 *
 * Behaviour and layout, not judgement: the caller passes which tokens are picked and each one's tone.
 */

import { cn } from "@jadwigo/ui";
import type { KeyboardEvent, ReactNode } from "react";
import type { Clock, Instant } from "../stage/clock.ts";
import { type PressModality, press } from "../stage/press.ts";
import { RichText } from "./RichText.tsx";
import { texRanges } from "./richTextParse.ts";
import { FOCUS_CLASS, REMOVED_CLASS, TONE_CLASS, type Tone } from "./tone.ts";

export interface InlineToken {
  /** The marker's id in the text: `{o1}` is the token `o1`. */
  id: string;
  /** What the token shows: its words, markdown and TeX. */
  label: string;
  tone: Tone;
  focus?: boolean | undefined;
  removed?: boolean | undefined;
}

const MARKER = /\{([a-z][a-z0-9_]*)\}/g;
const WORD = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu;

/** The id a plain word's answer carries, and the slot it sits in within the text. */
const wordId = (n: number): string => `w:${n}`;
const wordSlot = (n: number): string => `w_${n}`;

/**
 * The text with every plain word outside the markers and the TeX turned into a slot of its own:
 * `Ala ma {o1} lat` → `{w_1} {w_2} {o1} {w_3}`, and the words by slot.
 */
function wordSlots(text: string): {
  text: string;
  words: Map<string, { id: string; word: string }>;
} {
  const skip = [
    ...texRanges(text),
    ...[...text.matchAll(MARKER)].map((m): [number, number] => [m.index, m.index + m[0].length]),
  ];
  const words = new Map<string, { id: string; word: string }>();
  let n = 0;
  let out = "";
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    if (skip.some(([s, e]) => m.index >= s && m.index < e)) continue;
    n += 1;
    words.set(wordSlot(n), { id: wordId(n), word: m[0] });
    out += `${text.slice(last, m.index)}{${wordSlot(n)}}`;
    last = m.index + m[0].length;
  }
  return { text: out + text.slice(last), words };
}

// A token is 56 tall inside 26px text: the text's lines are 68 (56 + 12) and each token sits
// centred in its line at line-height 1, so tokens on neighbouring lines never touch (Choose
// addendum 2.4). The text itself pads 12 at the sides and 4 above and below in every state, so the
// whole-set mark, 6 px outside it (tone.ts), keeps its distance from the words and nothing moves
// when the mark comes (owner, 2026-10-26).
const TOKEN =
  "mx-0.5 inline-flex min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)] items-center justify-center rounded-xl border-2 px-2 align-middle leading-none transition-colors duration-jw-mark";

const STEP: Record<string, 1 | -1> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** The arrows walk the tokens in reading order, wrapping, over any the help ladder took away. */
function walk(event: KeyboardEvent<HTMLDivElement>): void {
  const step = STEP[event.key];
  if (step === undefined || event.altKey || event.ctrlKey || event.metaKey) return;
  const all = [...event.currentTarget.querySelectorAll<HTMLElement>("button[data-option]")];
  const at = all.indexOf(event.target as HTMLElement);
  if (at < 0) return;
  // Taken, so the step frame's own arrows (items, Questionnaire) leave it alone.
  event.preventDefault();
  for (let i = 1; i < all.length; i++) {
    const next = all[(at + step * i + all.length) % all.length];
    if (next === undefined || next.hasAttribute("data-help-removed")) continue;
    next.focus();
    return;
  }
}

function look(
  tone: Tone,
  picked: boolean,
  plain: boolean,
  focus: boolean,
  removed: boolean,
): string {
  const help = cn(
    focus && FOCUS_CLASS,
    removed && cn(REMOVED_CLASS, "cursor-default line-through"),
  );
  if (removed) return cn(TOKEN, help);
  if (tone !== "idle") return cn(TOKEN, TONE_CLASS[tone], help);
  if (picked) return cn(TOKEN, "border-primary bg-primary/15", help);
  return cn(TOKEN, plain ? "border-transparent" : "border-border bg-card", help);
}

export function InlineTokens({
  text,
  label,
  tokens,
  chosen,
  words = false,
  locked,
  clock,
  onToggle,
  className,
}: {
  text: string;
  /** The group's name for a screen reader: the task. */
  label: string;
  tokens: InlineToken[];
  chosen: readonly string[];
  /** Every plain word is a token too. */
  words?: boolean | undefined;
  locked: boolean;
  /** Absent: the text is drawn inert, for a solution, a review or paper. */
  clock?: Clock | undefined;
  onToggle?: ((id: string, at: Instant, modality: PressModality) => void) | undefined;
  className?: string | undefined;
}): JSX.Element {
  const byId = new Map(tokens.map((t) => [t.id, t]));
  const plain = words
    ? wordSlots(text)
    : { text, words: new Map<string, { id: string; word: string }>() };
  const ids = new Set([...byId.keys(), ...plain.words.keys()]);

  const draw = (
    id: string,
    content: ReactNode,
    tone: Tone,
    isPlain: boolean,
    focus: boolean,
    removed: boolean,
  ): ReactNode => {
    const on = chosen.includes(id);
    const cls = look(tone, on, isPlain, focus, removed);
    const data = {
      "data-token": id,
      "data-tone": tone,
      ...(focus ? { "data-help-focus": "true" } : {}),
      ...(removed ? { "data-help-removed": "true" } : {}),
    };
    if (clock === undefined || onToggle === undefined) {
      return (
        <span {...data} data-picked={on || undefined} className={cls}>
          {content}
        </span>
      );
    }
    const handlers = press(clock, (at, modality) => {
      if (!locked && !removed) onToggle(id, at, modality);
    });
    return (
      <button
        type="button"
        {...data}
        data-option={id}
        aria-pressed={on}
        aria-disabled={locked || removed || undefined}
        className={cn(cls, "cursor-pointer select-none")}
        onPointerDown={handlers.onPointerDown}
        onClick={handlers.onClick}
      >
        {content}
      </button>
    );
  };

  const slot = (id: string): ReactNode => {
    const token = byId.get(id);
    if (token !== undefined)
      return draw(
        token.id,
        <RichText inline text={token.label} />,
        token.tone,
        false,
        token.focus === true,
        token.removed === true,
      );
    const word = plain.words.get(id);
    return word === undefined ? null : draw(word.id, word.word, "idle", true, false, false);
  };

  return (
    <div
      role="group"
      aria-label={label}
      aria-disabled={locked || undefined}
      className={cn("px-3 py-1 text-[length:var(--kid-answer-size)] leading-[4.25rem]", className)}
      onKeyDown={walk}
    >
      <RichText text={plain.text} slots={slot} slotIds={ids} />
    </div>
  );
}
