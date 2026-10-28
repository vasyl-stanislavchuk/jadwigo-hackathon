/**
 * Part: a chosen gap (split out of SlotsView.tsx, dl-uukj.29.120). `GapMenu` is the gap while the
 * step is open; `WholeWord` is the right form once the step is right.
 *
 * The Slots session's dropdown (addendum slots-2026-10-27.md 2.2, decision dl-4e0f, lane B
 * dl-uukj.29.123): the gap is the field with a chevron at its right, as wide as its widest option.
 * A tap, Enter or Space opens a list directly under the gap, 8 px below it, or above it when the
 * phone's dock or the footer is in the way. Phone and laptop behave the same: the options never
 * go to the dock. While the list is open only this gap draws the focus border and the keypad goes
 * quiet (SlotsView.tsx, Keypad.tsx). No option is focused on open, so none draws a ring
 * (dl-xx9f); ↑ ↓ move the keyboard's outline along the options (keyboardFocus.ts listMove).
 */

import { cn, Popover, PopoverContent, PopoverTrigger } from "@jadwigo/ui";
import { ChevronDown } from "lucide-react";
import { type CSSProperties, type KeyboardEvent, useRef, useState } from "react";
import { FIELD_BOX } from "../../parts/InlineField.tsx";
import { listMove } from "../../parts/keyboardFocus.ts";
import { RichText } from "../../parts/RichText.tsx";
import { GIVEN_CLASS, MARK_FADE, TONE_CLASS, type Tone } from "../../parts/tone.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { type PressModality, press } from "../../stage/press.ts";
import type { Family } from "../names.ts";
import type { Gap } from "./model.ts";

export type ChosenGap = Extract<Gap, { kind: typeof Family.Choose }>;

/** The list's gap under (or over) its gap, and its least width (addendum 2.2). */
const LIST_OFFSET = 8;
const LIST_MIN = 160;

/** A chosen gap is the typed gap's field (InlineField.tsx `FIELD_BOX`, addendum 3.1): 64 tall in
 * every state, r16, 2 px edge, bold, at its line's type size, with 14 on the left and 12 on the
 * right of the chevron (addendum 2.2). Its length is its widest option (`Footprint`), never the
 * pick, and never under a number field's 72. */
const MENU_BOX = cn(FIELD_BOX, "gap-2 pr-3");
const MENU_MIN = "4.5rem";

/** The chevron: 22 px, at the gap's right. */
const CHEVRON = "size-[1.375rem] shrink-0";

/** Every option sits in the slot unseen, so the gap is as wide as its widest option from the first
 * frame and never moves when a pick arrives (dl-w3.29). */
function Footprint({ gap, shown }: { gap: ChosenGap; shown: JSX.Element | null }): JSX.Element {
  return (
    <span className="grid min-w-[3ch] flex-1">
      {gap.options.map((o) => (
        <span
          key={o.id}
          aria-hidden
          className="invisible col-start-1 row-start-1 whitespace-nowrap"
        >
          <RichText inline text={o.label} />
        </span>
      ))}
      {shown}
    </span>
  );
}

/**
 * A chosen gap once the step is right (addendum 2.2): it turns green like a typed gap, the right
 * fill inside its 2 px edge, flat, with the chevron held unseen so it keeps the menu's footprint.
 * The dotted green underline word of dl-w3.68.2 is gone.
 */
export function WholeWord({
  gap,
  value,
  width,
}: {
  gap: ChosenGap;
  value: string;
  width?: string | undefined;
}): JSX.Element {
  return (
    <ChosenStill gap={gap} value={value} width={width} tone="green" data-reads-whole={gap.id} />
  );
}

/**
 * A chosen gap nobody picks in now, in the menu's own box (its footprint, its least width, its
 * chevron's room), so it stands exactly where the menu stood: right (green, the chevron unseen),
 * given by help's rung 2 (help yellow, Slots addendum 2.3), or the child's pick beside the solution
 * (its mark kept, addendum 6).
 */
export function ChosenStill({
  gap,
  value,
  width,
  tone,
  given = false,
  label,
  ...attrs
}: {
  gap: ChosenGap;
  value: string;
  width?: string | undefined;
  tone: Tone;
  /** Help's rung 2 gave it: help yellow and locked (foundation.css `data-help-given`). */
  given?: boolean | undefined;
  label?: string | undefined;
  "data-reads-whole"?: string;
  "data-gap"?: string;
}): JSX.Element {
  const chosen = gap.options.find((o) => o.id === value);
  const look = given ? GIVEN_CLASS : tone === "idle" ? "border-border bg-card" : TONE_CLASS[tone];
  return (
    <span
      {...attrs}
      role="group"
      aria-label={label}
      aria-disabled={given || undefined}
      data-help-given={given ? "true" : undefined}
      data-tone={tone}
      style={{ minWidth: MENU_MIN, ...(width ? { width } : {}) }}
      className={cn(MENU_BOX, look)}
    >
      <Footprint
        gap={gap}
        shown={
          <span
            data-pick={chosen ? chosen.id : ""}
            className="col-start-1 row-start-1 whitespace-nowrap"
          >
            {chosen ? <RichText inline text={chosen.label} /> : null}
          </span>
        }
      />
      <ChevronDown
        aria-hidden
        className={cn(CHEVRON, (tone === "green" || given) && "invisible")}
      />
    </span>
  );
}

/** The bottom of the room a list may open into: above the phone's docked tools and the footer when
 * they stand fixed over the page, else the window's bottom. */
function roomBelow(): number {
  if (typeof window === "undefined") return 0;
  const tops = [
    ...document.querySelectorAll<HTMLElement>("[data-tools-dock]:not([data-folded]), [data-bar]"),
  ]
    .filter(
      (el) => getComputedStyle(el).position === "fixed" && el.getBoundingClientRect().height > 0,
    )
    .map((el) => el.getBoundingClientRect().top);
  const floor = Math.min(window.innerHeight, ...tops);
  return Math.max(0, window.innerHeight - floor);
}

/** A chosen gap: the field with a chevron, showing the pick. It opens the options as a list of
 * full-size buttons under itself, by tap, Enter or Space. A pick, Escape or a tap anywhere else
 * closes it, focus back on the gap. */
export function GapMenu({
  gap,
  label,
  value,
  tone,
  live,
  clock,
  open,
  onOpenChange,
  focused = false,
  width,
  onPick,
}: {
  gap: ChosenGap;
  label: string;
  value: string | null;
  tone: Tone;
  live: boolean;
  clock: Clock;
  /** Whether the list is open: the step holds it, so the keypad and the other gaps go quiet. */
  open: boolean;
  onOpenChange(open: boolean): void;
  /** After a miss, the gap the child is in (the first missed one, not away): its word keeps the
   * miss mark under the focus border, never selected (addendum 2.2). */
  focused?: boolean | undefined;
  /** A width the caller fixes (a table cell's, say); unset, the widest option sets it, as a typed
   * gap's length setting sets its own (addendum 3.1). */
  width?: string | undefined;
  onPick(id: string, at: Instant, modality: PressModality): void;
}): JSX.Element {
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  // The room the list may not cover, measured as it opens, and the theme it carries out of the
  // page (the list is portalled to the body, outside [data-lesson-theme]).
  const [below, setBelow] = useState(0);
  const [theme, setTheme] = useState<string | undefined>(undefined);
  const chosen = gap.options.find((o) => o.id === value);
  const shown = open && live;
  const change = (next: boolean) => {
    if (next && live) {
      setBelow(roomBelow());
      setTheme(
        trigger.current?.closest("[data-lesson-theme]")?.getAttribute("data-lesson-theme") ??
          undefined,
      );
    }
    onOpenChange(next && live);
  };
  const look =
    tone === "idle"
      ? shown
        ? "border-primary bg-card"
        : "border-border bg-card"
      : TONE_CLASS[tone];
  const onListKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const options = [...(list.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    const at = options.findIndex((o) => o === document.activeElement);
    const to = listMove(event.key, at, options.length);
    if (to === null) return;
    event.preventDefault();
    options[to]?.focus();
  };
  // The theme's root draws a page's padding (lesson.css); the list carries the theme, not that.
  const listStyle: CSSProperties = {
    width: `max(${LIST_MIN}px, var(--radix-popover-trigger-width))`,
    padding: 0,
    borderRadius: 0,
    background: "transparent",
  };
  return (
    <Popover open={shown} onOpenChange={change}>
      <PopoverTrigger asChild>
        <button
          ref={trigger}
          type="button"
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={shown}
          aria-disabled={!live || undefined}
          data-tone={tone}
          data-field={gap.id}
          data-menu=""
          data-menu-open={shown ? "" : undefined}
          data-menu-focused={focused && !shown ? "" : undefined}
          data-empty={value === null ? "" : undefined}
          style={{ minWidth: MENU_MIN, ...(width ? { width } : {}) }}
          className={cn(MENU_BOX, MARK_FADE, look)}
        >
          <Footprint
            gap={gap}
            shown={
              <span
                data-pick={chosen ? chosen.id : ""}
                className="col-start-1 row-start-1 whitespace-nowrap"
              >
                {chosen ? <RichText inline text={chosen.label} /> : " "}
              </span>
            }
          />
          <ChevronDown aria-hidden className={cn(CHEVRON, "opacity-70")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={LIST_OFFSET}
        collisionPadding={{ bottom: below + LIST_OFFSET, top: LIST_OFFSET }}
        data-lesson-theme={theme}
        data-gap-list={gap.id}
        style={listStyle}
        // No option takes the focus on open, so none draws a ring (dl-xx9f): the list holds
        // it, and ↓ goes to the first option.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          list.current?.focus({ preventScroll: true });
        }}
        className="gap-2 rounded-none border-0 bg-transparent p-0 shadow-none"
      >
        <div
          ref={list}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className="flex flex-col gap-2 outline-none"
          onKeyDown={onListKey}
        >
          {gap.options.map((o) => {
            const h = press(clock, (at, modality) => {
              onPick(o.id, at, modality);
              change(false);
            });
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={value === o.id}
                data-menu-option=""
                // 56 tall, r16, 2 px line on a 4 px pressed edge, paper, 22 px bold (addendum 2.2).
                className="flex h-14 w-full items-center rounded-2xl border-2 border-border bg-card px-4 text-left text-[1.375rem] leading-none font-bold whitespace-nowrap text-foreground shadow-[0_4px_0_var(--border)]"
                onPointerDown={h.onPointerDown}
                onClick={h.onClick}
              >
                <RichText inline text={o.label} />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
