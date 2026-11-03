/**
 * The sentences a parent's lesson-pane steer carries to the model (dl-z5ja.30), in the lesson's
 * own language. They are model input, never words a family reads, so they live here and not in
 * `@jadwigo/copy`. The real `lesson_edit` needs a why: the edit sentence carries the parent's own
 * words, which say what to change and why, and the model passes them on as the edit's `why`.
 */

type LessonLanguage = "pl" | "en";

const EDIT: Record<LessonLanguage, (step: string, words: string) => string> = {
  pl: (step, words) => `Rodzic prosi o zmianę w kroku ${step}: ${words}`,
  en: (step, words) => `The parent asks for a change in step ${step}: ${words}`,
};

/** The steer for a parent's own edit of one step. */
export const editSteer = (language: LessonLanguage, step: string, words: string): string =>
  EDIT[language](step, words);
