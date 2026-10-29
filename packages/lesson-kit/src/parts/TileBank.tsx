/**
 * Part: a bank of tiles and a row of numbered places (dl-w3.51.9), for the Sequence family in tile
 * mode: `8`, `+`, `8` built from a bank of `8` and `+`, as Khan Academy's orderer does. The bank
 * always keeps its tiles, so a tile can be used in several places and a tile can stay unused.
 * Three ways, each giving the same answer: drag a tile onto a place (dnd-kit), tap a tile and then
 * the place it goes, or do that tap-tap from a keyboard (every tile and every place is a button).
 * Tapping a filled place with nothing picked empties it. Each move is announced in a polite live
 * region.
 *
 * Behaviour, not judgement: the caller holds what each place holds and the tone, and decides when
 * to commit.
 *
 * A place the help ladder gave away (families/help.ts rung 2) is fixed: it cannot be emptied or
 * dropped on. A tile or place rung 1 points at wears the help outline.
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

export interface BankTile {
  id: string;
  content: ReactNode;
  /** The tile's words, for the announcement. */
  text: string;
  /** Pointed at by the help ladder's first rung. */
  focus?: boolean | undefined;
}

export interface TilePlace {
  /** The place's id (`s1` is first), as the help ladder names it. */
  id: string;
  /** The tile it holds, or null while empty. */
  tile: string | null;
  /** Given by the help ladder: fixed, with its tile. */
  given?: boolean | undefined;
  /** Pointed at by the help ladder's first rung. */
  focus?: boolean | undefined;
  /** Marked by a Check pressed too soon, while still empty. */
  missing?: boolean | undefined;
}

const TILE =
  "min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)] rounded-xl border-2 px-4 py-2 text-[length:var(--kid-answer-size)] font-semibold flex items-center justify-center gap-2 bg-card touch-none select-none cursor-grab";

const PLACE =
  "min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)] rounded-xl border-2 px-3 py-2 text-[length:var(--kid-answer-size)] font-semibold flex items-center justify-center gap-2 bg-card";

const TILE_PREFIX = "tile:";
const PLACE_PREFIX = "place:";

function Tile({
  tile,
  picked,
  locked,
  clock,
  onTap,
}: {
  tile: BankTile;
  picked: boolean;
  locked: boolean;
  clock: Clock;
  onTap(at: Instant, modality: PressModality): void;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${TILE_PREFIX}${tile.id}`,
    disabled: locked,
  });
  const tap = press(clock, (at, modality) => !locked && onTap(at, modality));
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      aria-pressed={picked}
      aria-disabled={locked || undefined}
      data-tile={tile.id}
      data-help-focus={tile.focus ? "true" : undefined}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        TILE,
        isDragging && "z-10 opacity-80",
        picked ? "border-primary ring-4 ring-primary/40" : "border-border",
        tile.focus && FOCUS_CLASS,
      )}
      onPointerDown={(event) => {
        listeners?.["onPointerDown"]?.(event);
        tap.onPointerDown(event);
      }}
      onClick={tap.onClick}
    >
      <Grip grabbed={picked || isDragging} />
      {tile.content}
    </button>
  );
}

function Place({
  place,
  n,
  content,
  label,
  active,
  tone,
  locked,
  clock,
  onTap,
}: {
  place: TilePlace;
  n: number;
  content: ReactNode | null;
  label: string;
  active: boolean;
  tone: Tone;
  locked: boolean;
  clock: Clock;
  onTap(at: Instant, modality: PressModality): void;
}): JSX.Element {
  const fixed = locked || place.given === true;
  const { setNodeRef, isOver } = useDroppable({
    id: `${PLACE_PREFIX}${place.id}`,
    disabled: fixed,
  });
  const tap = press(clock, (at, modality) => !fixed && onTap(at, modality));
  const look = place.given
    ? GIVEN_CLASS
    : place.missing
      ? TONE_CLASS.missing
      : tone !== "idle"
        ? TONE_CLASS[tone]
        : isOver || active
          ? "border-primary bg-primary/5"
          : place.tile === null
            ? "border-dashed border-border"
            : "border-border";
  return (
    <li ref={setNodeRef}>
      <button
        type="button"
        aria-label={label}
        aria-disabled={fixed || undefined}
        data-place={place.id}
        data-tone={place.missing ? "missing" : tone}
        data-help-given={place.given ? "true" : undefined}
        data-help-focus={place.focus ? "true" : undefined}
        className={cn(PLACE, look, place.given && "cursor-default", place.focus && FOCUS_CLASS)}
        onPointerDown={tap.onPointerDown}
        onClick={tap.onClick}
      >
        <span aria-hidden="true" className="text-base font-bold text-muted-foreground tabular-nums">
          {n}
        </span>
        {content}
      </button>
    </li>
  );
}

export function TileBank({
  language,
  label,
  tiles,
  places,
  firstLabel,
  lastLabel,
  tone,
  locked,
  clock,
  onPlace,
}: {
  language: Language;
  label: string;
  tiles: BankTile[];
  /** The places, first to last, with what each holds. */
  places: TilePlace[];
  firstLabel: string;
  lastLabel: string;
  /** The step's own tone: a miss marks the whole row. */
  tone: Tone;
  locked: boolean;
  clock: Clock;
  /** A tile put in a place (`tile`), or a place emptied (null). `place` is its index, 0 first. */
  onPlace(place: number, tile: string | null, at: Instant, modality: PressModality): void;
}): JSX.Element {
  const tap = useTapPick();
  const [said, setSaid] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );
  const tileOf = (id: string | null) => tiles.find((t) => t.id === id) ?? null;
  /** The tile's words for an announcement: a TeX tile such as `$8$` is read without its marks. */
  const textOf = (id: string) => (tileOf(id)?.text ?? id).replaceAll("$", "").trim();

  const put = (i: number, tile: string, at: Instant, modality: PressModality) => {
    setSaid(copy(language, "drag_moved_to", { item: textOf(tile), n: i + 1 }));
    onPlace(i, tile, at, modality);
  };

  const tapTile = (id: string) => {
    if (tap.picked === null) setSaid(copy(language, "drag_picked", { item: textOf(id) }));
    tap.toggle(id);
  };

  const tapPlace = (i: number, at: Instant, modality: PressModality) => {
    if (locked) return;
    if (tap.picked !== null) {
      put(i, tap.picked, at, modality);
      tap.clear();
    } else if ((places[i]?.tile ?? null) !== null) {
      setSaid(copy(language, "tile_cleared", { n: i + 1 }));
      onPlace(i, null, at, modality);
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over === null || locked) return;
    const tile = String(active.id).slice(TILE_PREFIX.length);
    const i = places.findIndex((p) => `${PLACE_PREFIX}${p.id}` === String(over.id));
    if (i >= 0 && places[i]?.given !== true) put(i, tile, clock.now(), "click");
  };

  const ends = firstLabel.trim() !== "" && lastLabel.trim() !== "";

  return (
    // The arrows walk the tiles, or with one picked, the places it can go (tapPick.ts).
    <div
      ref={root}
      className="flex flex-col gap-4"
      role="group"
      aria-label={label}
      onKeyDown={(event) =>
        walkByArrows(event, root.current, tap.picked === null ? "[data-tile]" : "[data-place]")
      }
    >
      <p className="text-muted-foreground text-base">{copy(language, "tile_hint")}</p>
      <DndContext
        accessibility={QUIET}
        sensors={sensors}
        onDragStart={tap.clear}
        onDragEnd={onDragEnd}
      >
        <div className="flex flex-wrap gap-[var(--kid-choice-gap)]" data-bank>
          {tiles.map((tile) => (
            <Tile
              key={tile.id}
              tile={tile}
              picked={tap.picked === tile.id}
              locked={locked}
              clock={clock}
              onTap={() => tapTile(tile.id)}
            />
          ))}
        </div>
        {ends && (
          <p className="text-lg font-semibold">
            {firstLabel} → {lastLabel}
          </p>
        )}
        <ol {...wholeMark(tone, "flex flex-wrap items-center gap-[var(--kid-choice-gap)]")}>
          {places.map((place, i) => {
            const tile = tileOf(place.tile);
            const n = i + 1;
            return (
              <Place
                key={place.id}
                place={place}
                n={n}
                content={tile?.content ?? null}
                label={
                  tile === null
                    ? copy(language, "tile_slot_empty", { n })
                    : `${n}. ${textOf(tile.id)}`
                }
                active={tap.picked !== null}
                tone={tone}
                locked={locked}
                clock={clock}
                onTap={(at, modality) => tapPlace(i, at, modality)}
              />
            );
          })}
        </ol>
      </DndContext>
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </div>
  );
}
