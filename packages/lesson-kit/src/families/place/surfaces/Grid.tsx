/**
 * Place on a grid (spatial_build): tap a dot to build the rectangle from the corner to it; the grid
 * is buttons, so it takes the keyboard. After a miss the rectangle stays and the grid is amber as a
 * whole until the next move. Moved out of PlaceView.tsx (dl-w3.61.1).
 *
 * area_model (dl-w3.61.7) adds a split: a strip of buttons above the grid (between columns) and one
 * beside it (between rows), each at least the tap size. Tapping one splits the built rectangle there;
 * the arrow keys on the strip move the split one column or one row. The two parts take two shades
 * and a line between them, and the line under the grid reads the split as a sum ("6 × 5 + 6 × 2").
 * The strips and that line are drawn from the start, so nothing moves when the child splits. The
 * size and the split are marked apart after a miss. `cells` draws dots, unit squares, or an open
 * rectangle with no cells inside (the playground switch area_cells).
 */

import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { type KeyboardEvent, useState } from "react";
import { CELL } from "../../../parts/cells.ts";
import { TaskTarget } from "../../../parts/TaskTarget.tsx";
import { partTone, praised, TONE_CLASS, type Tone } from "../../../parts/tone.ts";
import type { Clock, Instant } from "../../../stage/clock.ts";
import { type PressModality, press } from "../../../stage/press.ts";
import type { Language } from "../../../stage/types.ts";
import { SIZE_PART, SPLIT_PART } from "../../answer.ts";
import type { Surface } from "../../names.ts";
import { showingSolution } from "../../view.ts";
import type { GridSplit } from "../model.ts";
import {
  type DataOf,
  PlaceShell,
  PlaceSolution,
  StillLabel,
  type SurfacePlayProps,
  type SurfaceStillProps,
  usePlaceStep,
} from "../surface.tsx";

type GridData = DataOf<typeof Surface.Grid>;
type Rect = { rows: number; cols: number; split?: GridSplit };

/** What to build, such as "3 × 4", big under the stem. */
export function GridLabel({ data }: { data: GridData }): JSX.Element {
  return <TaskTarget>{data.label}</TaskTarget>;
}

/** Which part of a split rectangle a cell is in: 0 before the split, 1 after it. */
const sideOf = (split: GridSplit | undefined, r: number, c: number): 0 | 1 =>
  split === undefined ? 0 : (split.axis === "cols" ? c : r) < split.at ? 0 : 1;

/** The split read as a sum: 6 × 7 split after 5 columns is "6 × 5 + 6 × 2". */
function splitSum(rect: Rect): string | null {
  const s = rect.split;
  if (s === undefined) return null;
  return s.axis === "cols"
    ? `${rect.rows} × ${s.at} + ${rect.rows} × ${rect.cols - s.at}`
    : `${s.at} × ${rect.cols} + ${rect.rows - s.at} × ${rect.cols}`;
}

interface GridProps {
  data: GridData;
  rect: Rect;
  tone: Tone;
  splitTone?: Tone | undefined;
  language: Language;
  clock?: Clock | undefined;
  onPick?(r: number, c: number, at: Instant, modality: PressModality): void;
  onSplit?(split: GridSplit, at: Instant, modality: PressModality): void;
}

function Grid({
  data,
  rect,
  tone,
  splitTone = "idle",
  language,
  clock,
  onPick,
  onSplit,
}: GridProps): JSX.Element {
  const splits = data.split === "one";
  const cells = data.cells ?? "dots";
  const columns = splits
    ? `var(--kid-tap-min) repeat(${data.size}, minmax(0, 1fr))`
    : `repeat(${data.size}, minmax(0, 1fr))`;
  const board = Array.from({ length: data.size * data.size }, (_, i) => {
    const r = Math.floor(i / data.size);
    const c = i % data.size;
    const on = r < rect.rows && c < rect.cols;
    const side = on ? sideOf(rect.split, r, c) : 0;
    // The split line: the edge after the last column (or row) of the first part.
    const split = on ? rect.split : undefined;
    const edge =
      split !== undefined && (split.axis === "cols" ? c === split.at - 1 : r === split.at - 1);
    const cell = (
      <GridCell
        key={i}
        on={on}
        side={side}
        cells={cells}
        edge={edge ? (split?.axis ?? null) : null}
        clock={clock}
        label={copy(language, "dims", { rows: r + 1, cols: c + 1 })}
        onPick={onPick ? (at, modality) => onPick(r, c, at, modality) : undefined}
      />
    );
    if (!splits) return cell;
    return c === 0
      ? [
          <SplitButton
            key={`r${r}`}
            axis="rows"
            n={r}
            rect={rect}
            tone={splitTone}
            language={language}
            clock={clock}
            onSplit={onSplit}
          />,
          cell,
        ]
      : cell;
  });
  return (
    <div className="flex flex-col gap-2">
      <div
        data-tone={tone}
        role="group"
        aria-label={data.label}
        className={cn(
          "grid rounded-xl border-2 p-2",
          cells === "open" ? "gap-0" : "gap-1",
          tone === "idle" ? "border-border" : TONE_CLASS[tone],
        )}
        style={{ gridTemplateColumns: columns }}
      >
        {splits && (
          <>
            <span aria-hidden="true" />
            {Array.from({ length: data.size }, (_, c) => (
              <SplitButton
                key={`c${c}`}
                axis="cols"
                n={c}
                rect={rect}
                tone={splitTone}
                language={language}
                clock={clock}
                onSplit={onSplit}
              />
            ))}
          </>
        )}
        {board}
      </div>
      {splits && (
        <p
          data-split-sum
          className="min-h-[var(--kid-tap-min)] text-2xl font-bold tabular-nums"
          aria-live="polite"
        >
          {splitSum(rect) ?? (
            <span className="text-jw-small font-normal text-muted-foreground">
              {copy(language, "split_none")}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * One place on a strip to split at: the button over column (or beside row) `n` splits after it,
 * so the last column or row of the rectangle has none. A place outside the rectangle keeps its
 * room and shows nothing. Arrow keys move the split along the strip.
 */
function SplitButton({
  axis,
  n,
  rect,
  tone,
  language,
  clock,
  onSplit,
}: {
  axis: GridSplit["axis"];
  n: number;
  rect: Rect;
  tone: Tone;
  language: Language;
  clock?: Clock | undefined;
  onSplit?: GridProps["onSplit"] | undefined;
}): JSX.Element {
  const length = axis === "cols" ? rect.cols : rect.rows;
  const at = n + 1;
  const usable = at < length;
  const chosen = rect.split?.axis === axis && rect.split.at === at;
  const notch = (
    <span
      aria-hidden="true"
      className={cn(
        "rounded-full",
        axis === "cols" ? "h-3/4 w-1.5" : "h-1.5 w-3/4",
        chosen
          ? tone === "idle"
            ? "bg-foreground"
            : tone === "amber"
              ? "bg-kid-try-again"
              : "bg-kid-correct"
          : "bg-muted-foreground/30",
      )}
    />
  );
  if (!usable) return <span aria-hidden="true" data-split-slot={`${axis}:${at}`} />;
  if (!onSplit || !clock)
    return (
      <span
        aria-hidden="true"
        data-split-slot={`${axis}:${at}`}
        className={cn(
          "flex",
          axis === "cols" ? "items-center justify-end" : "flex-col items-center justify-end",
        )}
      >
        {chosen ? notch : null}
      </span>
    );
  const h = press(clock, (when, modality) => onSplit({ axis, at }, when, modality));
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const by =
      axis === "cols"
        ? e.key === "ArrowRight"
          ? 1
          : e.key === "ArrowLeft"
            ? -1
            : 0
        : e.key === "ArrowDown"
          ? 1
          : e.key === "ArrowUp"
            ? -1
            : 0;
    if (by === 0) return;
    e.preventDefault();
    const next = Math.min(
      length - 1,
      Math.max(1, (rect.split?.axis === axis ? rect.split.at : at) + by),
    );
    onSplit({ axis, at: next }, clock.now(), "keyboard");
    const strip = e.currentTarget.parentElement;
    strip?.querySelector<HTMLButtonElement>(`[data-split="${axis}:${next}"]`)?.focus();
  };
  return (
    <button
      type="button"
      data-split={`${axis}:${at}`}
      aria-label={copy(language, axis === "cols" ? "split_after_col" : "split_after_row", {
        n: at,
      })}
      aria-pressed={chosen}
      className={cn(
        CELL,
        "border-transparent bg-transparent",
        axis === "cols" ? "items-end" : "justify-end",
      )}
      onPointerDown={h.onPointerDown}
      onClick={h.onClick}
      onKeyDown={onKeyDown}
    >
      {notch}
    </button>
  );
}

function GridCell({
  on,
  side,
  cells,
  edge,
  label,
  clock,
  onPick,
}: {
  on: boolean;
  side: 0 | 1;
  cells: NonNullable<GridData["cells"]>;
  edge: GridSplit["axis"] | null;
  label: string;
  clock?: Clock | undefined;
  onPick?: ((at: Instant, modality: PressModality) => void) | undefined;
}): JSX.Element {
  const fill = side === 0 ? "bg-primary" : "bg-primary/50";
  const line =
    edge === "cols"
      ? "border-r-4 border-r-foreground"
      : edge === "rows"
        ? "border-b-4 border-b-foreground"
        : "";
  const mark =
    cells === "dots" || !on ? (
      <span
        aria-hidden="true"
        className={cn("size-3 rounded-full", on ? fill : "bg-muted-foreground/30")}
      />
    ) : null;
  const look =
    cells === "squares" && on
      ? cn(fill, "rounded-md border-foreground/40")
      : cells === "open" && on
        ? cn(fill, "rounded-none border-transparent")
        : "border-transparent bg-transparent";
  if (!onPick || !clock)
    return (
      <span className={cn("flex aspect-square items-center justify-center border", look, line)}>
        {mark}
      </span>
    );
  const h = press(clock, onPick);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      className={cn(CELL, look, line)}
      onPointerDown={h.onPointerDown}
      onClick={h.onClick}
    >
      {mark}
    </button>
  );
}

const rectOf = (v: unknown): Rect | null =>
  v !== null && typeof v === "object" && "rows" in (v as object) ? (v as Rect) : null;

/** Whether a split matches the right one, from either end, on the same side. */
const sameSplit = (a: Rect, b: Rect): boolean => {
  if (b.split === undefined) return true;
  if (a.split === undefined) return false;
  const la = a.split.axis === "cols" ? a.cols : a.rows;
  const lb = b.split.axis === "cols" ? b.cols : b.rows;
  return la === lb && (a.split.at === b.split.at || a.split.at === lb - b.split.at);
};

export function GridStill({
  data,
  language,
  shown,
  right,
}: SurfaceStillProps<typeof Surface.Grid>): JSX.Element {
  const mine = rectOf(shown);
  const good = rectOf(right);
  const same =
    mine !== null &&
    good !== null &&
    mine.rows * mine.cols === good.rows * good.cols &&
    (mine.rows === good.rows || mine.rows === good.cols) &&
    sameSplit(mine, good);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {mine !== null && (
        <div className="flex flex-col gap-1">
          <StillLabel language={language} yours />
          <Grid
            data={data}
            rect={mine}
            tone={good === null ? "idle" : same ? "green" : "amber"}
            language={language}
          />
        </div>
      )}
      {good !== null && !same && (
        <div className="flex flex-col gap-1">
          <StillLabel language={language} yours={false} />
          <Grid data={data} rect={good} tone="green" language={language} />
        </div>
      )}
      {mine === null && good === null && (
        <Grid data={data} rect={{ rows: 0, cols: 0 }} tone="idle" language={language} />
      )}
    </div>
  );
}

export function GridPlay(props: SurfacePlayProps<typeof Surface.Grid>): JSX.Element {
  const { data, language, clock, live, feedback } = props;
  const seed = rectOf(props.initialValue ?? null);
  const [rect, setRect] = useState<Rect>(() => seed ?? { rows: 0, cols: 0 });
  const step = usePlaceStep(props);
  if (showingSolution(props))
    return (
      <PlaceSolution
        props={props}
        stem={data.stem}
        still={<GridStill data={data} language={language} shown={rect} right={props.solution} />}
      />
    );

  const value = rect.rows > 0 ? rect : null;
  const splits = data.split === "one";
  // An area model is marked per part (size, split); a plain grid as a whole.
  const tone =
    splits && feedback?.parts !== undefined
      ? praised(feedback)
        ? "green"
        : partTone(SIZE_PART, feedback, step.changed)
      : step.whole;
  const splitTone =
    splits && feedback?.parts !== undefined
      ? praised(feedback)
        ? "green"
        : partTone(SPLIT_PART, feedback, step.changed)
      : "idle";
  return (
    <PlaceShell
      props={props}
      step={step}
      value={value}
      stem={data.stem}
      under={<GridLabel data={data} />}
      answer={
        <Grid
          data={data}
          rect={rect}
          tone={tone}
          splitTone={splitTone}
          language={language}
          clock={clock}
          onPick={(r, c, when, modality) => {
            if (!live) return;
            step.moved(when, modality, SIZE_PART);
            // A new rectangle keeps its split only where the split still falls inside it.
            setRect((old) => {
              const next: Rect = { rows: r + 1, cols: c + 1 };
              const s = old.split;
              return s !== undefined && s.at < (s.axis === "cols" ? next.cols : next.rows)
                ? { ...next, split: s }
                : next;
            });
          }}
          onSplit={(split, when, modality) => {
            if (!live) return;
            step.moved(when, modality, SPLIT_PART);
            setRect((old) => ({ ...old, split }));
          }}
        />
      }
    />
  );
}
