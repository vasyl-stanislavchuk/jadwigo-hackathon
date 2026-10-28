import type { FamilyQuestion, Help, QuestionType } from "@jadwigo/contracts";

/**
 * A question as the judges and the help release read it: its family's data and key, the question
 * type it was written from and its help ladder. A `LessonQuestion` is one. Ported from david-learns
 * `frontend/src/families/types.ts` (its FamilySpec, without the page envelope).
 */
export type Question = FamilyQuestion & { question_type: QuestionType; help?: Help };

/** Whether a miss marks the missed parts or only the whole question (the marks rule, docs/18 §0). */
export type Marks = "parts" | "whole";

/**
 * Each question type's marks rule, from david-learns `frontend/src/families/questionTypes.ts`. A
 * typed word's letters are marked under either rule: they are inside the one field.
 */
export const QUESTION_TYPE_MARKS: Readonly<Record<QuestionType, Marks>> = {
  true_false: "parts",
  recognition: "parts",
  lettered_choice: "parts",
  multi_select: "parts",
  mark_numbers: "parts",
  fraction_compare: "parts",
  production: "whole",
  short_text: "whole",
  expression: "whole",
  measure: "whole",
  fill_gaps: "parts",
  fill_table: "parts",
  label_picture: "parts",
  column: "parts",
  pyramid: "parts",
  clock_read: "parts",
  money_count: "parts",
  order: "whole",
  bucket: "parts",
  match: "parts",
  number_line_place: "whole",
  hotspot: "parts",
  spatial_build: "whole",
  draw_graph: "parts",
  clock_set: "parts",
  money_pay: "whole",
  fraction_shade: "whole",
  area_model: "parts",
  explain: "parts",
};
