import type { LessonQuestionExample } from "@jadwigo/contracts";
import type { NewPod, Store } from "@jadwigo/store";
import { FEATURED_POD } from "../ids.ts";
import { compileExamples } from "./compile.ts";
import { EXAMPLES } from "./index.ts";
import { type ExampleLanguage, LANGUAGES } from "./localize.ts";
import type { WrittenExample } from "./types.ts";

/**
 * Writes the playground's written examples into a pod (Jadwigo's own by default) through the
 * Store, in Polish and in English: every question once (idempotent by its content-hash id), then
 * each language's examples replaced whole, so an example removed from the source leaves the page.
 */
export async function importExamples(
  store: Store,
  written: readonly WrittenExample[] = EXAMPLES,
  pod: NewPod = FEATURED_POD,
): Promise<Readonly<Record<ExampleLanguage, readonly LessonQuestionExample[]>>> {
  await store.putPod(pod);
  const out: Record<ExampleLanguage, readonly LessonQuestionExample[]> = { pl: [], en: [] };
  for (const language of LANGUAGES) {
    const compiled = compileExamples(written, language, pod.id);
    for (const question of compiled.questions) await store.putLessonQuestion(pod.id, question);
    out[language] = await store.replaceExamples(pod.id, language, compiled.examples);
  }
  return out;
}
