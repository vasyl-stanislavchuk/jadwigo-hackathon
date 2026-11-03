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

/** Lower case, accents off, anything else a dash: "Żółw Ola" is "zolw-ola". */
function folded(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[łŁ]/g, "l")
    .toLocaleLowerCase("pl")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Each child's value in `?dziecko=`: the first name folded, so a link reads "dziecko=marta,ola", or
 * the id when two names fold alike, or a name folds to nothing or to "bez".
 */
export function childSlugs(learners: readonly Learner[]): Map<LearnerId, string> {
  const names = learners.map((learner) => folded(learner.first_name));
  return new Map(
    learners.map((learner, i) => {
      const name = names[i] ?? "";
      const unique =
        name !== "" && name !== NO_CHILD && names.indexOf(name) === names.lastIndexOf(name);
      return [learner.id, unique ? name : learner.id];
    }),
  );
}
