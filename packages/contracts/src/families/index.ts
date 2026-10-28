import { z } from "zod";
import { ChooseData, ChooseKey, ChooseValue } from "./choose.ts";
import { EnterData, EnterKey, EnterValue } from "./enter.ts";
import { ExplainData, ExplainKey, ExplainValue } from "./explain.ts";
import { GroupData, GroupKey, GroupValue } from "./group.ts";
import { PlaceData, PlaceKey, PlaceValue } from "./place.ts";
import { SequenceData, SequenceKey, SequenceValue } from "./sequence.ts";
import { SlotsData, SlotsKey, SlotsValue } from "./slots.ts";

/**
 * Interaction families: a family is defined by the shape of the learner's answer, and a question
 * type is one family with a few options. A question's `data` and `key` are kept apart, so the page
 * never holds the key. Ported from david-learns `frontend/src/families/{types,names,questionTypes}.ts`.
 */

export * from "./choose.ts";
export * from "./enter.ts";
export * from "./explain.ts";
export * from "./group.ts";
export * from "./help.ts";
export * from "./place.ts";
export * from "./sequence.ts";
export * from "./slots.ts";
export * from "./stem.ts";
export * from "./verdict.ts";

export const Family = z.enum(["choose", "enter", "slots", "sequence", "group", "place", "explain"]);
export type Family = z.infer<typeof Family>;

/** Every question type a lesson question is written from. */
export const QuestionType = z.enum([
  "true_false",
  "recognition",
  "lettered_choice",
  "multi_select",
  "mark_numbers",
  "fraction_compare",
  "production",
  "short_text",
  "expression",
  "measure",
  "fill_gaps",
  "fill_table",
  "label_picture",
  "column",
  "pyramid",
  "clock_read",
  "money_count",
  "order",
  "bucket",
  "match",
  "number_line_place",
  "hotspot",
  "spatial_build",
  "draw_graph",
  "clock_set",
  "money_pay",
  "fraction_shade",
  "area_model",
  "explain",
]);
export type QuestionType = z.infer<typeof QuestionType>;

/** The family each question type belongs to. */
export const QUESTION_TYPE_FAMILY: Readonly<Record<QuestionType, Family>> = {
  true_false: "choose",
  recognition: "choose",
  lettered_choice: "choose",
  multi_select: "choose",
  mark_numbers: "choose",
  fraction_compare: "choose",
  production: "enter",
  short_text: "enter",
  expression: "enter",
  measure: "enter",
  fill_gaps: "slots",
  fill_table: "slots",
  label_picture: "slots",
  column: "slots",
  pyramid: "slots",
  clock_read: "slots",
  money_count: "slots",
  order: "sequence",
  bucket: "group",
  match: "group",
  number_line_place: "place",
  hotspot: "place",
  spatial_build: "place",
  draw_graph: "place",
  clock_set: "place",
  money_pay: "place",
  fraction_shade: "place",
  area_model: "place",
  explain: "explain",
};

export function familyOf(questionType: QuestionType): Family {
  return QUESTION_TYPE_FAMILY[questionType];
}

/** A question as the server holds it: its family, the data the page draws, and the key. */
export const FamilyQuestion = z.discriminatedUnion("family", [
  z.object({ family: z.literal("choose"), data: ChooseData, key: ChooseKey }),
  z.object({ family: z.literal("enter"), data: EnterData, key: EnterKey }),
  z.object({ family: z.literal("slots"), data: SlotsData, key: SlotsKey }),
  z.object({ family: z.literal("sequence"), data: SequenceData, key: SequenceKey }),
  z.object({ family: z.literal("group"), data: GroupData, key: GroupKey }),
  z
    .object({ family: z.literal("place"), data: PlaceData, key: PlaceKey })
    .refine((q) => q.data.surface === q.key.surface, {
      message: "a place key names the same surface as its data",
      path: ["key", "surface"],
    }),
  z.object({ family: z.literal("explain"), data: ExplainData, key: ExplainKey }),
]);
export type FamilyQuestion = z.infer<typeof FamilyQuestion>;

/** The same question as the page may see it: no key. */
export const PageFamilyQuestion = z.discriminatedUnion("family", [
  z.object({ family: z.literal("choose"), data: ChooseData }),
  z.object({ family: z.literal("enter"), data: EnterData }),
  z.object({ family: z.literal("slots"), data: SlotsData }),
  z.object({ family: z.literal("sequence"), data: SequenceData }),
  z.object({ family: z.literal("group"), data: GroupData }),
  z.object({ family: z.literal("place"), data: PlaceData }),
  z.object({ family: z.literal("explain"), data: ExplainData }),
]);
export type PageFamilyQuestion = z.infer<typeof PageFamilyQuestion>;

const VALUES = {
  choose: ChooseValue,
  enter: EnterValue,
  slots: SlotsValue,
  sequence: SequenceValue,
  group: GroupValue,
  place: PlaceValue,
  explain: ExplainValue,
} as const satisfies Record<Family, z.ZodType>;

/** The value schema a family commits. */
export function valueFor<F extends Family>(family: F): (typeof VALUES)[F] {
  return VALUES[family];
}

/**
 * Any family's committed value, untagged. Every object shape is strict and their keys differ
 * (Group's `items` is a record, coins' `items` an array), so at most one member parses.
 */
export const AnswerValue = z.union([
  ChooseValue,
  EnterValue,
  SlotsValue,
  SequenceValue,
  GroupValue,
  PlaceValue,
  ExplainValue,
]);
export type AnswerValue = z.infer<typeof AnswerValue>;
