import { z } from "zod";
import { ChooseKey } from "./choose.ts";
import { EnterKey, Simplify } from "./enter.ts";
import { Figure, Picture, Stem } from "./stem.ts";

/**
 * Slots: a body with answer slots under one check, each typed or chosen, in a text, a table, a
 * picture, a column sum or a pyramid. Ported from david-learns
 * `frontend/src/families/slots/{model,column,pyramid}.ts`.
 */

/** A gap's marker on a picture, in percent of its width and height. */
export const GapAt = z.object({ x: z.number(), y: z.number() });
export type GapAt = z.infer<typeof GapAt>;

/** The range a number gap's type fixes, such as a clock's minutes 0 to 59. */
export const GapRange = z.tuple([z.number(), z.number()]);
export type GapRange = z.infer<typeof GapRange>;

/** One gap: typed (`enter`) or chosen from a short list (`choose`). */
export const Gap = z.discriminatedUnion("kind", [
  z.object({
    id: z.string(),
    kind: z.literal("enter"),
    input: z.enum(["number", "text", "fraction"]),
    max_length: z.number().optional(),
    range: GapRange.optional(),
    at: GapAt.optional(),
    letters: z.enum(["pl", "none"]).optional(),
    decimal: z.boolean().optional(),
    whole: z.boolean().optional(),
    simplify: Simplify.optional(),
  }),
  z.object({
    id: z.string(),
    kind: z.literal("choose"),
    options: z.array(z.object({ id: z.string(), label: z.string() })),
    at: GapAt.optional(),
  }),
]);
export type Gap = z.infer<typeof Gap>;

/** A table whose cells hold text or gap markers. */
export const SlotsTable = z.object({
  header: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});
export type SlotsTable = z.infer<typeof SlotsTable>;

/** Written column arithmetic: two operands, top first, and the rightmost columns given. */
export const ColumnSum = z.object({
  op: z.enum(["add", "sub", "mul"]),
  operands: z.tuple([z.number(), z.number()]),
  given_steps: z.number(),
  carry_row: z.boolean(),
});
export type ColumnSum = z.infer<typeof ColumnSum>;

/** A number pyramid, rows top to bottom, each cell a number or a `{gN}` marker. */
export const PyramidRows = z.array(z.array(z.union([z.number(), z.string()])));
export type PyramidRows = z.infer<typeof PyramidRows>;

/** The body: a template with `{gN}` markers, and what is drawn around it. */
export const SlotsData = z.object({
  stem: Stem.optional(),
  /** Empty when every gap sits in the table. */
  template: z.string(),
  table: SlotsTable.optional(),
  /** A picture to label: every gap with `at` is a marker on it. */
  picture: Picture.optional(),
  gaps: z.array(Gap),
  /** The template is a command: monospace, no autocorrect. */
  code: z.boolean().optional(),
  figure: Figure.optional(),
  column: ColumnSum.optional(),
  pyramid: PyramidRows.optional(),
  /** The order the gaps are filled in, every gap once; absent, the reading order. */
  fill_order: z.array(z.string()).optional(),
});
export type SlotsData = z.infer<typeof SlotsData>;

/** What each gap holds, by gap id. */
export const SlotsValue = z.strictObject({
  gaps: z.record(z.string(), z.string()),
});
export type SlotsValue = z.infer<typeof SlotsValue>;

/** A gap's key: Enter's key for a typed gap, Choose's correct ids and `near` for a chosen one. */
export const GapKey = z.discriminatedUnion("kind", [
  EnterKey.extend({ kind: z.literal("enter") }),
  ChooseKey.pick({ correct: true, near: true }).extend({ kind: z.literal("choose") }),
]);
export type GapKey = z.infer<typeof GapKey>;

export const SlotsKey = z.object({
  gaps: z.record(z.string(), GapKey),
});
export type SlotsKey = z.infer<typeof SlotsKey>;
