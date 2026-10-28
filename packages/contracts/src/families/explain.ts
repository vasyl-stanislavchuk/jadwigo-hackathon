import { z } from "zod";
import { Stem } from "./stem.ts";

/**
 * Explain: the learner explains a reason in their own words, judged after the lesson against
 * criteria written and cited before the task. Ported from david-learns
 * `frontend/src/families/explain/model.ts`.
 */

/** `min_words` is a soft minimum: under it the first check asks for a little more. */
export const ExplainData = z.object({
  stem: Stem.optional(),
  input: z.enum(["voice", "text", "both"]),
  prompt: z.string().optional(),
  min_words: z.number().optional(),
});
export type ExplainData = z.infer<typeof ExplainData>;

/** What the learner typed, or for speech the transcript exactly as heard. */
export const ExplainValue = z.strictObject({
  text: z.string(),
  spoken: z.boolean().optional(),
});
export type ExplainValue = z.infer<typeof ExplainValue>;

/** One criterion, for the tutor and the parent, never shown to the learner, with its source. */
export const Criterion = z.object({
  id: z.string(),
  text: z.string(),
  cite: z.string(),
});
export type Criterion = z.infer<typeof Criterion>;

/** The criteria and their version; a judgement keeps the version it used. */
export const ExplainKey = z.object({
  criteria: z.array(Criterion),
  criteria_version: z.string(),
});
export type ExplainKey = z.infer<typeof ExplainKey>;
