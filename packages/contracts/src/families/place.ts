import { z } from "zod";
import { Denom, RuleRef, Stem, TickLabelStyle } from "./stem.ts";

/**
 * Place: the learner marks a position on a surface: a number line, a picture, a grid, bars, a
 * clock, coins or a fraction shape. Points on a picture are fractions of its size (0 to 1), and
 * the regions are the key, never on the page. Ported from david-learns
 * `frontend/src/families/place/model.ts` and the graph and number line parts it imports.
 */

/** The surfaces Place marks a position on. */
export const Surface = z.enum([
  "number_line",
  "image",
  "grid",
  "bars",
  "clock",
  "coins",
  "fraction",
]);
export type Surface = z.infer<typeof Surface>;

/** The range a number line's divisions stepper moves in, whole numbers. */
export const LineDivisions = z.object({ min: z.number(), max: z.number() });
export type LineDivisions = z.infer<typeof LineDivisions>;

/** A point on a picture, each coordinate a fraction of its width or height. */
export const Point = z.object({ x: z.number(), y: z.number() });
export type Point = z.infer<typeof Point>;

/** A bar graph, a picture graph, a line plot, a dot plot, a line graph or a histogram. */
export const GraphKind = z.enum(["bar", "picture", "line_plot", "dot_plot", "line", "histogram"]);
export type GraphKind = z.infer<typeof GraphKind>;

/** The icons a picture graph may stack. */
export const GraphIcon = z.enum([
  "apple",
  "banana",
  "cherry",
  "grape",
  "candy",
  "cookie",
  "ice_cream",
  "pizza",
  "egg",
  "sun",
  "cloud",
  "rain",
  "snow",
  "flower",
  "leaf",
  "dog",
  "cat",
  "fish",
  "bird",
  "star",
  "heart",
  "smile",
  "book",
  "pencil",
  "car",
  "bus",
  "square",
]);
export type GraphIcon = z.infer<typeof GraphIcon>;

/** What a picture graph stacks: one of our icons, or a served image with its words. */
export const GraphPicture = z.union([
  z.object({ icon: GraphIcon }),
  z.object({ src: z.string(), alt: z.string() }),
]);
export type GraphPicture = z.infer<typeof GraphPicture>;

/** One bar's category: its words (or TeX between dollars) and its picture. */
export const GraphCategory = z.object({
  id: z.string(),
  label: z.string(),
  picture: GraphPicture.optional(),
});
export type GraphCategory = z.infer<typeof GraphCategory>;

/** A clock's hands: the hour hand's position and the minutes. */
export const ClockValue = z.strictObject({ hour_at: z.number(), m: z.number() });
export type ClockValue = z.infer<typeof ClockValue>;

/** A cut across a built rectangle, after `at` rows or columns. */
export const GridSplit = z.strictObject({ axis: z.enum(["rows", "cols"]), at: z.number() });
export type GridSplit = z.infer<typeof GridSplit>;

/** A region of a picture, as a polygon of points. */
export const Region = z.object({ id: z.string(), polygon: z.array(Point) });
export type Region = z.infer<typeof Region>;

/** The surface and what is drawn on it, by `surface`. */
export const PlaceData = z.discriminatedUnion("surface", [
  z.object({
    surface: z.literal("number_line"),
    min: z.number(),
    max: z.number(),
    step: z.number(),
    labelled: z.array(z.number()),
    target_label: z.union([z.number(), z.string()]).nullable().optional(),
    tick_label: TickLabelStyle.optional(),
    snap: z.number().optional(),
    divisions: LineDivisions.optional(),
    stem: Stem.optional(),
  }),
  z.object({
    surface: z.literal("image"),
    image: z.string(),
    image_alt: z.string(),
    taps: z.number(),
    stem: Stem.optional(),
  }),
  z.object({
    surface: z.literal("grid"),
    size: z.number(),
    label: z.string(),
    split: z.literal("one").optional(),
    cells: z.enum(["dots", "squares", "open"]).optional(),
    stem: Stem.optional(),
  }),
  z.object({
    surface: z.literal("bars"),
    kind: GraphKind,
    categories: z.array(GraphCategory),
    max: z.number(),
    step: z.number(),
    tick: z.number().optional(),
    unit_label: z.string().optional(),
    category_label: z.string().optional(),
    starting: z.record(z.string(), z.number()).optional(),
    stem: Stem.optional(),
    bins: z.array(z.number()).optional(),
  }),
  z.object({
    surface: z.literal("clock"),
    target_label: z.string(),
    minute_step: z.union([z.literal(5), z.literal(15), z.literal(30)]),
    hands: z.enum(["geared", "free"]),
    starting: ClockValue.optional(),
    stem: Stem.optional(),
  }),
  z.object({
    surface: z.literal("coins"),
    bank: z.array(Denom),
    amount_label: z.string(),
    slots: z.number(),
    total: z.enum(["hidden", "shown"]).optional(),
    stem: Stem.optional(),
  }),
  z.object({
    surface: z.literal("fraction"),
    shape: z.enum(["bar", "circle", "rect"]),
    parts: z.number(),
    rows: z.number().optional(),
    label: z.string(),
    contiguous: z.boolean().optional(),
    stem: Stem.optional(),
  }),
]);
export type PlaceData = z.infer<typeof PlaceData>;

/**
 * The value, one shape per surface and untagged, as the page commits it. Each shape is strict
 * and their keys differ, so at most one parses and the order of the union does not matter.
 */
export const PlaceValue = z.union([
  z.strictObject({ at: z.number() }),
  z.strictObject({ points: z.array(Point) }),
  z.strictObject({ rows: z.number(), cols: z.number(), split: GridSplit.optional() }),
  z.strictObject({ heights: z.record(z.string(), z.number()) }),
  ClockValue,
  z.strictObject({ items: z.array(Denom) }),
  z.strictObject({ shaded: z.array(z.number()) }),
]);
export type PlaceValue = z.infer<typeof PlaceValue>;

/** The key, by the same `surface` as its data. */
export const PlaceKey = z.discriminatedUnion("surface", [
  z.object({
    surface: z.literal("number_line"),
    value: z.number(),
    tolerance: z.number(),
    rule: RuleRef.optional(),
  }),
  z.object({
    surface: z.literal("image"),
    targets: z.array(Region),
    near: z.array(Region.extend({ mistake_class: z.string() })).optional(),
    require_all: z.boolean(),
  }),
  z.object({
    surface: z.literal("grid"),
    rows: z.number(),
    cols: z.number(),
    either_order: z.boolean(),
    off_by_one: z.boolean().optional(),
    split: z.object({ accept_at: z.array(z.number()).optional() }).optional(),
  }),
  z.object({
    surface: z.literal("bars"),
    heights: z.record(z.string(), z.number()),
    tolerance: z.number().optional(),
  }),
  z.object({ surface: z.literal("clock"), h: z.number(), m: z.number() }),
  z.object({
    surface: z.literal("coins"),
    amount_gr: z.number(),
    fewest: z.boolean().optional(),
  }),
  z.object({ surface: z.literal("fraction"), count: z.number() }),
]);
export type PlaceKey = z.infer<typeof PlaceKey>;
