import { z } from "zod";
import { Stem } from "./stem.ts";

/**
 * Sequence: the learner puts items in order, and the position matters. Cards are each used once;
 * tiles fill `slots` places and may repeat or stay in the bank. Ported from david-learns
 * `frontend/src/families/sequence/model.ts`.
 */

export const SequenceItem = z.object({
  id: z.string(),
  text: z.string(),
});
export type SequenceItem = z.infer<typeof SequenceItem>;

/** The cards (empty in tile mode), what the two ends mean, and the tile bank when there is one. */
export const SequenceData = z.object({
  stem: Stem.optional(),
  items: z.array(SequenceItem),
  first_label: z.string(),
  last_label: z.string(),
  tiles: z.array(SequenceItem).optional(),
  slots: z.number().optional(),
});
export type SequenceData = z.infer<typeof SequenceData>;

/** The item ids, first to last; in tile mode the tile id in each place. */
export const SequenceValue = z.array(z.string());
export type SequenceValue = z.infer<typeof SequenceValue>;

/** Every accepted order. */
export const SequenceKey = z.object({
  orders: z.array(z.array(z.string())),
});
export type SequenceKey = z.infer<typeof SequenceKey>;
