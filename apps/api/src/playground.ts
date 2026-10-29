import {
  FEATURED_POD_ID,
  type Language,
  type LessonQuestion,
  type PlaygroundExamples,
} from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";

/**
 * `GET /api/v1/playground-examples/{language}`: the playground's written examples, Jadwigo's own
 * pod's only, and the questions and twins they name, keys included. The one reply that carries a key
 * (RULES.md rule 21, owner 2026-10-28 on `dl-w3.75`): these are authored review examples, never a
 * lesson's questions, and Try it looks a free answer up in the key.
 */
export async function playgroundExamples(
  store: Store,
  language: Language,
): Promise<PlaygroundExamples> {
  const rows = await store.listExamples(FEATURED_POD_ID, language);
  const questions = new Map<string, LessonQuestion>();
  for (const { question, twin } of rows) {
    questions.set(question.id, question);
    if (twin) questions.set(twin.id, twin);
  }
  return { examples: rows.map((r) => r.example), questions: [...questions.values()] };
}
