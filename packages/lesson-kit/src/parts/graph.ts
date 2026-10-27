/**
 * Part: a drawn graph's geometry and its icons (dl-w3.51.3), shared by BarGraph.tsx and the Place
 * family that holds a graph's data. Pure: no React, no clock. A graph is one bar per category, each
 * bar a height from 0 to `max` in whole multiples of `step`; `tick` is the labelled gridline
 * spacing, and a picture graph draws one picture per tick. Heights are counted in whole steps, so
 * a step of 0.5 never drifts.
 *
 * The options are Perseus's plotter widget's (`type`, `categories`, `maxY`, `scaleY`,
 * `snapsPerLine`, `labels`, `starting`, `picUrl`, `labelInterval`; Khan/perseus
 * packages/perseus-core/src/data-schema.ts PerseusPlotterWidgetOptions, and
 * packages/perseus/src/widgets/plotter/plotter.tsx for how each type draws), read and named here,
 * never copied: `step` is `scaleY / snapsPerLine`, `tick` is `scaleY`, and our `line_plot` and
 * `dot_plot` are both Perseus's `dotplot` (stacked marks over a number line). Our `line` is
 * Perseus's `line`, a point per category joined by a line, and our `histogram` is Perseus's
 * `histogram`, bars with no gaps over bins whose edges (`bins`) are labelled (dl-w3.61.3).
 * Perseus's plotter is pointer-only ("Graphie is inaccessible"); ours takes a tap, a drag and the
 * arrow keys.
 */

import {
  Apple,
  Banana,
  Bird,
  Book,
  Bus,
  Candy,
  Car,
  Cat,
  Cherry,
  Cloud,
  CloudRain,
  CloudSnow,
  Cookie,
  Dog,
  Egg,
  Fish,
  Flower2,
  Grape,
  Heart,
  IceCreamCone,
  Leaf,
  type LucideIcon,
  Pencil,
  Pizza,
  Smile,
  Square,
  Star,
  Sun,
} from "lucide-react";
import { tidy, wholeCount } from "./numberLine.ts";

export type GraphKind = "bar" | "picture" | "line_plot" | "dot_plot" | "line" | "histogram";
export const GRAPH_KINDS: readonly GraphKind[] = [
  "bar",
  "picture",
  "line_plot",
  "dot_plot",
  "line",
  "histogram",
];

/**
 * The icons a picture graph may use, by a plain name a lesson author writes. lucide, as the rest of
 * the page's icons. A first set for the owner and the teacher to settle (the brief leaves the icon set to
 * them): fruit, sweets, weather, animals, things a class counts.
 */
export const GRAPH_ICONS = {
  apple: Apple,
  banana: Banana,
  cherry: Cherry,
  grape: Grape,
  candy: Candy,
  cookie: Cookie,
  ice_cream: IceCreamCone,
  pizza: Pizza,
  egg: Egg,
  sun: Sun,
  cloud: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  flower: Flower2,
  leaf: Leaf,
  dog: Dog,
  cat: Cat,
  fish: Fish,
  bird: Bird,
  star: Star,
  heart: Heart,
  smile: Smile,
  book: Book,
  pencil: Pencil,
  car: Car,
  bus: Bus,
  square: Square,
} as const satisfies Record<string, LucideIcon>;
export type GraphIconName = keyof typeof GRAPH_ICONS;

/** What a picture graph stacks: one of our icons, or a served image with its words (Khan's picUrl). */
export type GraphPicture = { icon: GraphIconName } | { src: string; alt: string };

export interface GraphCategory {
  id: string;
  /** Words, or TeX between dollars, as a Khan category may be. */
  label: string;
  picture?: GraphPicture;
}

export interface GraphData {
  kind: GraphKind;
  categories: readonly GraphCategory[];
  max: number;
  /** The finest height a bar takes. */
  step: number;
  /** The labelled gridline spacing; the step when absent. A picture graph draws one picture per tick. */
  tick?: number;
  unit_label?: string;
  category_label?: string;
  /** A histogram's bin edges, one more than its categories, increasing (dl-w3.61.3): bin i runs
   * from `bins[i]` to `bins[i + 1]`, and the edges are what the axis labels. */
  bins?: readonly number[];
}

/** The SVG's own units. */
export const WIDTH = 1000;
export const HEIGHT = 620;
/** The plot area: the y axis labels sit left of it, the category labels under it. */
export const PLOT = { x0: 110, x1: WIDTH - 30, y0: 40, y1: HEIGHT - 130 } as const;

/**
 * The most bars a finger can tell apart: at the 800px play column the plot spans about 620px, so
 * eight columns keep each one at least 56px wide (the kid tap minimum, kids.css --kid-tap-min).
 * Our own bound for tablets, not a cited one.
 */
export const MAX_CATEGORIES = 8;

export const tickOf = (g: GraphData): number => g.tick ?? g.step;

/** Where a height sits on the SVG's y axis (the baseline is PLOT.y1). */
export function yOf(value: number, g: GraphData): number {
  return PLOT.y1 - (Math.min(Math.max(value, 0), g.max) / g.max) * (PLOT.y1 - PLOT.y0);
}

/** The i-th of n columns: its bounds, its centre and the bar inside it (three fifths of the column). */
export function column(
  i: number,
  n: number,
): { x0: number; x1: number; cx: number; w: number; bar: { x: number; w: number } } {
  const w = (PLOT.x1 - PLOT.x0) / n;
  const x0 = PLOT.x0 + i * w;
  const barW = w * 0.6;
  return { x0, x1: x0 + w, cx: x0 + w / 2, w, bar: { x: x0 + (w - barW) / 2, w: barW } };
}

/** A histogram's i-th of n bars fills its whole column, so neighbours touch (no gap between bins). */
export function histogramBar(i: number, n: number): { x: number; w: number } {
  const { x0, w } = column(i, n);
  return { x: x0, w };
}

/** The kinds whose axis is numbered: the heights are read off it, not counted as marks. */
export const numberedKind = (kind: GraphKind): boolean =>
  kind === "bar" || kind === "picture" || kind === "line" || kind === "histogram";

/** What a histogram bin is called in words: its two edges, "120–125". */
export const binLabel = (bins: readonly number[], i: number): string => `${bins[i]}–${bins[i + 1]}`;

/** The nearest height to a point, given as a fraction 0..1 of the SVG's height from its top. */
export function heightAt(fractionY: number, g: GraphData): number {
  const y = fractionY * HEIGHT;
  const raw = ((PLOT.y1 - y) / (PLOT.y1 - PLOT.y0)) * g.max;
  return clampHeight(tidy(Math.round(raw / g.step) * g.step), g);
}

/** One arrow press: one step up or down, clamped to the graph. */
export function nudgeHeight(value: number, by: -1 | 1, g: GraphData): number {
  const i = Math.round(value / g.step) + by;
  return clampHeight(tidy(i * g.step), g);
}

export function clampHeight(value: number, g: GraphData): number {
  return Math.min(g.max, Math.max(0, value));
}

/** Every gridline from 0 to max, one tick apart. */
export function gridValues(g: GraphData): number[] {
  const tick = tickOf(g);
  const n = wholeCount(g.max, tick) ?? Math.floor(g.max / tick + 1e-9);
  return Array.from({ length: n + 1 }, (_, i) => tidy(i * tick));
}

/** Label every k-th gridline so no more than twelve carry a number (Perseus's labelInterval, chosen here). */
export function labelEvery(g: GraphData): number {
  return Math.max(1, Math.ceil((gridValues(g).length - 1) / 12));
}

/** How many whole pictures (or marks) a height stacks: one per tick. */
export function marksOf(height: number, g: GraphData): number {
  return Math.max(0, Math.round(height / tickOf(g)));
}

/** The icon a category stacks; a square when none was chosen. */
export function iconOf(picture: GraphPicture | undefined): LucideIcon {
  return picture !== undefined && "icon" in picture ? GRAPH_ICONS[picture.icon] : Square;
}

/** Whether a label holds TeX (to draw through RichText) rather than plain words. */
export const isTexLabel = (label: string): boolean => label.includes("$");
