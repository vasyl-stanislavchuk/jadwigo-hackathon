import { z } from "zod";
import { Picture, Stem } from "./stem.ts";

/**
 * Group: the learner puts each item into a group, and only the group matters (bucket and match).
 * An item may belong in several groups when `each_item` is `many`. Ported from david-learns
 * `frontend/src/families/group/model.ts`.
 */

/** A card: its words and, when it has one, its picture. A picture-only card has an empty label. */
export const GroupCard = z.object({
  id: z.string(),
  label: z.string(),
  picture: Picture.optional(),
});
export type GroupCard = z.infer<typeof GroupCard>;

/** `zones` are groups the cards drop into; `columns` pair item i with the group beside it. */
export const GroupLayout = z.enum(["columns", "zones"]);
export type GroupLayout = z.infer<typeof GroupLayout>;

export const GroupData = z.object({
  stem: Stem.optional(),
  groups: z.array(GroupCard.extend({ capacity: z.number().optional() })),
  items: z.array(GroupCard),
  each_item: z.enum(["one", "many"]),
  /** Absent: `columns` for match, `zones` otherwise. */
  layout: GroupLayout.optional(),
});
export type GroupData = z.infer<typeof GroupData>;

/** The group ids each item was put in, by item id. */
export const GroupValue = z.strictObject({
  items: z.record(z.string(), z.array(z.string())),
});
export type GroupValue = z.infer<typeof GroupValue>;

/** The groups each item belongs in, and `near`: `{item_id: {group_id: mistake_class}}`. */
export const GroupKey = z.object({
  items: z.record(z.string(), z.array(z.string())),
  near: z.record(z.string(), z.record(z.string(), z.string())).optional(),
});
export type GroupKey = z.infer<typeof GroupKey>;
