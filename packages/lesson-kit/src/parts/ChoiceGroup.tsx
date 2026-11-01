/**
 * Part: a set of options the learner picks from, one or several (dl-w3.37.10). Every family that
 * offers options draws them with it: Choose (true or false, pick the number, A to E, pick all that
 * apply) and a chosen gap in Gaps. It replaces five hand-made button rows with one behaviour.
 *
 * - One: a radio group on the existing ChoiceList part (arrow keys), so it must sit inside a
 *   StepFrame.
 * - Several: a group of checkboxes, each a button with role="checkbox".
 *
 * - Number keys (`numberKeys`, paper-behaviour README §3.3): the first four options wear a key badge,
 *   1 to 4, drawn only on a keyboard frame (styles/stage.css), and that key picks the option and
 *   takes the focus to it. A to E is a numbered list on screen (Choose addendum 2.2, decision
 *   dl-n501): its badges and keys go to 5, it has no letters and no A to E keys, and only paper
 *   (ChoiceStatic `paper`) still prints the letters.
 * - Centred tiles (`grid`, `binary`, addendum 1.5 and 1.6): the tried word and the solution's eye
 *   and word sit on the tile's top edge, and on a laptop the badge is absolute at the tile's left,
 *   or in its top-left corner for a dot array, so the answer stays centred.
 * - Keys (§3.3): one answer is a radio group (ChoiceList.tsx). With several, ↑ and ↓ move the focus
 *   only, since a pick that followed the focus would switch the others off, and Space switches the
 *   focused option. Enter is the step's (StepShell.tsx): every option carries data-option.
 *
 * Behaviour and layout, not judgement: the caller passes which options are chosen and each one's
 * tone (tone.ts). A pick only picks; the step's Sprawdź checks (lesson frame rule 2).
 */

import { cn } from "@jadwigo/ui";
import { Check } from "lucide-react";
import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useRef } from "react";
import type { Clock, Instant } from "../stage/clock.ts";
import { type PressModality, press } from "../stage/press.ts";
import type { Language } from "../stage/types.ts";
import { ChoiceList } from "./ChoiceList.tsx";
import { STATUS, StepStatus } from "./status.ts";
import { FOCUS_CLASS, REMOVED_CLASS, TONE_CLASS, type Tone } from "./tone.ts";

export interface ChoiceItem {
  id: string;
  content: ReactNode;
  /** The printed letter of A to E: paper prints it, the screen does not (addendum 2.2). */
  letter?: string | undefined;
  /** A dot array: on a laptop its key badge goes in the top-left corner (addendum 1.6). */
  array?: boolean | undefined;
  /** A row of pictures: beside them "sprawdzone" and the eye + "Rozwiązanie" would wrap and grow
   * the row, so they go on its top edge, as on a centred tile (addendum 1.5; dl-uukj.29.94). */
  pictures?: boolean | undefined;
  tone: Tone;
  /** A word under a tried option, so the mark does not rest on colour alone. */
  note?: string | undefined;
  /** The help ladder's rung 1 outlines it: where to look (families/help.ts). */
  focus?: boolean | undefined;
  /** The help ladder's rung 2 took it away: it stays in its place, settled and not pressable. */
  removed?: boolean | undefined;
  /** Once a step ends without a right answer, the right option shows the solution: an eye and
   * these words ("Rozwiązanie"), on the question card's paper (data-solution, README §3). */
  solution?: string | undefined;
  /** The screens' lang for `note` and `solution`, which are the screens' words drawn under the
   * lesson's lang (dl-uukj.41); absent outside a lesson. */
  wordsLang?: Language | undefined;
}

export type ChoiceLayout = "list" | "grid" | "binary" | "lettered";

/** How a layout is drawn on screen: A to E is a list there (addendum 2.2); paper keeps it lettered. */
const onScreen = (layout: ChoiceLayout): ChoiceLayout => (layout === "lettered" ? "list" : layout);
const isCentred = (layout: ChoiceLayout): boolean => layout === "grid" || layout === "binary";
/** Whether an option's words hang on its top edge (addendum 1.5): a centred tile, or a row of
 * pictures, whose rect must not change between a miss and the solution (section 4; dl-uukj.29.94). */
const onEdge = (item: ChoiceItem, layout: ChoiceLayout): boolean =>
  isCentred(layout) || item.pictures === true;

const LAYOUT: Record<ChoiceLayout, string> = {
  list: "flex flex-col gap-[var(--kid-choice-gap)]",
  lettered: "flex flex-col gap-[var(--kid-choice-gap)]",
  // Two columns, or four where each tile holds its key badge at its side: .kid-choice-grid in
  // styles/stage.css decides by the grid's own width, not the window's.
  grid: "kid-choice-grid grid grid-cols-2 gap-[var(--kid-choice-gap)]",
  binary: "grid grid-cols-2 gap-[var(--kid-choice-gap)]",
};

// A mark fades in its 120 ms as another pick clears it (§3.3).
const CELL =
  "min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)] rounded-xl border-2 px-4 py-3 text-[length:var(--kid-answer-size)] font-semibold flex items-center gap-3 transition-colors duration-[var(--jw-dur-mark,120ms)]";

/** The number keys and their badges stop at 4 (§3.3), and at 5 for A to E (addendum 2.2). */
const keysFor = (layout: ChoiceLayout): number => (layout === "lettered" ? 5 : 4);

/** What takes the focus for an option: a radio's sr-only input, a checkbox, a token. */
const FOCUSABLE =
  '[data-option] input[type="radio"]:not(:disabled), button[data-option]:not([aria-disabled="true"]), [aria-pressed]:not([aria-disabled="true"])';

/**
 * Put the focus on an option inside `root`: the one with this id, or with none the first that can
 * take it. Enter or Sprawdź with nothing picked moves here, and after every check the focus comes
 * back to the pick (§3.3). It never scrolls: the step's own scroll rules do that.
 */
/**
 * A footer button (Sprawdź, the end screen's Dalej) is read at pointerdown, and the mousedown after
 * it would take the focus to the button, or to nothing once the band has taken its place. That one
 * mousedown leaves the focus where it is, on the pick or the first option (§3.3).
 */
export function keepFocusThroughPress(): void {
  const hold = (event: Event): void => event.preventDefault();
  // A tap's mousedown comes after its pointerup, so the press ends at its click.
  const done = (): void => document.removeEventListener("mousedown", hold, { capture: true });
  document.addEventListener("mousedown", hold, { capture: true, once: true });
  document.addEventListener("click", done, { capture: true, once: true });
}

export function focusOption(root: HTMLElement | null, id?: string): boolean {
  const all = [...(root?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
  const el =
    id === undefined
      ? all[0]
      : all.find((e) => e.closest("[data-option]")?.getAttribute("data-option") === id);
  if (el === undefined) return false;
  if (document.activeElement !== el) el.focus({ preventScroll: true });
  return true;
}

function look(item: ChoiceItem, chosen: boolean, layout: ChoiceLayout): string {
  // A centred tile is the box its edge label hangs from (addendum 1.5).
  const centred = isCentred(layout)
    ? "relative justify-center text-center"
    : onEdge(item, layout)
      ? "relative"
      : "";
  const help = cn(
    item.focus && FOCUS_CLASS,
    item.removed && cn(REMOVED_CLASS, "cursor-default line-through"),
  );
  if (item.removed) return cn(CELL, centred, help);
  if (item.tone !== "idle") return cn(CELL, centred, TONE_CLASS[item.tone], help);
  return cn(CELL, centred, chosen ? "border-primary bg-primary/10" : "border-border bg-card", help);
}

function Face({
  item,
  layout,
  box,
  badge,
  paper = false,
}: {
  item: ChoiceItem;
  layout: ChoiceLayout;
  box?: boolean | undefined;
  badge?: number | undefined;
  paper?: boolean | undefined;
}): JSX.Element {
  // On a centred tile the words go on its top edge, so the answer stays centred (addendum 1.5); on a
  // row of pictures too, so the row keeps its height (dl-uukj.29.94).
  const edge = onEdge(item, layout);
  const words = item.wordsLang === undefined ? {} : { lang: item.wordsLang };
  return (
    <>
      {badge !== undefined && (
        <span aria-hidden="true" data-key-badge>
          {badge}
        </span>
      )}
      {box !== undefined && (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md border-2",
            box ? "border-primary bg-primary text-primary-foreground" : "border-border",
          )}
        >
          {box && <Check className="size-6" />}
        </span>
      )}
      {paper && layout === "lettered" && item.letter && (
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-current text-xl font-bold"
        >
          {item.letter}
        </span>
      )}
      <span className="flex flex-col">
        {item.content}
        {item.note && !edge && (
          <span className="text-base font-normal" {...words}>
            {item.note}
          </span>
        )}
      </span>
      {item.solution && !edge && <SolutionLabel words={item.solution} lang={item.wordsLang} />}
      {edge &&
        (item.solution ? (
          <EdgeLabel words={item.solution} solution lang={item.wordsLang} />
        ) : item.note ? (
          <EdgeLabel words={item.note} lang={item.wordsLang} />
        ) : null)}
    </>
  );
}

/** The eye of the solution (the state table's, status.ts) and its word, at the option's end. */
function SolutionLabel({
  words,
  lang,
}: {
  words: string;
  lang?: Language | undefined;
}): JSX.Element {
  const Eye = STATUS[StepStatus.MovedOn].icon;
  return (
    <span
      data-solution-label
      className="ml-auto flex items-center gap-1 font-normal"
      {...(lang === undefined ? {} : { lang })}
    >
      {Eye !== null && Eye !== "spinner" && <Eye aria-hidden="true" />}
      {words}
    </span>
  );
}

/**
 * A word on a centred tile's top edge (addendum 1.5): a pill 24 tall, centred on the tile's top line,
 * in the tile's own edge and fill for "sprawdzone", and on the page with an ink edge for the
 * solution's eye and "Rozwiązanie". The tile keeps its size and its answer stays centred.
 */
function EdgeLabel({
  words,
  solution = false,
  lang,
}: {
  words: string;
  solution?: boolean | undefined;
  lang?: Language | undefined;
}): JSX.Element {
  const Eye = STATUS[StepStatus.MovedOn].icon;
  return (
    <span
      data-edge-label
      {...(lang === undefined ? {} : { lang })}
      {...(solution ? { "data-solution-label": "" } : {})}
      className={cn(
        "absolute left-1/2 top-[-0.8125rem] flex h-6 -translate-x-1/2 items-center gap-[0.3125rem] whitespace-nowrap rounded-full border-2 px-2.5 text-[0.9375rem] font-normal leading-none",
        solution
          ? "border-solid border-inherit bg-background text-muted-foreground"
          : "border-dashed border-inherit bg-inherit",
      )}
    >
      {solution && Eye !== null && Eye !== "spinner" && (
        <Eye aria-hidden="true" className="size-4" />
      )}
      {words}
    </span>
  );
}

/** Where a laptop's key badge sits on a centred tile (addendum 1.6): at its left, or in the
 * top-left corner of a dot array, which is too wide for the side. styles/stage.css draws both. */
function badgeAt(
  item: ChoiceItem,
  layout: ChoiceLayout,
  badge: number | undefined,
): Record<`data-${string}`, string> {
  if (badge === undefined || !isCentred(layout)) return {};
  // side-4: a grid of four on a laptop; side-2: two side by side. Each takes the side only when its
  // tiles are wide enough (styles/stage.css).
  return { "data-badge-at": item.array ? "corner" : layout === "binary" ? "side-2" : "side-4" };
}

/** What the help ladder and the solution say about an option, as data-* for the theme: the live
 * options wear the solution's look as ChoiceStatic's do (data-solution, README §3). */
function helpData(item: ChoiceItem): Record<`data-${string}`, string> {
  return {
    ...(item.focus ? { "data-help-focus": "true" } : {}),
    ...(item.removed ? { "data-help-removed": "true" } : {}),
    ...(item.solution ? { "data-solution": "" } : {}),
  };
}

export function ChoiceGroup({
  label,
  items,
  select,
  layout,
  chosen,
  locked,
  clock,
  onToggle,
  numberKeys = false,
  className,
}: {
  label: string;
  items: ChoiceItem[];
  select: "one" | "many";
  layout: ChoiceLayout;
  chosen: readonly string[];
  locked: boolean;
  clock: Clock;
  /** One: the option picked. Several: the option switched on or off. */
  onToggle(id: string, at: Instant, modality: PressModality): void;
  /** The key badges 1 to 4, and those keys pick (§3.3). */
  numberKeys?: boolean | undefined;
  className?: string | undefined;
}): JSX.Element {
  const keys = numberKeys;
  const max = keysFor(layout);
  const shown = onScreen(layout);
  const group = useRef<HTMLDivElement>(null);
  const live = useRef({ items, locked, onToggle });
  live.current = { items, locked, onToggle };
  useEffect(() => {
    if (!keys) return;
    const onKey = (event: KeyboardEvent): void => {
      if (
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        !/^[1-9]$/.test(event.key) ||
        Number(event.key) > max
      )
        return;
      // A digit typed into a field is the field's; an option's own radio is not a field.
      if (
        event.target instanceof Element &&
        event.target.closest('input:not([type="radio"]), textarea, [contenteditable="true"]')
      )
        return;
      const { items, locked, onToggle } = live.current;
      const item = items[Number(event.key) - 1];
      if (item === undefined || locked || item.removed) return;
      event.preventDefault();
      focusOption(group.current, item.id);
      onToggle(item.id, clock.now(), "keyboard");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [keys, max, clock]);
  const badge = (i: number): number | undefined => (keys && i < max ? i + 1 : undefined);
  if (select === "one") {
    return (
      <div ref={group} className="contents">
        <ChoiceList
          label={label}
          selected={chosen[0] ?? null}
          locked={locked}
          clock={clock}
          onChoose={(id, at, modality) => {
            if (!items.find((i) => i.id === id)?.removed) onToggle(id, at, modality);
          }}
          className={cn(LAYOUT[shown], className)}
          options={items.map((item, i) => ({
            value: item.id,
            unavailable: item.removed,
            className: look(item, chosen.includes(item.id), shown),
            data: {
              "data-option": item.id,
              "data-tone": item.tone,
              ...(item.letter ? { "data-letter": item.letter } : {}),
              ...badgeAt(item, shown, badge(i)),
              ...helpData(item),
            },
            children: <Face item={item} layout={shown} badge={badge(i)} />,
          }))}
        />
      </div>
    );
  }
  // ↑ and ↓ walk the checkboxes, wrapping, over any the help ladder took away.
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (step === 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    const boxes = [...event.currentTarget.querySelectorAll<HTMLElement>("button[data-option]")];
    const at = boxes.indexOf(event.target as HTMLElement);
    if (at < 0) return;
    event.preventDefault();
    for (let i = 1; i < boxes.length; i++) {
      const n = (at + step * i + boxes.length) % boxes.length;
      if (items[n]?.removed) continue;
      boxes[n]?.focus();
      return;
    }
  };
  return (
    <div
      ref={group}
      role="group"
      aria-label={label}
      aria-disabled={locked || undefined}
      className={cn(LAYOUT[shown], className)}
      onKeyDown={onKeyDown}
    >
      {items.map((item, i) => {
        const on = chosen.includes(item.id);
        const handlers = press(clock, (at, modality) => {
          if (!locked && !item.removed) onToggle(item.id, at, modality);
        });
        return (
          <button
            key={item.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            aria-disabled={locked || item.removed || undefined}
            data-option={item.id}
            data-tone={item.tone}
            {...badgeAt(item, shown, badge(i))}
            {...helpData(item)}
            className={cn(
              look(item, on, shown),
              "cursor-pointer select-none",
              !isCentred(shown) && "text-left",
            )}
            onPointerDown={handlers.onPointerDown}
            onClick={handlers.onClick}
          >
            <Face item={item} layout={shown} box={on} badge={badge(i)} />
          </button>
        );
      })}
    </div>
  );
}

/**
 * The same options, inert: for a solution, a review, a preview or paper. A list, never a control,
 * so nothing reads as something to press. `paper` drops the colours and keeps the words and marks.
 */
export function ChoiceStatic({
  label,
  items,
  layout,
  chosen,
  paper = false,
  numberKeys = false,
  className,
}: {
  label: string;
  items: ChoiceItem[];
  layout: ChoiceLayout;
  chosen: readonly string[];
  paper?: boolean | undefined;
  /** The key badges the live options wore, drawn again in the option's tone (dl-uukj.29.86): the
   * solution after a miss changes only colours, never the numbers or a rect. Inert: no key picks. */
  numberKeys?: boolean | undefined;
  className?: string | undefined;
}): JSX.Element {
  // Paper keeps the letters of A to E (addendum 2.2); the screen draws it as a list.
  const drawn = paper ? layout : onScreen(layout);
  const badge = (i: number): number | undefined =>
    numberKeys && !paper && i < keysFor(layout) ? i + 1 : undefined;
  return (
    <ul aria-label={label} className={cn(LAYOUT[drawn], className)}>
      {items.map((item, i) => (
        // A still tile keeps the badge's room, and draws the badge when the live one did, so
        // the solution never moves an option (addendum section 4).
        <li
          key={item.id}
          data-tone={item.tone}
          data-solution={item.solution ? "" : undefined}
          data-still-option={paper ? undefined : ""}
          {...(paper ? {} : badgeAt(item, drawn, i < keysFor(layout) ? i + 1 : undefined))}
          className={
            paper
              ? cn(CELL, "border-current bg-transparent")
              : look(item, chosen.includes(item.id), drawn)
          }
        >
          <Face item={item} layout={drawn} paper={paper} badge={badge(i)} />
        </li>
      ))}
    </ul>
  );
}
