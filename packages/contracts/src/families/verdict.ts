import { z } from "zod";

/**
 * What code decides about one committed value, part by part. The parts are evidence, never a
 * score. Ported from david-learns `frontend/src/families/types.ts` and `frontend/src/api/types.ts`.
 */

/** One part's verdict, by its id: an option, a gap, an item, a tap or a criterion. */
export const PartVerdict = z.object({
  id: z.string(),
  correct: z.boolean(),
  mistake_class: z.string().nullable(),
});
export type PartVerdict = z.infer<typeof PartVerdict>;

/**
 * The whole answer is correct only when every part is, and its class is the first missed part's.
 * `sides_swapped` is set only on a correct equation written the other way round.
 */
export const Verdict = z.object({
  correct: z.boolean(),
  mistake_class: z.string().nullable(),
  parts: z.array(PartVerdict),
  sides_swapped: z.boolean().optional(),
});
export type Verdict = z.infer<typeof Verdict>;

/** What the page sees of a part after a miss: correct or not, never its class, which can leak. */
export const PartMark = z.object({
  id: z.string(),
  correct: z.boolean(),
});
export type PartMark = z.infer<typeof PartMark>;
