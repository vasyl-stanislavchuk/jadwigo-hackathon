/**
 * Part: a list the learner puts in order (dl-w3.37.11), for the Sequence family. Four ways, each
 * giving the same order: drag a card with a finger or a mouse (dnd-kit's sortable list), tap a card
 * and then the card whose place it takes, do that tap-tap from a keyboard (every card is a button),
 * or press a card's up and down buttons, as ClassTime's sorter has (docs/17 §2f rule 9, dl-w3.41.4). Each move is announced in a polite live region. The ends are labelled ("smallest",
 * "largest"), and each place shows its number.
 *
 * The row is drawn after ClassTime's (owner, 2026-10-19, dl-w3.46.28): the place number outside the
 * card, a grip at its start, and the up and down arrows inside its end, shown only while the row is
 * hovered, holds keyboard focus or is picked by a tap (a tablet has no hover). Hidden arrows take no
 * pointer, so a tap on the card's end picks the card. A move by an arrow or by tap-tap slides the
 * rows to their new places and briefly rings the moved card, so the child sees which line changed
 * (dragging animates on its own). Nothing slides when the device asks for reduced motion.
 *
 * With `beside` (dl-w3.51.7, Group's match in two columns) a fixed card stands at each place, left
 * of the card that can move: the learner pairs the right column with the left by reordering it.
 * The places then show no number, and a move is announced as "beside" the fixed card.
 *
 * Behaviour, not judgement: the caller holds the order and its tone, and decides when to commit.
 * A card may carry its own tone when the result marked each place.
 *
 * A card the help ladder gave away (families/help.ts rung 2) is fixed: it cannot be picked up or
 * dropped on, and the other cards move around it, so it keeps its place whatever the learner does.
 * A card rung 1 points at wears the help outline.
 */

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { ArrowDown, ArrowUp } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { Clock, Instant } from "../stage/clock.ts";
import { type PressModality, press } from "../stage/press.ts";
import type { Language } from "../stage/types.ts";
import { Grip } from "./Grip.tsx";
import { QUIET } from "./quiet.ts";
import { moveTo, useTapPick } from "./tapPick.ts";
import { FOCUS_CLASS, GIVEN_CLASS, TONE_CLASS, type Tone } from "./tone.ts";

export interface SortItem {
  id: string;
  content: ReactNode;
  /** The card's words, for the announcement. */
  text: string;
  /** This card's own tone, when the result marked each place; absent, the list's tone. */
  tone?: Tone | undefined;
  /** Given by the help ladder: fixed in its place. */
  given?: boolean | undefined;
  /** Pointed at by the help ladder's first rung. */
  focus?: boolean | undefined;
}

/** A fixed card beside a place, which the card there pairs with. */
export interface SortBeside {
  content: ReactNode;
  /** The card's words, for the announcement. */
  text: string;
  /** Pointed at by the help ladder's first rung. */
  focus?: boolean | undefined;
}

/**
 * Move `id` to `target`'s place among the cards that are not fixed: fixed cards keep their index
 * and the others flow around them. Null when the move is refused (a fixed card or target).
 */
export function moveAround(
  order: readonly string[],
  id: string,
  target: string,
  fixed: ReadonlySet<string>,
): string[] | null {
  if (fixed.has(id) || fixed.has(target)) return null;
  const free = moveTo(
    order.filter((x) => !fixed.has(x)),
    id,
    target,
  );
  let n = 0;
  return order.map((x) => (fixed.has(x) ? x : (free[n++] ?? x)));
}

const CARD =
  "min-h-[var(--kid-tap-min)] w-full rounded-xl border-2 py-3 pl-3 pr-[calc(2*var(--kid-tap-min)+0.75rem)] text-left text-[length:var(--kid-answer-size)] font-semibold flex items-center gap-3 bg-card touch-none select-none cursor-grab";

/** The fixed card beside a place: the same size as the card it pairs with, never pressed. */
const BESIDE =
  "min-h-[var(--kid-tap-min)] flex-1 rounded-xl border-2 px-4 py-3 text-[length:var(--kid-answer-size)] font-semibold flex items-center bg-background";

const STEP =
  "group/step flex min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)] shrink-0 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none aria-disabled:opacity-30";
/** The arrow's visible box: smaller than its tap area, so the hover shade keeps clear of the card's
 * edges (owner, 2026-10-19). */
const STEP_FACE =
  "flex size-[calc(var(--kid-tap-min)-1rem)] items-center justify-center rounded-lg group-hover/step:bg-muted group-focus-visible/step:outline-2 group-focus-visible/step:outline-ring";

/** The arrows at the card's end: hidden and taking no pointer until the row is hovered, focused
 * from the keyboard or picked by a tap. */
const STEPS = "absolute inset-y-0 right-1 flex items-center gap-0.5 transition-opacity";
const STEPS_HIDDEN =
  "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100";

function StepButton({
  label,
  disabled,
  clock,
  onStep,
  children,
}: {
  label: string;
  disabled: boolean;
  clock: Clock;
  onStep(at: Instant, modality: PressModality): void;
  children: ReactNode;
}): JSX.Element {
  const h = press(clock, (at, modality) => !disabled && onStep(at, modality));
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={STEP}
      onPointerDown={h.onPointerDown}
      onClick={h.onClick}
    >
      <span className={STEP_FACE}>{children}</span>
    </button>
  );
}

function Card({
  item,
  place,
  beside,
  up,
  down,
  picked,
  tone,
  locked,
  language,
  clock,
  onTap,
  onStep,
}: {
  item: SortItem;
  place: number;
  beside: SortBeside | null;
  /** Whether there is a free place above or below to move to. */
  up: boolean;
  down: boolean;
  picked: boolean;
  tone: Tone;
  locked: boolean;
  language: Language;
  clock: Clock;
  onTap(at: Instant, modality: PressModality): void;
  onStep(by: -1 | 1, at: Instant, modality: PressModality): void;
}): JSX.Element {
  const fixed = locked || item.given === true;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: fixed,
  });
  const tap = press(clock, (at, modality) => !fixed && onTap(at, modality));
  const look = item.given
    ? GIVEN_CLASS
    : tone === "idle"
      ? picked
        ? "border-primary ring-4 ring-primary/40"
        : "border-border"
      : TONE_CLASS[tone];
  return (
    <li
      ref={setNodeRef}
      data-sort-id={item.id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group flex items-center gap-3", isDragging && "z-10 opacity-80")}
    >
      {beside === null ? (
        <span
          aria-hidden="true"
          data-place={place}
          className="text-muted-foreground w-8 shrink-0 text-right text-xl font-semibold tabular-nums"
        >
          {place}
        </span>
      ) : (
        <span
          data-beside
          data-tone={tone}
          data-help-focus={beside.focus ? "true" : undefined}
          className={cn(
            BESIDE,
            tone === "idle" ? "border-border" : TONE_CLASS[tone],
            beside.focus && FOCUS_CLASS,
          )}
        >
          {beside.content}
        </span>
      )}
      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          {...attributes}
          aria-pressed={picked}
          aria-disabled={fixed || undefined}
          data-tone={tone}
          data-help-given={item.given ? "true" : undefined}
          data-help-focus={item.focus ? "true" : undefined}
          className={cn(CARD, look, item.given && "cursor-default", item.focus && FOCUS_CLASS)}
          onPointerDown={(event) => {
            listeners?.["onPointerDown"]?.(event);
            tap.onPointerDown(event);
          }}
          onClick={tap.onClick}
          onKeyDown={(event) => {
            // The arrow keys move the card one free place (README §3, "Draggables").
            const by = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
            if (by === 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
              return;
            event.preventDefault();
            if (!fixed && (by === -1 ? up : down)) onStep(by, clock.now(), "keyboard");
          }}
        >
          <Grip grabbed={picked || isDragging} className={cn(fixed && "opacity-0")} />
          {item.content}
        </button>
        <div data-steps className={cn(STEPS, !picked && STEPS_HIDDEN)}>
          <StepButton
            label={`${copy(language, "move_up")}: ${item.text}`}
            disabled={fixed || !up}
            clock={clock}
            onStep={(at, modality) => onStep(-1, at, modality)}
          >
            <ArrowUp aria-hidden="true" />
          </StepButton>
          <StepButton
            label={`${copy(language, "move_down")}: ${item.text}`}
            disabled={fixed || !down}
            clock={clock}
            onStep={(at, modality) => onStep(1, at, modality)}
          >
            <ArrowDown aria-hidden="true" />
          </StepButton>
        </div>
      </div>
    </li>
  );
}

export function SortableList({
  language,
  label,
  items,
  beside,
  firstLabel,
  lastLabel,
  tone,
  locked,
  clock,
  onReorder,
}: {
  language: Language;
  label: string;
  /** The cards in their current order. */
  items: SortItem[];
  /** A fixed card at each place, by index, which the card there pairs with. */
  beside?: SortBeside[] | undefined;
  /** The ends, when the order runs from one thing to another; absent, no end is labelled. */
  firstLabel?: string | undefined;
  lastLabel?: string | undefined;
  tone: Tone;
  locked: boolean;
  clock: Clock;
  onReorder(order: string[], at: Instant, modality: PressModality): void;
}): JSX.Element {
  const tap = useTapPick();
  const [said, setSaid] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );
  const order = items.map((i) => i.id);
  const fixed = new Set(items.filter((i) => i.given).map((i) => i.id));
  const textOf = (id: string) => items.find((i) => i.id === id)?.text ?? id;
  /** The nearest place above (-1) or below (1) that is not fixed, as the card there. */
  const freeFrom = (i: number, by: -1 | 1): string | null => {
    for (let j = i + by; j >= 0 && j < order.length; j += by) {
      const id = order[j];
      if (id !== undefined && !fixed.has(id)) return id;
    }
    return null;
  };

  // The slide after an arrow or tap-tap move: each row's place before the move, then each row
  // animated from there to where it now stands (FLIP), and the moved card rung once.
  const listRef = useRef<HTMLOListElement>(null);
  const slide = useRef<{ before: Map<string, number>; moved: string } | null>(null);
  const orderKey = order.join("|");
  useLayoutEffect(() => {
    const pending = slide.current;
    slide.current = null;
    const list = listRef.current;
    if (pending === null || list === null) return;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    for (const row of list.querySelectorAll<HTMLElement>("[data-sort-id]")) {
      const id = row.dataset["sortId"] ?? "";
      const from = pending.before.get(id);
      const dy = from === undefined ? 0 : from - row.getBoundingClientRect().top;
      if (dy !== 0)
        row.animate?.([{ transform: `translateY(${dy}px)` }, { transform: "none" }], {
          duration: 200,
          easing: "ease-out",
        });
      if (id === pending.moved)
        row
          .querySelector("button[aria-pressed]")
          ?.animate?.(
            [
              { boxShadow: "0 0 0 0.375rem color-mix(in oklab, var(--primary) 35%, transparent)" },
              { boxShadow: "0 0 0 0 transparent" },
            ],
            { duration: 600, easing: "ease-out" },
          );
    }
  }, [orderKey]);

  // A card moved by its arrow keys keeps the focus at its new place: reordering the rows moves its
  // button in the page, which drops the focus.
  const refocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    const id = refocus.current;
    refocus.current = null;
    if (id === null) return;
    const row = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-sort-id]") ?? [])].find(
      (r) => r.dataset["sortId"] === id,
    );
    row?.querySelector<HTMLElement>("button[aria-pressed]")?.focus({ preventScroll: true });
  }, [orderKey]);

  const move = (
    id: string,
    target: string,
    at: Instant,
    modality: PressModality,
    animate = true,
  ) => {
    const next = moveAround(order, id, target, fixed);
    if (next === null) return;
    if (animate && listRef.current !== null) {
      const before = new Map<string, number>();
      for (const row of listRef.current.querySelectorAll<HTMLElement>("[data-sort-id]"))
        before.set(row.dataset["sortId"] ?? "", row.getBoundingClientRect().top);
      slide.current = { before, moved: id };
    }
    const n = next.indexOf(id);
    const other = beside?.[n];
    setSaid(
      other
        ? copy(language, "drag_beside", { item: textOf(id), other: other.text })
        : copy(language, "drag_moved_to", { item: textOf(id), n: n + 1 }),
    );
    onReorder(next, at, modality);
  };

  const onTap = (id: string, at: Instant, modality: PressModality) => {
    if (tap.picked === null || tap.picked === id) {
      if (tap.picked === null) setSaid(copy(language, "drag_picked", { item: textOf(id) }));
      tap.toggle(id);
      return;
    }
    move(tap.picked, id, at, modality);
    tap.clear();
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over === null || active.id === over.id || locked) return;
    move(String(active.id), String(over.id), clock.now(), "click", false);
  };

  // The words above and below start where the cards start, past the place numbers (w-8 + gap-3).
  const inset = beside === undefined ? "pl-11" : "";

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={label}>
      <p className={cn("text-muted-foreground text-jw-small", inset)}>
        {copy(language, "drag_hint")}
      </p>
      {firstLabel !== undefined && (
        <p className={cn("text-lg font-semibold", inset)}>↑ {firstLabel}</p>
      )}
      <DndContext
        accessibility={QUIET}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={tap.clear}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol ref={listRef} className="flex flex-col gap-[var(--kid-choice-gap)]">
            {items.map((item, i) => (
              <Card
                key={item.id}
                item={item}
                place={i + 1}
                beside={beside?.[i] ?? null}
                up={freeFrom(i, -1) !== null}
                down={freeFrom(i, 1) !== null}
                picked={tap.picked === item.id}
                tone={item.tone ?? tone}
                locked={locked}
                language={language}
                clock={clock}
                onTap={(at, modality) => onTap(item.id, at, modality)}
                onStep={(by, at, modality) => {
                  tap.clear();
                  const target = freeFrom(i, by);
                  if (target === null) return;
                  if (
                    modality === "keyboard" &&
                    document.activeElement
                      ?.closest("[data-sort-id]")
                      ?.getAttribute("data-sort-id") === item.id
                  )
                    refocus.current = item.id;
                  move(item.id, target, at, modality);
                }}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {lastLabel !== undefined && (
        <p className={cn("text-lg font-semibold", inset)}>↓ {lastLabel}</p>
      )}
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </div>
  );
}
