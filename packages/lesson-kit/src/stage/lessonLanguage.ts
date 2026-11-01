/**
 * The lesson's language, which may differ from the screens' (dl-uukj.38): StepFrame provides it,
 * and StepShell puts it as `lang` on the question's own text (its stem and answer areas), so a
 * screen reader reads an English question in English on Polish screens while Check, the help
 * ladder and Dalej keep the page's language. Null, as outside a lesson, adds no `lang` at all.
 */

import { createContext, useContext } from "react";
import type { Language } from "./types.ts";

export const LessonLanguage = createContext<Language | null>(null);

/** `{ lang }` for the question's own text, or nothing when no lesson language is set. */
export function useLessonLang(): { lang?: Language } {
  const language = useContext(LessonLanguage);
  return language === null ? {} : { lang: language };
}

/**
 * `{ lang: language }` for the screens' own words that sit inside the question's text (a field's
 * name, "Your answer", "Choose all"), so they keep the screens' language under the lesson's
 * (dl-uukj.41); nothing when no lesson language is set, so a step outside a lesson is unchanged.
 */
export function useScreensLang(language: Language): { lang?: Language } {
  return useContext(LessonLanguage) === null ? {} : { lang: language };
}
