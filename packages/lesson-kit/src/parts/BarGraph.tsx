/**
 * Part: a graph drawn bar by bar, in SVG (dl-w3.51.3): a bar graph, a picture graph, a line plot
 * (X marks over a number line), a dot plot, a line graph (a point per category joined by a line)
 * or a histogram (bars with no gaps over bins, the bin edges labelled; dl-w3.61.3). Every category is one column, the whole column a
 * tap target the height of the plot (at least 56px wide, graph.ts MAX_CATEGORIES): a tap sets
 * the bar to the nearest step, a drag moves it, and from the keyboard each bar is a vertical
 * slider (Tab between bars, arrow keys up and down, Home and End). Every change is announced
 * through the slider's value text and a polite live region. Never draws a key.
 *
 * The words and numbers around the plot (the scale, the categories, a histogram's bin edges, the
 * unit and category names) are HTML at the kid sizes, outside the SVG (dl-uukj.29.71). Inside the
 * SVG, which scales with the column, they shrank to about 11 px on a phone. The SVG draws only the
 * plot, cropped to it, and the labels line up with it in percent. On a short graph the scale
 * labels thin out so they never touch.
 *
 * Tones come from tone.ts: a right bar is green with a solid outline, a missed one red with a
 * dashed outline (never colour alone), a bar the help ladder gave away is muted and locked, and a
 * bar rung 1 points at wears the dotted focus ring.
 */

import { cn } from "@jadwigo/ui";
import { X } from "lucide-react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import {
  column,
  type GraphCategory,
  type GraphData,
  gridValues,
  HEIGHT,
  heightAt,
  histogramBar,
  iconOf,
  isTexLabel,
  labelEvery,
  marksOf,
  nudgeHeight,
  numberedKind,
  PLOT,
  tickOf,
  yOf,
} from "./graph.ts";
import { RichText } from "./RichText.tsx";
import type { Tone } from "./tone.ts";

/** The drawing is cropped to the plot: a little room around it for the outline and the ticks. */
const VIEW = { x: PLOT.x0 - 12, y: 0, w: PLOT.x1 - PLOT.x0 + 24, h: PLOT.y1 + 16 };
const pctX = (x: number): string => `${((x - VIEW.x) / VIEW.w) * 100}%`;
const pctY = (y: number): string => `${((y - VIEW.y) / VIEW.h) * 100}%`;
/** Every label at the option size, 24 on a phone and 26 on a laptop (foundation.css). */
const LABEL = "text-[length:var(--kid-answer-size)] leading-none font-bold";
/** Two scale labels stand at least this many line heights apart. */
const LABEL_ROOM = 1.3;

interface Props {
  data: GraphData;
  /** A height per category; a category left out is drawn at 0. */
  heights: Record<string, number>;
  tones: Record<string, Tone>;
  /** The frame's tone, after a verdict that marked no bar. */
  tone: Tone;
  label: string;
  barLabel(c: GraphCategory): string;
  valueText(c: GraphCategory, height: number): string;
  /** A picture graph's legend: what one picture stands for. */
  legend?: string | undefined;
  /** Bars the help ladder gave away: drawn settled, never changed. */
  given?: ReadonlySet<string> | undefined;
  /** Bars rung 1 points at. */
  focus?: ReadonlySet<string> | undefined;
  interactive?:
    | {
        onChange(id: string, height: number, modality: "click" | "keyboard"): void;
      }
    | undefined;
}

const FILL: Record<Tone, string> = {
  idle: "fill-primary",
  green: "fill-kid-correct",
  try_again: "fill-kid-try-again",
  missing: "fill-primary",
};
const INK: Record<Tone, string> = {
  idle: "text-primary",
  green: "text-kid-correct",
  try_again: "text-kid-try-again",
  missing: "text-primary",
};
/** A line graph's point: big enough to see under a finger; the whole column is still the target. */
const POINT_R = 18;
const OUTLINE: Record<Tone, string | null> = {
  idle: null,
  green: "stroke-kid-correct",
  try_again: "stroke-kid-try-again",
  missing: null,
};

export function BarGraph({
  data,
  heights,
  tones,
  tone,
  label,
  barLabel,
  valueText,
  legend,
  given,
  focus,
  interactive,
}: Props): JSX.Element {
  const n = data.categories.length;
  const grid = gridValues(data);
  const every = labelEvery(data);
  const numbered = numberedKind(data.kind);
  const histogram = data.kind === "histogram";
  const edges =
    histogram && data.bins !== undefined && data.bins.length === n + 1 ? data.bins : null;
  const plotH = PLOT.y1 - PLOT.y0;
  const cellH = (plotH * tickOf(data)) / data.max;
  const dragging = useRef<string | null>(null);
  const [announce, setAnnounce] = useState("");
  // The drawn plot's height and a label's, so the scale thins out on a short graph.
  const svgRef = useRef<SVGSVGElement>(null);
  const [room, setRoom] = useState<{ plot: number; label: number } | null>(null);
  // A name wider than its column: the names take two rows, every other one a row lower, so a
  // name keeps its 24 px and never breaks inside a word.
  const names = useRef<HTMLDivElement>(null);
  const [stagger, setStagger] = useState(false);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (svg === null || typeof ResizeObserver === "undefined") return;
    const read = (): void => {
      const box = svg.getBoundingClientRect();
      const size = getComputedStyle(svg).getPropertyValue("--kid-answer-size").trim();
      const font = (parseFloat(size) || 0) * (size.endsWith("rem") ? 16 : 1);
      setRoom(box.height > 0 ? { plot: (box.height * plotH) / VIEW.h, label: font } : null);
      const colPx = (box.width * ((PLOT.x1 - PLOT.x0) / n)) / VIEW.w;
      const widest = Math.max(
        0,
        ...[...(names.current?.querySelectorAll<HTMLElement>("[data-name]") ?? [])].map(
          (e) => e.scrollWidth,
        ),
      );
      setStagger(colPx > 0 && widest > colPx - 4);
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [plotH, n]);
  const gap = room && grid.length > 1 ? room.plot / (grid.length - 1) : 0;
  const shown =
    room && room.label > 0 && gap > 0
      ? Math.max(every, Math.ceil((room.label * LABEL_ROOM) / gap))
      : every;
  const scale = numbered ? grid.filter((_, i) => i % shown === 0 || i === grid.length - 1) : [];

  const change = (c: GraphCategory, height: number, modality: "click" | "keyboard") => {
    if (!interactive || given?.has(c.id)) return;
    if (height === (heights[c.id] ?? 0)) return;
    interactive.onChange(c.id, height, modality);
    setAnnounce(valueText(c, height));
  };
  const heightFrom = (e: PointerEvent<SVGGElement>): number => {
    const svg = e.currentTarget.ownerSVGElement ?? e.currentTarget.closest("svg");
    const r = svg?.getBoundingClientRect();
    // The drawing is cropped: a fraction of it is that much of the uncropped height.
    const fraction =
      r && r.height > 0
        ? ((e.clientY - r.top) / r.height) * (VIEW.h / HEIGHT) + VIEW.y / HEIGHT
        : 1;
    return heightAt(fraction, data);
  };
  const Legend = data.kind === "picture" ? iconOf(data.categories[0]?.picture) : null;
  const legendSrc =
    data.kind === "picture" && data.categories[0]?.picture && "src" in data.categories[0].picture
      ? data.categories[0].picture
      : null;

  return (
    <div className="flex flex-col gap-2">
      {data.unit_label && (
        <p
          className="text-[length:var(--kid-answer-size)] font-semibold text-muted-foreground"
          data-testid="unit-label"
        >
          {data.unit_label}
        </p>
      )}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        {/* The scale: one label per shown gridline, in a column as wide as the widest. */}
        <div aria-hidden="true" className="relative">
          <div className="invisible grid">
            {scale.map((v) => (
              <span key={v} className={cn(LABEL, "col-start-1 row-start-1 tabular-nums")}>
                {v}
              </span>
            ))}
          </div>
          {scale.map((v) => (
            <span
              key={v}
              className={cn(
                LABEL,
                "absolute right-0 -translate-y-1/2 tabular-nums text-foreground",
              )}
              style={{ top: pctY(yOf(v, data)) }}
              data-testid="grid-label"
            >
              {v}
            </span>
          ))}
        </div>
        <svg
          ref={svgRef}
          viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
          role="group"
          aria-label={label}
          data-testid="bar-graph"
          data-tone={tone}
          className="h-auto w-full touch-none select-none"
        >
          {OUTLINE[tone] && (
            <rect
              x={PLOT.x0 - 6}
              y={PLOT.y0 - 6}
              width={PLOT.x1 - PLOT.x0 + 12}
              height={plotH + 12}
              rx={16}
              className={cn("fill-none", OUTLINE[tone])}
              strokeWidth={4}
              strokeDasharray={tone === "try_again" ? "14 10" : undefined}
            />
          )}
          {grid.map((v) => (
            <g key={v}>
              <line
                x1={PLOT.x0}
                y1={yOf(v, data)}
                x2={PLOT.x1}
                y2={yOf(v, data)}
                className={v === 0 ? "stroke-foreground" : "stroke-border"}
                strokeWidth={v === 0 ? 4 : 2}
              />
            </g>
          ))}
          {data.kind === "line" && (
            <polyline
              aria-hidden="true"
              tabIndex={-1}
              data-testid="graph-line"
              points={data.categories
                .map((c, i) => `${column(i, n).cx},${yOf(heights[c.id] ?? 0, data)}`)
                .join(" ")}
              className="pointer-events-none fill-none stroke-primary"
              strokeWidth={6}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {edges?.map((_, i) => {
            const x = i < n ? column(i, n).x0 : column(n - 1, n).x1;
            return (
              <g key={`edge-${i}`} aria-hidden="true" tabIndex={-1}>
                <line
                  x1={x}
                  y1={PLOT.y1}
                  x2={x}
                  y2={PLOT.y1 + 14}
                  className="stroke-foreground"
                  strokeWidth={3}
                />
              </g>
            );
          })}
          {data.categories.map((c, i) => {
            const col = column(i, n);
            const h = heights[c.id] ?? 0;
            const t = tones[c.id] ?? "idle";
            const locked = given?.has(c.id) ?? false;
            const live = interactive !== undefined && !locked;
            const Icon = data.kind === "line_plot" ? X : iconOf(c.picture);
            const image = c.picture && "src" in c.picture ? c.picture : null;
            const markSize = Math.min(cellH, col.bar.w) * 0.86;
            const a11y = live
              ? {
                  tabIndex: 0,
                  "aria-label": barLabel(c),
                  "aria-valuemin": 0,
                  "aria-valuemax": data.max,
                  "aria-valuenow": h,
                  "aria-valuetext": valueText(c, h),
                  "aria-orientation": "vertical" as const,
                  // The slider's drag and keys: a bar that is given or shown is an image with none.
                  onPointerDown: (e: PointerEvent<SVGGElement>) => {
                    dragging.current = c.id;
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    change(c, heightFrom(e), "click");
                  },
                  onPointerMove: (e: PointerEvent<SVGGElement>) => {
                    if (dragging.current === c.id) change(c, heightFrom(e), "click");
                  },
                  onPointerUp: () => {
                    dragging.current = null;
                  },
                  onPointerCancel: () => {
                    dragging.current = null;
                  },
                  onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
                    const by =
                      e.key === "ArrowUp" || e.key === "ArrowRight"
                        ? 1
                        : e.key === "ArrowDown" || e.key === "ArrowLeft"
                          ? -1
                          : 0;
                    const to =
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? data.max
                          : by === 0
                            ? null
                            : nudgeHeight(h, by, data);
                    if (to === null) return;
                    e.preventDefault();
                    change(c, to, "keyboard");
                  },
                }
              : {
                  "aria-label": valueText(c, h),
                  ...(locked ? { "aria-disabled": true, "data-help-given": "true" } : {}),
                };
            return (
              <g
                key={c.id}
                data-testid="bar"
                data-id={c.id}
                data-value={h}
                data-tone={t}
                role={live ? "slider" : "img"}
                {...a11y}
                {...(focus?.has(c.id) ? { "data-help-focus": "true" } : {})}
                className={cn(
                  live &&
                    "cursor-pointer outline-none [&:focus-visible>rect:first-of-type]:stroke-ring",
                )}
              >
                {/* The whole column is the tap target; it also carries the focus ring. */}
                <rect
                  x={col.x0 + 3}
                  y={PLOT.y0}
                  width={col.w - 6}
                  height={plotH}
                  rx={12}
                  fill="transparent"
                  className="stroke-transparent"
                  strokeWidth={4}
                />
                {focus?.has(c.id) && (
                  <rect
                    x={col.x0 + 8}
                    y={PLOT.y0 + 4}
                    width={col.w - 16}
                    height={plotH - 8}
                    rx={12}
                    className="fill-none stroke-primary"
                    strokeWidth={4}
                    strokeDasharray="6 12"
                  />
                )}
                {OUTLINE[t] && (
                  <rect
                    x={col.x0 + 8}
                    y={PLOT.y0 + 4}
                    width={col.w - 16}
                    height={plotH - 8}
                    rx={12}
                    className={cn("fill-none", OUTLINE[t])}
                    strokeWidth={4}
                    strokeDasharray={t === "try_again" ? "14 10" : undefined}
                  />
                )}
                {data.kind === "bar" && h > 0 && (
                  <rect
                    x={col.bar.x}
                    y={yOf(h, data)}
                    width={col.bar.w}
                    height={PLOT.y1 - yOf(h, data)}
                    rx={6}
                    className={cn(locked ? "fill-muted-foreground/40" : FILL[t])}
                  />
                )}
                {/* A histogram's bars touch; a card-coloured edge keeps two bins apart. */}
                {histogram && h > 0 && (
                  <rect
                    x={histogramBar(i, n).x}
                    y={yOf(h, data)}
                    width={histogramBar(i, n).w}
                    height={PLOT.y1 - yOf(h, data)}
                    className={cn("stroke-card", locked ? "fill-muted-foreground/40" : FILL[t])}
                    strokeWidth={4}
                  />
                )}
                {data.kind === "line" && (
                  <circle
                    cx={col.cx}
                    cy={yOf(h, data)}
                    r={POINT_R}
                    data-testid="graph-point"
                    className={cn("stroke-card", locked ? "fill-muted-foreground/40" : FILL[t])}
                    strokeWidth={5}
                  />
                )}
                {(data.kind === "picture" ||
                  data.kind === "line_plot" ||
                  data.kind === "dot_plot") &&
                  Array.from({ length: marksOf(h, data) }, (_, j) => {
                    const cy = PLOT.y1 - (j + 0.5) * cellH;
                    if (data.kind === "dot_plot")
                      return (
                        <circle
                          key={j}
                          cx={col.cx}
                          cy={cy}
                          r={markSize / 2}
                          className={locked ? "fill-muted-foreground/40" : FILL[t]}
                        />
                      );
                    if (image)
                      return (
                        <image
                          key={j}
                          href={image.src}
                          x={col.cx - markSize / 2}
                          y={cy - markSize / 2}
                          width={markSize}
                          height={markSize}
                          preserveAspectRatio="xMidYMid meet"
                          aria-hidden="true"
                          tabIndex={-1}
                          className={cn(locked && "opacity-50")}
                        />
                      );
                    return (
                      <Icon
                        key={j}
                        x={col.cx - markSize / 2}
                        y={cy - markSize / 2}
                        width={markSize}
                        height={markSize}
                        strokeWidth={2}
                        aria-hidden="true"
                        className={cn(locked ? "text-muted-foreground/60" : INK[t])}
                      />
                    );
                  })}
                {edges === null && (
                  <line
                    x1={col.cx}
                    y1={PLOT.y1}
                    x2={col.cx}
                    y2={PLOT.y1 + 14}
                    className="stroke-foreground"
                    strokeWidth={3}
                  />
                )}
              </g>
            );
          })}
        </svg>
        <span />
        {/* Under the plot: each category's name under its column, or a histogram's bin edges. */}
        {edges !== null ? (
          <div
            aria-hidden="true"
            className="relative mt-1"
            style={{ minHeight: "calc(var(--kid-answer-size) * 1.2)" }}
          >
            {edges.map((v, i) => (
              <span
                key={i}
                className={cn(LABEL, "absolute -translate-x-1/2 tabular-nums text-foreground")}
                style={{ left: pctX(i < n ? column(i, n).x0 : column(n - 1, n).x1) }}
                data-testid="bin-edge"
              >
                {v}
              </span>
            ))}
          </div>
        ) : (
          <div
            ref={names}
            aria-hidden="true"
            data-stagger={stagger || undefined}
            className="mt-1 grid"
            style={{
              gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
              paddingInline: `${(12 / VIEW.w) * 100}%`,
            }}
          >
            {data.categories.map((c, i) => (
              <span
                key={c.id}
                className={cn(
                  "flex justify-center",
                  stagger && i % 2 === 1 && "mt-[calc(var(--kid-answer-size)*1.2)]",
                )}
              >
                <span
                  data-name
                  className={cn(LABEL, "whitespace-nowrap text-foreground")}
                  data-testid="category-label"
                >
                  {isTexLabel(c.label) ? <RichText inline text={c.label} /> : c.label}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
      {data.category_label && (
        <p className="text-center text-[length:var(--kid-answer-size)] font-semibold text-muted-foreground">
          {data.category_label}
        </p>
      )}
      {legend && (
        <p className="flex items-center gap-2 text-[length:var(--kid-answer-size)] font-semibold">
          {legendSrc ? (
            <img src={legendSrc.src} alt={legendSrc.alt} className="size-6" />
          ) : (
            Legend && <Legend aria-hidden="true" className="size-6 text-primary" />
          )}
          <span>{legend}</span>
        </p>
      )}
      <p className="sr-only" aria-live="polite" data-testid="graph-announce">
        {announce}
      </p>
    </div>
  );
}
