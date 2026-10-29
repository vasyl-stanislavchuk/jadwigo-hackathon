import type { QuestionType } from "@jadwigo/contracts";
import { CHOOSE_EXAMPLES } from "./choose.ts";
import { ENTER_EXAMPLES } from "./enter.ts";
import { EXPLAIN_EXAMPLES } from "./explain.ts";
import { GROUP_EXAMPLES } from "./group.ts";
import { PLACE_EXAMPLES } from "./place.ts";
import { SEQUENCE_EXAMPLES } from "./sequence.ts";
import { SLOTS_EXAMPLES } from "./slots.ts";
import type { WrittenExample } from "./types.ts";

/** Every written example, family by family. */
export const EXAMPLES: readonly WrittenExample[] = [
  ...CHOOSE_EXAMPLES,
  ...ENTER_EXAMPLES,
  ...SLOTS_EXAMPLES,
  ...SEQUENCE_EXAMPLES,
  ...GROUP_EXAMPLES,
  ...PLACE_EXAMPLES,
  ...EXPLAIN_EXAMPLES,
];

/** A question type's examples, its showcase first. */
export function examplesFor(questionType: QuestionType): WrittenExample[] {
  const own = EXAMPLES.filter((e) => e.question.question_type === questionType);
  return [...own.filter((e) => e.showcase === true), ...own.filter((e) => e.showcase !== true)];
}
