/**
 * Part: one gap of an open Slots step, one component per kind (split out of SlotsView.tsx,
 * dl-uukj.29.120): a gap help gave (`GivenGap`), a chosen gap (`ChosenSlot`, the GapMenu), a
 * fraction (`FractionGap`), a number the one keypad types into (`NumberGap`) and a typed word
 * (`TextGap`). `SlotGap` picks the part for a gap. The step (SlotsView.tsx) holds every gap's state
 * and hands each part what it needs as one `GapPlay`.
 *
 * A typed gap is the Enter field (Slots addendum 3.1, decision dl-4e0f 1c): InlineField.tsx's
 * `FIELD_BOX`, 64 tall in every state, at the type size of the line it stands in (a maths line 36 /
 * 30, a sentence 26 / 24: it inherits it), as wide as its length setting says (`fieldWidth`), never
 * as what is typed. The theme draws its states as Enter's (foundation.css).
 */

import { cn } from "@jadwigo/ui";
import { FractionBoxes } from "../../parts/FractionBoxes.tsx";
import type { FractionBox } from "../../parts/fractionEntry.ts";
import { LetterMarks } from "../../parts/LetterMarks.tsx";
import {
  FOCUS_CLASS,
  GIVEN_CLASS,
  MARK_FADE,
  SELECTION,
  TONE_CLASS,
  type Tone,
} from "../../parts/tone.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { type PressModality, press } from "../../stage/press.ts";
import type { Language } from "../../stage/types.ts";
import { Family } from "../names.ts";
import { ChosenStill, GapMenu, WholeWord } from "./GapMenu.tsx";
import { boxLabels, fieldOf, isFraction, isSlot, keyLabel, MAX_TEXT, wholeOf } from "./gaps.ts";
import type { Gap } from "./model.ts";

type TypedGap = Extract<Gap, { kind: typeof Family.Enter }>;

/** What every gap part reads from the step, and how it tells the step about a change. */
export interface GapPlay {
  language: Language;
  clock: Clock;
  live: boolean;
  /** What the child put in each gap. */
  values: Readonly<Record<string, string>>;
  /** The gaps help's rung 2 gave, and their answers. */
  given: Readonly<Record<string, string>>;
  /** The step was right. */
  praised: boolean;
  /** The gaps help's rung 1 outlines. */
  helpFocus: ReadonlySet<string>;
  /** The gap the keypad types into, and in a fraction gap the box. */
  active: string | null;
  box: FractionBox;
  /** The keypad gap selected after a miss, which the next key replaces. */
  selected: string | null;
  /** After a miss, the child clicked away on the page (addendum 2.3). */
  away: boolean;
  tone(id: string): Tone;
  /** A text gap's slipped letters (Enter addendum 3.6). */
  letters(id: string): ReadonlySet<number>;
  setActive(id: string, box?: FractionBox): void;
  set(id: string, value: string, at: Instant, modality: PressModality): void;
  /** A text gap's input, for the letter row. */
  field(id: string, el: HTMLInputElement | null): void;
  onTextFocus(id: string): void;
  /** The chosen gap whose list is open, or null (addendum 2.2): only it draws the focus border,
   * and the keypad goes quiet. */
  menu: string | null;
  setMenu(id: string | null): void;
}

/** The props every gap part takes. */
interface PartProps {
  gap: Gap;
  label: string;
  play: GapPlay;
}

/** The help outline's attribute and ring, for a gap rung 1 points at. */
function helpLook(
  play: GapPlay,
  id: string,
): { focus: { "data-help-focus"?: "true" }; ring: string | false } {
  const on = play.helpFocus.has(id);
  return { focus: on ? { "data-help-focus": "true" } : {}, ring: on && FOCUS_CLASS };
}

/** A field with no mark: paper inside the line. */
const PAPER = "border-border bg-card";

/** A gap rung 2 gave keeps its box, so nothing moves, turns help yellow and locks (Slots addendum
 * 2.3): a typed gap the field's box, with a word's margin; a chosen gap the menu's, in the same
 * wrapper as the menu. */
function GivenGap({ gap, label, play }: PartProps): JSX.Element {
  const value = play.given[gap.id] ?? "";
  if (gap.kind === Family.Choose)
    return (
      <span className="inline-flex rounded-lg">
        <ChosenStill gap={gap} value={value} tone="idle" given label={label} />
      </span>
    );
  const box = isFraction(gap)
    ? { className: "inline-flex rounded-lg align-middle", style: undefined }
    : fieldOf(gap);
  return (
    <span
      role="group"
      aria-label={label}
      aria-disabled="true"
      data-help-given="true"
      data-tone="idle"
      className={cn(box.className, gap.input === "text" && WORD_MARGIN, GIVEN_CLASS)}
      style={box.style}
    >
      {isFraction(gap) ? (
        <FractionBoxes
          text={value}
          whole={wholeOf(gap, value)}
          tone="idle"
          labels={boxLabels(play.language)}
        />
      ) : (
        keyLabel(gap, value, play.language)
      )}
    </span>
  );
}

/**
 * A typed word's margin: the help outline draws 7 px outside the field, and a word's gap has the
 * line's words beside it, so 6 px each side keep the outline off them. A cell that fixes its gap
 * (gapFit.ts, `--gap-mx`) takes it off: a gap inside a word has its letters right against it, as
 * "st[ó]ł" reads as one word (Slots addendum 3.2).
 */
export const WORD_MARGIN = "mx-[var(--gap-mx,0.375rem)]";

function ChosenSlot({
  gap,
  label,
  play,
}: PartProps & { gap: Extract<Gap, { kind: typeof Family.Choose }> }): JSX.Element {
  const { focus, ring } = helpLook(play, gap.id);
  // Right: green and flat like a typed gap (addendum 2.2). After a miss it stays a menu (ruling 07).
  // In the same wrapper as the menu, so it sits on the line exactly where the menu sat.
  const praisedValue = play.praised ? play.values[gap.id] : undefined;
  if (praisedValue !== undefined)
    return (
      <span className="inline-flex rounded-lg">
        <WholeWord gap={gap} value={praisedValue} />
      </span>
    );
  return (
    <span {...focus} className={cn("inline-flex rounded-lg", ring)}>
      <GapMenu
        gap={gap}
        label={label}
        value={play.values[gap.id] ?? null}
        tone={play.tone(gap.id)}
        live={play.live}
        clock={play.clock}
        open={play.menu === gap.id}
        onOpenChange={(open) => play.setMenu(open ? gap.id : null)}
        // After a miss the first missed gap is the one in use: its word keeps the miss mark under the focus border.
        focused={play.selected === gap.id && !play.away}
        onPick={(id, at, modality) => play.set(gap.id, id, at, modality)}
      />
    </span>
  );
}

/** Stacked boxes in the line (dl-w3.70.16): a tap on a box moves the keypad there. */
function FractionGap({ gap, label, play }: PartProps): JSX.Element {
  const { focus, ring } = helpLook(play, gap.id);
  const text = play.values[gap.id] ?? "";
  const here = play.active === gap.id && !play.away;
  return (
    <span
      {...focus}
      data-field={gap.id}
      data-empty={text === "" ? "" : undefined}
      className={cn("inline-flex rounded-lg", ring)}
    >
      <FractionBoxes
        text={text}
        whole={wholeOf(gap, text)}
        tone={play.tone(gap.id)}
        active={here ? play.box : null}
        selected={play.selected === gap.id && here ? play.box : null}
        clock={play.clock}
        onPick={(b) => play.setActive(gap.id, b)}
        label={label}
        labels={boxLabels(play.language)}
      />
    </span>
  );
}

/** A number the one keypad types into. Tab reaches the gaps in reading order, and the keypad types
 * into the gap that has the focus. */
function NumberGap({ gap, label, play }: PartProps & { gap: TypedGap }): JSX.Element {
  const { focus, ring } = helpLook(play, gap.id);
  const t = play.tone(gap.id);
  const look = t === "idle" ? PAPER : TONE_CLASS[t];
  const value = play.values[gap.id];
  const box = fieldOf(gap);
  const h = press(play.clock, () => play.setActive(gap.id));
  const selected = play.selected === gap.id && !play.away;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={play.active === gap.id}
      data-tone={t}
      data-field={gap.id}
      data-empty={(value ?? "") === "" ? "" : undefined}
      data-selected={selected ? "" : undefined}
      data-away={play.away ? "" : undefined}
      // The box the keypad types into is the active field (rule 10); a marked one keeps its
      // mark's fill under the active edge (dl-uukj.29.99).
      // Away after a miss, it lets go of that look (addendum 2.3).
      data-active={play.live && play.active === gap.id && !play.away ? "true" : undefined}
      {...focus}
      className={cn(box.className, MARK_FADE, look, ring)}
      style={box.style}
      onPointerDown={h.onPointerDown}
      onClick={h.onClick}
      onFocus={() => play.setActive(gap.id)}
    >
      {selected && value ? <span {...SELECTION}>{value}</span> : value || " "}
    </button>
  );
}

/**
 * A typed word, with a word's margin (`WORD_MARGIN`), none inside a word (Slots addendum 3.2).
 * Its width is its length setting's, so the line never moves as letters arrive (Slots addendum 3.1;
 * it no longer grows, dl-w3.68.30).
 */
function TextGap({ gap, label, play }: PartProps & { gap: TypedGap }): JSX.Element {
  const { focus, ring } = helpLook(play, gap.id);
  const t = play.tone(gap.id);
  const look = t === "idle" ? PAPER : TONE_CLASS[t];
  const letters = play.letters(gap.id);
  const value = play.values[gap.id] ?? "";
  const box = fieldOf(gap);
  return (
    // The gap's slipped letters lie over it (addendum 3.6), in a wrapper that is always there,
    // so the field is never remounted and keeps its focus.
    <span className="relative inline-flex align-middle">
      <input
        ref={(el) => play.field(gap.id, el)}
        aria-label={label}
        data-tone={t}
        data-field={gap.id}
        {...focus}
        data-letter-marked={letters.size > 0 ? "" : undefined}
        className={cn(
          box.className,
          MARK_FADE,
          WORD_MARGIN,
          isSlot(gap) && "text-center",
          look,
          ring,
        )}
        style={box.style}
        // A slot keeps no cap: its new letter replaces the old one (§4 onInput).
        maxLength={isSlot(gap) ? undefined : (gap.max_length ?? MAX_TEXT)}
        value={value}
        readOnly={!play.live}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onFocus={() => play.onTextFocus(gap.id)}
        onChange={(e) =>
          play.set(
            gap.id,
            isSlot(gap) ? [...e.target.value].slice(-1).join("") : e.target.value,
            play.clock.now(),
            "keyboard",
          )
        }
      />
      <LetterMarks
        text={value}
        missed={letters}
        className={cn(
          "right-[var(--gap-mx,0.375rem)] left-[var(--gap-mx,0.375rem)] font-bold",
          isSlot(gap) ? "justify-center" : "px-3.5",
        )}
      />
    </span>
  );
}

/** The part for one gap of an open step. */
export function SlotGap({ gap, label, play }: PartProps): JSX.Element {
  if (play.given[gap.id] !== undefined) return <GivenGap gap={gap} label={label} play={play} />;
  if (gap.kind === Family.Choose) return <ChosenSlot gap={gap} label={label} play={play} />;
  if (gap.input === "fraction") return <FractionGap gap={gap} label={label} play={play} />;
  if (gap.input === "number") return <NumberGap gap={gap} label={label} play={play} />;
  return <TextGap gap={gap} label={label} play={play} />;
}
