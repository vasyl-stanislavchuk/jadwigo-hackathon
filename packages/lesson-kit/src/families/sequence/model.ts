/**
 * Sequence: the learner puts items in order, and the position matters: smallest to largest, the
 * steps of a method, words into a sentence. ClassTime calls it a Sorter. Question type: order.
 *
 * Two shapes of answer (docs/18 §0b):
 * - cards: every item is used exactly once, and the learner rearranges the list. The value is the
 *   item ids, first to last.
 * - tiles (dl-w3.51.9, Khan's orderer): a bank of tiles and a row of numbered places. A tile may
 *   be used in several places (`8`, `+`, `8`), and a tile may stay in the bank. The value is the
 *   tile id in each place, first to last, `slots` long.
 *
 * The key lists every accepted order, so a task with two right orders can say so (ClassTime's
 * sorter stores one order as its authored order and cannot: classtime-data-model.md §9).
 */

import type { SequenceData, SequenceItem, SequenceKey } from "@jadwigo/contracts";

export type { SequenceData, SequenceItem, SequenceKey, SequenceValue } from "@jadwigo/contracts";

/** Whether the step answers with tiles in places rather than cards in a list. */
export function tileMode(
  data: Pick<SequenceData, "tiles">,
): data is SequenceData & { tiles: SequenceItem[] } {
  return Array.isArray(data.tiles);
}

/** The number of places in tile mode, from `slots`, else from the first accepted order. */
export function slotCount(
  data: Pick<SequenceData, "slots">,
  key?: Pick<SequenceKey, "orders">,
): number {
  return data.slots ?? key?.orders[0]?.length ?? 0;
}

/** A place's id, as `help.give` and `help.look.focus` name it (1 is first). */
export const slotId = (place: number): string => `s${place}`;
const SLOT_ID = /^s(\d+)$/;

/** The place a slot id names (0 is first), or null when the id is not one. */
export function slotIndex(id: string): number | null {
  const m = SLOT_ID.exec(id);
  return m === null ? null : Number(m[1]) - 1;
}
