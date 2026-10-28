/**
 * The names of the interaction families and of their question types (the question types), as constants.
 * Code says `Family.Choose` and `QuestionType.Recognition`, never the raw string, so a rename is one edit
 * and a typo is a type error. The string values are what a lesson spec stores.
 * The type each constant names comes from `@jadwigo/contracts`.
 */

import type {
  Family as ContractFamily,
  QuestionType as ContractQuestionType,
  Surface as ContractSurface,
} from "@jadwigo/contracts";

export const Family = {
  Choose: "choose",
  Enter: "enter",
  /** A question body with answer slots under one Sprawdź (decision 2026-10-25-a-question-is-a-body-with-answer-slots): typed and chosen slots in a text, a table, a picture, a column or a pyramid. */
  Slots: "slots",
  Sequence: "sequence",
  Group: "group",
  Place: "place",
  Explain: "explain",
} as const satisfies Record<string, ContractFamily>;
export type FamilyName = ContractFamily;
export const FAMILIES: readonly FamilyName[] = Object.values(Family);

export const QuestionType = {
  // Choose
  TrueFalse: "true_false",
  Recognition: "recognition",
  LetteredChoice: "lettered_choice",
  MultiSelect: "multi_select",
  /** Tap the numbers in a word problem that the answer needs (dl-w3.61.2, lane A). */
  MarkNumbers: "mark_numbers",
  /** Compare two fractions drawn as bars and pick <, = or > (dl-w3.61.7, lane F), in Choose since
   * the Slots session (addendum section 1, dl-4e0f): the line stays in the card, the signs are tiles. */
  FractionCompare: "fraction_compare",
  // Enter
  Production: "production",
  ShortText: "short_text",
  Expression: "expression",
  Measure: "measure",
  // Slots: the body's layout; a slot is typed or chosen (slots/model.ts Gap). One gap or several,
  // typed or chosen, is fill_gaps: fill_blank and cloze merged into it (Slots addendum section 1).
  FillGaps: "fill_gaps",
  FillTable: "fill_table",
  LabelPicture: "label_picture",
  Column: "column",
  /** Number pyramid: each brick is the sum of the two below it (dl-w3.61.4, lane C). */
  Pyramid: "pyramid",
  /** Read the time off a clock face (dl-w3.61.5, lane D). */
  ClockRead: "clock_read",
  /** Count the coins and notes in a purse (dl-w3.61.6, lane E). */
  MoneyCount: "money_count",
  // Sequence
  Order: "order",
  // Group
  Bucket: "bucket",
  Match: "match",
  // Place
  NumberLinePlace: "number_line_place",
  Hotspot: "hotspot",
  SpatialBuild: "spatial_build",
  DrawGraph: "draw_graph",
  /** Set the hands of a clock (dl-w3.61.5, lane D). */
  ClockSet: "clock_set",
  /** Pay an amount from a bank of coins and notes (dl-w3.61.6, lane E). */
  MoneyPay: "money_pay",
  /** Shade the parts of a shape a fraction names (dl-w3.61.7, lane F). */
  FractionShade: "fraction_shade",
  /** Build a rectangle on the grid and split it to make the product easier (dl-w3.61.7, lane F). */
  AreaModel: "area_model",
  // Explain
  Explain: "explain",
} as const satisfies Record<string, ContractQuestionType>;
export type QuestionTypeName = ContractQuestionType;

/** The surfaces Place marks a position on. */
export const Surface = {
  NumberLine: "number_line",
  Image: "image",
  Grid: "grid",
  /** A bar graph, a picture graph, a line plot or a dot plot: a height per bar (dl-w3.51.3). */
  Bars: "bars",
  /** A clock face with an hour and a minute hand (dl-w3.61.5, lane D). */
  Clock: "clock",
  /** A bank of Polish coins and notes and a tray to pay into (dl-w3.61.6, lane E). */
  Coins: "coins",
  /** A bar, a circle or a rectangle cut into equal parts to shade (dl-w3.61.7, lane F). */
  Fraction: "fraction",
} as const satisfies Record<string, ContractSurface>;
