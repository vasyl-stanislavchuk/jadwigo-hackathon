import { z } from "zod";
import { Figure, RuleRef, Stem } from "./stem.ts";

/**
 * Enter: the learner types or says one value. The value is the string exactly as committed;
 * any folding happens in the comparison, only where the key says so. Ported from david-learns
 * `frontend/src/families/enter/model.ts`.
 */

/** What the learner types: digits, free text, numbers and signs, or a fraction in stacked boxes. */
export const EnterInput = z.enum(["number", "text", "expression", "fraction"]);
export type EnterInput = z.infer<typeof EnterInput>;

/** A fraction's rule on lowest terms: `required` nudges and stays open, `enforced` is a miss. */
export const Simplify = z.enum(["required", "enforced"]);
export type Simplify = z.infer<typeof Simplify>;

/** The forms a number may be written in, as Khan's `answerForms`. */
export const NumberForm = z.enum(["integer", "proper", "improper", "mixed", "decimal"]);
export type NumberForm = z.infer<typeof NumberForm>;

/** The shape an expression must have; `any` compares by value alone. */
export const RequiredForm = z.enum(["sum", "difference", "product", "quotient", "any"]);
export type RequiredForm = z.infer<typeof RequiredForm>;

/** How the entry is drawn. Each optional field names the input it applies to. */
export const EnterData = z.object({
  stem: Stem.optional(),
  input: EnterInput,
  entry: z.enum(["keypad", "keyboard"]),
  voice: z.boolean().optional(),
  /** Monospace with no autocorrect, for commands. */
  code: z.boolean().optional(),
  max_length: z.number().optional(),
  /** Number only: the keypad draws a comma key. */
  decimal: z.boolean().optional(),
  /** Expression only: the answer is an equation, so the keypad adds `=`. */
  equation: z.boolean().optional(),
  /** Fraction only: a whole number's box in front, for a mixed number. */
  whole: z.boolean().optional(),
  simplify: Simplify.optional(),
  figure: Figure.optional(),
  /** Text only: `pl` draws the row of Polish letters under the field. */
  letters: z.enum(["pl", "none"]).optional(),
  /** Text only: the letter row starts in capitals while the field is empty. */
  capitals: z.boolean().optional(),
});
export type EnterData = z.infer<typeof EnterData>;

/** The string exactly as committed. */
export const EnterValue = z.strictObject({
  entered: z.string(),
});
export type EnterValue = z.infer<typeof EnterValue>;

/**
 * Every accepted form, written before the task, and how a miss is classified. A number is
 * compared by value; an expression by value and, when `form` says so, by its shape.
 */
export const EnterKey = z.object({
  accept: z.array(z.string()),
  form: RequiredForm.optional(),
  forms: z.array(NumberForm).optional(),
  exact_terms: z.boolean().optional(),
  sides: z.enum(["either", "kept"]).optional(),
  case: z.enum(["exact", "ignore"]).optional(),
  accents: z.enum(["exact", "ignore"]).optional(),
  typo: z.enum(["miss", "accept"]).optional(),
  /** Known incorrect answers, each with the mistake class it shows. */
  near: z.record(z.string(), z.string()).optional(),
  tolerance: z.number().optional(),
  rule: RuleRef.optional(),
});
export type EnterKey = z.infer<typeof EnterKey>;
