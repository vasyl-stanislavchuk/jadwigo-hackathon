/**
 * Part: the row of Polish letters with marks under a typed Polish answer (dl-uukj.28). On an
 * English layout, or an iPad without the long-press, a missing ę or ó can be the
 * device and not the spelling, and the spelling diagnostic judges marks strictly; the row takes
 * the device out of the reading. All nine letters always show, so the row never hints at the one
 * a question needs (whether a practice lesson may ever narrow it is the owner's, dl-w3.68.31). A
 * capitals key switches all nine. The row starts in capitals on an empty field only where a
 * capital is expected (`capitalStart`: a sentence's first word) and drops to lowercase after the
 * first letter, as a phone's shift does (Duolingo's "Type the missing word", the owner's screens
 * 11, 12 and 15, 2026-10-23). Anywhere else it starts lowercase: a gap inside a word (`mr_z`)
 * opened in capitals wrote `Ó` and a strict key judged it wrong_case (dl-w3.68.22).
 *
 * The look (dl-w3.68.30, the export's LetterRow): the capitals arrow first, flush under the field
 * so it reads as part of it. Each key is the kid tap size (docs/17 §2b) and its tile, drawn by
 * Zeszyt (styles/foundation.css), stands 6 px from the next. The ten keys stay one row while the
 * column holds ten kid-size targets, and become two rows of five below that (a container query):
 * never 8 then 2 (dl-w3.68.28). In a step frame (Enter addendum 3.6, styles/stage.css) a laptop
 * draws one row of ten 56 × 56 keys under the field, 6 apart, and a phone two rows of five, keys
 * 48 tall, riding on the system keyboard. Every key is square-cornered: no round control on the
 * lesson screen (addendum 2.5). The row is one of the answer's tools (Tools.tsx): it folds on a
 * phone and is not drawn once the step ends.
 *
 * The feel (keyFeel.ts): a pill sinks on a press, the letter pops into the field at the caret,
 * and the glyphs turn over when the case flips; calm plays them shorter, reduced not at all. A
 * page that plays a click on each tap hears it from `data-key-click` on the keys. A marked letter
 * typed on the device's own keyboard lights its key for a beat, so the row and the keyboard feel
 * like one.
 *
 * A tap goes through press() like the Keypad's, so a tap is the attempt's onset when it comes
 * first. It puts the letter at the caret of the field the row serves (or over its selection),
 * keeps the focus in that field and the caret just after the letter. A key never takes the focus,
 * so the device keyboard stays up. The caller gets the field's whole new text, exactly as it now
 * reads: nothing is folded here.
 */

import { copy } from "@jadwigo/copy";
import { Button, cn } from "@jadwigo/ui";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Clock, Instant } from "../stage/clock.ts";
import { type PressModality, press } from "../stage/press.ts";
import type { Language } from "../stage/types.ts";
import { flip, type KeyMotion, keyMotionOf, popLetter, sink } from "./keyFeel.ts";

/** The nine Polish letters with marks, in alphabet order. */
export const POLISH_LETTERS = ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"] as const;

/** How long a key stays lit after the keyboard typed its letter. */
export const ECHO_MS = 260;

/** The key: no look of its own, only the kid-size target around its pill. */
const KEY =
  "group/key size-[var(--kid-tap-min)] min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)] rounded-[0.625rem] p-0 hover:bg-transparent active:translate-y-0";
/** The tile inside the key. Its size, line, edge and the pick it wears when pressed, lit or on are
 * Zeszyt's letter row (styles/foundation.css), the one look (decision dl-76lr). */
const PILL = "flex items-center justify-center";
/** Colour eases in full and calm; under reduced it changes at once. */
const EASE = {
  full: "transition-colors duration-150",
  calm: "transition-colors duration-100",
  reduced: "",
} as const;

/** `text` with `letter` put over the selection [start, end), and where the caret then sits. */
export function insertAt(
  text: string,
  letter: string,
  start: number,
  end: number,
): { text: string; caret: number } {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  return { text: text.slice(0, s) + letter + text.slice(e), caret: s + letter.length };
}

/** The one letter `next` adds to `before`, wherever it went, or null when it is not one letter. */
export function added(before: string, next: string): string | null {
  if (next.length !== before.length + 1) return null;
  let i = 0;
  while (i < before.length && before[i] === next[i]) i++;
  return before.slice(i) === next.slice(i + 1) ? (next[i] ?? null) : null;
}

export function LetterRow({
  language,
  clock,
  field,
  text,
  capitalStart = false,
  max,
  locked,
  onInsert,
}: {
  language: Language;
  clock: Clock;
  /** The field the row types into, read at the tap for its caret. */
  field(): HTMLInputElement | null;
  /** That field's text now. */
  text: string;
  /** A capital is expected first (the field starts a sentence): start in capitals while it is
   * empty. Absent, the row starts lowercase (dl-w3.68.22). */
  capitalStart?: boolean | undefined;
  max?: number | undefined;
  locked: boolean;
  onInsert(next: string, at: Instant, modality: PressModality): void;
}): JSX.Element {
  const [capitals, setCapitals] = useState(capitalStart && text === "");
  const [pressed, setPressed] = useState<string | null>(null);
  const [lit, setLit] = useState<string | null>(null);
  const [motion, setMotion] = useState<KeyMotion>("full");
  const row = useRef<HTMLDivElement>(null);
  // The letter a key just put in, and where the caret then sits.
  const typed = useRef<{ caret: number; letter: string } | null>(null);
  // The field and its text as the row last saw them, to tell a keyboard letter from a key's.
  const seen = useRef<{ input: HTMLInputElement | null; text: string }>({ input: null, text });
  const flipped = useRef(capitals);

  // The page's motion level, read once the row is in the page.
  useLayoutEffect(() => setMotion(keyMotionOf(row.current)), []);
  // Capitals on an empty field that starts a sentence, lowercase once it holds a letter, however
  // the letter came; and again when the row moves to another field.
  const empty = text === "";
  useEffect(() => setCapitals(capitalStart && empty), [capitalStart, empty]);
  // The case flipped: the glyphs turn over.
  useEffect(() => {
    if (flipped.current === capitals) return;
    flipped.current = capitals;
    flip(row.current?.querySelectorAll("[data-glyph]") ?? [], motion);
  }, [capitals, motion]);
  // The new text is in the field by now: put the caret back after the letter, and pop it in.
  useLayoutEffect(() => {
    const at = typed.current;
    const input = field();
    if (at === null || input === null) return;
    typed.current = null;
    input.focus();
    input.setSelectionRange(at.caret, at.caret);
    popLetter(input, at.caret, at.letter, motion);
  });
  // Echo: a marked letter the keyboard typed lights its key for a beat. A key's own letter is
  // already lit by its press, and a text that arrives with another field is not typing.
  const echo = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(echo.current), []);
  useEffect(() => {
    const input = field();
    const before = seen.current;
    seen.current = { input, text };
    if (before.input !== input) return;
    const letter = added(before.text, text)?.toLowerCase();
    if (letter === undefined || !(POLISH_LETTERS as readonly string[]).includes(letter)) return;
    setLit(letter);
    clearTimeout(echo.current);
    echo.current = setTimeout(() => setLit(null), ECHO_MS);
    // The field is read at the change; the caller hands a new function each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const tap = (letter: string) =>
    press(clock, (at, modality) => {
      const input = field();
      if (locked || input === null) return;
      const shown = capitals ? letter.toUpperCase() : letter;
      const next = insertAt(
        text,
        shown,
        input.selectionStart ?? text.length,
        input.selectionEnd ?? text.length,
      );
      if (max !== undefined && next.text.length > max) return;
      typed.current = { caret: next.caret, letter: shown };
      seen.current = { input, text: next.text };
      onInsert(next.text, at, modality);
    });
  // A key never takes the focus from the field: the caret and the device keyboard stay.
  const keep = (event: { preventDefault(): void }) => event.preventDefault();
  const shift = press(clock, () => setCapitals((c) => !c));
  const pill = (e: { currentTarget: Element }) =>
    sink(e.currentTarget.querySelector("[data-pill]"), motion);

  return (
    <div className="@container w-full">
      <div
        ref={row}
        role="group"
        aria-label={copy(language, "letters_row")}
        data-letters="pl"
        data-motion={motion}
        className="-ml-2 grid w-fit grid-cols-5 @min-[35rem]:grid-cols-10"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={KEY}
          aria-label={copy(language, "letters_capitals")}
          aria-pressed={capitals}
          data-capitals={capitals}
          data-key-click
          onMouseDown={keep}
          onPointerDown={(e) => {
            keep(e);
            pill(e);
            shift.onPointerDown(e);
          }}
          onClick={shift.onClick}
        >
          <span data-pill className={cn(PILL, EASE[motion])}>
            <span data-glyph className="flex">
              {capitals ? (
                <ArrowDown aria-hidden className="size-5" />
              ) : (
                <ArrowUp aria-hidden className="size-5" />
              )}
            </span>
          </span>
        </Button>
        {POLISH_LETTERS.map((letter) => {
          const h = tap(letter);
          const shown = capitals ? letter.toUpperCase() : letter;
          return (
            <Button
              key={letter}
              type="button"
              variant="ghost"
              size="icon"
              className={KEY}
              data-letter={shown}
              data-pressed={pressed === letter}
              data-lit={lit === letter}
              data-key-click
              aria-disabled={locked || undefined}
              onMouseDown={keep}
              onPointerDown={(e) => {
                keep(e);
                setPressed(letter);
                if (!locked) pill(e);
                h.onPointerDown(e);
              }}
              onPointerUp={() => setPressed(null)}
              onPointerLeave={() => setPressed(null)}
              onClick={h.onClick}
            >
              <span data-pill className={cn(PILL, EASE[motion])}>
                <span data-glyph>{shown}</span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
