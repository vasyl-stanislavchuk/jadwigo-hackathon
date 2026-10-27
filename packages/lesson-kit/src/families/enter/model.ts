/**
 * Enter: the learner types or says one value. Question types: production (a number, keypad or voice),
 * short_text (a word or a command, keyboard; Read the number line merged into production, a number
 * read off a number-line figure, dl-y3th) and expression (a short expression such as `2×5` on a keypad with signs, dl-w3.51.1).
 * ClassTime's TEXT, with dl's rule that the accepted forms are written before the task.
 *
 * The value is the string exactly as committed. Nothing is normalised toward the key: any folding of
 * case or trimming happens in the comparison, only where the key says so, and the raw string stays.
 * An expression is compared by its value and its form (enter/expression.ts), never as a string.
 */

import type {
  EnterData,
  EnterInput,
  EnterKey,
  EnterValue,
  Figure,
  Simplify,
} from "@jadwigo/contracts";

export type { EnterData, EnterInput, EnterKey, EnterValue, Figure, Simplify };
