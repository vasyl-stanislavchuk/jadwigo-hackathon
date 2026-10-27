/**
 * Group: the learner puts each item into a group, and only the group matters: even and odd, nouns
 * and verbs, facts with the same answer. ClassTime calls it a Categorizer. Question types: bucket (two or
 * more groups) and match (each group takes one item, so the groups are the right-hand side of the
 * pairs).
 *
 * An item may belong in several groups (`each_item: 'many'`, ClassTime's CATEGORIZER_MULTIPLE), so
 * the value holds a list of group ids per item (owner, 2026-10-12, settling the bucket half of
 * dl-w3.31).
 *
 * Two layouts draw the same value (dl-w3.51.7, Khan's matcher). `zones` are groups the cards are
 * dropped into. `columns` are two columns: the items fixed on the left, the groups reordered on the
 * right, and row i pairs item i with the group beside it. Columns need one group per item, each
 * taking one card, and the groups are listed in the order the right column starts in, so an author
 * (or the Khan converter) lists them shuffled, never in the key's order.
 */

import type { GroupCard, GroupData, GroupLayout } from "@jadwigo/contracts";
import { QuestionType } from "../names.ts";

export type { GroupCard, GroupData, GroupKey, GroupLayout, GroupValue } from "@jadwigo/contracts";

/** The layout a step plays in: what it names, else its question type's default. */
export function layoutOf(data: GroupData, question_type: string): GroupLayout {
  return data.layout ?? (question_type === QuestionType.Match ? "columns" : "zones");
}

/** A card's words for an announcement: its label, or its picture's words when it is only a picture. */
export function cardWords(card: GroupCard): string {
  return card.label.trim() !== "" ? card.label : (card.picture?.alt ?? "");
}
