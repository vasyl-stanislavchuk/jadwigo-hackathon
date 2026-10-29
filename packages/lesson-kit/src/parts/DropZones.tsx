/**
 * Part: cards the learner puts into groups (dl-w3.37.11), for the Group family: sorting into two or
 * more groups, and matching pairs (a group that takes one card). Three ways, each giving the same
 * placement: drag a card onto a group, tap a card and then a group, or do that tap-tap from a
 * keyboard (every card and every group is a button). Tapping the tray puts a picked card back.
 * Each placement is announced in a polite live region.
 *
 * Behaviour, not judgement: the caller holds the placement, each card's tone and the step's tone,
 * and decides what a placement does (a full group, a card in several groups) and when to commit.
 *
 * A card the help ladder gave away (families/help.ts rung 2) is drawn settled and cannot be picked
 * up. A card or group rung 1 points at wears the help outline.
 */

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { type ReactNode, useRef, useState } from "react";
import type { Clock, Instant } from "../stage/clock.ts";
import { type PressModality, press } from "../stage/press.ts";
import type { Language } from "../stage/types.ts";
import { Grip } from "./Grip.tsx";
import { QUIET } from "./quiet.ts";
import { useTapPick, walkByArrows } from "./tapPick.ts";
import { FOCUS_CLASS, GIVEN_CLASS, TONE_CLASS, type Tone, wholeMark } from "./tone.ts";

export interface ZoneCard {
  id: string;
  content: ReactNode;
  /** The card's words, for the announcement. */
  text: string;
  tone: Tone;
  /** Given by the help ladder: settled where it is. */
  given?: boolean | undefined;
  /** Pointed at by the help ladder's first rung. */
  focus?: boolean | undefined;
}

export interface Zone {
  id: string;
  /** The group's words, for its name and the announcement. */
  label: string;
  /** What the group's heading shows, when it is more than its words (TeX, a picture). */
  content?: ReactNode | undefined;
  /** Pointed at by the help ladder's first rung. */
  focus?: boolean | undefined;
}

export const TRAY = "__tray__";

const CARD =
  "min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)] rounded-xl border-2 px-4 py-2 text-[length:var(--kid-answer-size)] font-semibold flex items-center justify-center gap-2 bg-card touch-none select-none cursor-grab";

function Card({
  card,
  from,
  picked,
  locked: lockedStep,
  clock,
  onTap,
}: {
  card: ZoneCard;
  from: string;
  picked: boolean;
  locked: boolean;
  clock: Clock;
  onTap(at: Instant, modality: PressModality): void;
}): JSX.Element {
  const locked = lockedStep || card.given === true;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${card.id}@${from}`,
    data: { card: card.id },
    disabled: locked,
  });
  const tap = press(clock, (at, modality) => !locked && onTap(at, modality));
  const look = card.given
    ? cn(GIVEN_CLASS, "cursor-default")
    : card.tone === "idle"
      ? picked
        ? "border-primary ring-4 ring-primary/40"
        : "border-border"
      : TONE_CLASS[card.tone];
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      aria-pressed={picked}
      aria-disabled={locked || undefined}
      data-tone={card.tone}
      data-help-given={card.given ? "true" : undefined}
      data-help-focus={card.focus ? "true" : undefined}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(CARD, isDragging && "z-10 opacity-80", look, card.focus && FOCUS_CLASS)}
      onPointerDown={(event) => {
        listeners?.["onPointerDown"]?.(event);
        tap.onPointerDown(event);
      }}
      onClick={tap.onClick}
    >
      <Grip grabbed={picked || isDragging} className={cn(locked && "opacity-0")} />
      {card.content}
    </button>
  );
}

function Place({
  id,
  label,
  content,
  children,
  active,
  focus = false,
  clock,
  onTap,
  className,
}: {
  id: string;
  label: string;
  content?: ReactNode | undefined;
  children: ReactNode;
  active: boolean;
  focus?: boolean | undefined;
  clock: Clock;
  onTap(at: Instant, modality: PressModality): void;
  className?: string | undefined;
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id });
  const tap = press(clock, onTap);
  return (
    <div
      ref={setNodeRef}
      data-help-focus={focus ? "true" : undefined}
      className={cn(
        "flex flex-col gap-2 rounded-2xl border-2 border-dashed p-3",
        isOver || active ? "border-primary bg-primary/5" : "border-border",
        focus && FOCUS_CLASS,
        className,
      )}
    >
      <button
        type="button"
        data-drop-target
        className="min-h-[var(--kid-tap-min)] rounded-lg text-left text-xl font-semibold"
        aria-label={label}
        onPointerDown={tap.onPointerDown}
        onClick={tap.onClick}
      >
        {content ?? label}
      </button>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function DropZones({
  language,
  label,
  cards,
  zones,
  placement,
  tone,
  locked,
  clock,
  onPlace,
}: {
  language: Language;
  label: string;
  cards: ZoneCard[];
  zones: Zone[];
  /** Each card's groups; a card in none sits in the tray. */
  placement: Record<string, readonly string[]>;
  /** The step's own tone, when a miss marks it as a whole. */
  tone: Tone;
  locked: boolean;
  clock: Clock;
  /** A card dropped on a group, or on the tray (TRAY). `from` is where it was picked up. */
  onPlace(card: string, to: string, from: string, at: Instant, modality: PressModality): void;
}): JSX.Element {
  const tap = useTapPick();
  const [said, setSaid] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );
  const textOf = (id: string) => cards.find((c) => c.id === id)?.text ?? id;
  const pickedCard = tap.picked?.split("@")[0] ?? null;

  const place = (card: string, from: string, to: string, at: Instant, modality: PressModality) => {
    const zone = zones.find((z) => z.id === to);
    setSaid(
      zone
        ? copy(language, "drag_in_group", { item: textOf(card), group: zone.label })
        : copy(language, "drag_tray"),
    );
    onPlace(card, to, from, at, modality);
  };

  const tapCard = (card: string, from: string) => (_at: Instant) => {
    const key = `${card}@${from}`;
    if (tap.picked === null) setSaid(copy(language, "drag_picked", { item: textOf(card) }));
    tap.toggle(key);
  };

  const tapPlace = (to: string) => (at: Instant, modality: PressModality) => {
    if (tap.picked === null || locked) return;
    const [card = "", from = ""] = tap.picked.split("@");
    place(card, from, to, at, modality);
    tap.clear();
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over === null || locked) return;
    const [card = "", from = ""] = String(active.id).split("@");
    if (String(over.id) !== from) place(card, from, String(over.id), clock.now(), "click");
  };

  const inTray = cards.filter((c) => (placement[c.id] ?? []).length === 0);
  const card = (c: ZoneCard, from: string) => (
    <Card
      key={`${c.id}@${from}`}
      card={c}
      from={from}
      picked={tap.picked === `${c.id}@${from}`}
      locked={locked}
      clock={clock}
      onTap={tapCard(c.id, from)}
    />
  );

  return (
    // The arrows walk the cards, or with one picked, the tray and the groups (tapPick.ts).
    <div
      ref={root}
      onKeyDown={(event) =>
        walkByArrows(
          event,
          root.current,
          tap.picked === null ? "button[aria-pressed]" : "[data-drop-target]",
        )
      }
      role="group"
      aria-label={label}
      {...wholeMark(tone, "flex flex-col gap-4")}
    >
      <p className="text-muted-foreground text-base">{copy(language, "drag_hint")}</p>
      <DndContext
        accessibility={QUIET}
        sensors={sensors}
        onDragStart={tap.clear}
        onDragEnd={onDragEnd}
      >
        <Place
          id={TRAY}
          label={copy(language, "drag_tray")}
          active={pickedCard !== null && tap.picked?.split("@")[1] !== TRAY}
          clock={clock}
          onTap={tapPlace(TRAY)}
        >
          {inTray.map((c) => card(c, TRAY))}
        </Place>
        <div
          className={cn(
            "grid gap-[var(--kid-choice-gap)]",
            zones.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3",
          )}
        >
          {zones.map((z) => (
            <Place
              key={z.id}
              id={z.id}
              label={z.label}
              content={z.content}
              active={pickedCard !== null}
              focus={z.focus === true}
              clock={clock}
              onTap={tapPlace(z.id)}
            >
              {cards
                .filter((c) => (placement[c.id] ?? []).includes(z.id))
                .map((c) => card(c, z.id))}
            </Place>
          ))}
        </div>
      </DndContext>
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </div>
  );
}
