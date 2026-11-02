/**
 * What the Lekcje and Historia tables share (handoff §3 "Lists = table + filter", dl-z5ja.106.1):
 * a segmented filter of whose rows to show (every row, one child's, or the rows with no child) and a
 * search over each row's words. Pure, so both tables and their tests read the same rule.
 */

import type { LearnerId } from "@jadwigo/contracts";

/** The filter's pick: every row, the rows with no child, or one child's. */
export type Who = "all" | "none" | LearnerId;

/** What a row offers the filter and the search. */
export interface Filterable {
  /** The child the row belongs to, or null for "Bez dziecka". */
  learner: LearnerId | null;
  /** The words a search looks in: the lesson's title, the child's name. */
  words: readonly string[];
}

/** Lower case with the accents off, so "zolw" finds "żółw" and "LEKCJA" finds "lekcja". */
export function folded(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l")
    .toLocaleLowerCase("pl");
}

/** Whether a row shows under the filter's pick and the search's words. An empty search shows all. */
export function shows(row: Filterable, who: Who, search: string): boolean {
  if (who === "none" && row.learner !== null) return false;
  if (who !== "all" && who !== "none" && row.learner !== who) return false;
  const query = folded(search.trim());
  if (query === "") return true;
  return row.words.some((word) => folded(word).includes(query));
}
