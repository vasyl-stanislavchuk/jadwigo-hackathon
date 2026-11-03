/**
 * What the Lekcje and Historia lists share for their facets (handoff dl-uukj.47.67 §7.1, S14, S15):
 * the Data facet's presets and the value each child has in the URL. Pure, so both lists and their
 * tests read the same rule.
 */

import type { Learner, LearnerId } from "@jadwigo/contracts";

/** The Dziecko facet's value for the rows with no child. */
export const NO_CHILD = "bez";

/** The Data facet's presets, as the URL names them: today, this week from Monday, this month. */
export const DATE_PRESETS = ["dzis", "tydzien", "miesiac"] as const;

/** Whether `at` falls in `preset`'s span, which ends now. An unknown preset holds every row. */
export function inPreset(at: string, preset: string, now: Date): boolean {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (preset === "tydzien") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  else if (preset === "miesiac") start.setDate(1);
  else if (preset !== "dzis") return true;
  return new Date(at) >= start;
}

/**
 * Each child's value in `?dziecko=`: the learner id, never a name (the #765 review, dl-uukj.47.67.31).
 * A URL lands in the browser's history, a bookmark and analytics' page views, and a child's name must
 * reach none of them (AGENTS.md, house rules); an id also stays the same through a rename.
 */
export function childSlugs(learners: readonly Learner[]): Map<LearnerId, string> {
  return new Map(learners.map((learner) => [learner.id, learner.id]));
}
