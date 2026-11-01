/**
 * The API's examples reply for the playground's tests, built from the written examples as the
 * seed compiles them (packages/lesson-import), and a fake client that answers with it. Tests
 * only: the page itself reads the API.
 */

import type { PlaygroundClient } from "@jadwigo/api-client";
import {
  FEATURED_POD_ID,
  ID_PREFIXES,
  idOf,
  type Language,
  PlaygroundExamples,
  uuidOf,
} from "@jadwigo/contracts";
import { compileExamples, PLAYGROUND_EXAMPLES } from "@jadwigo/lesson-import";
import type { WrittenExample } from "./types.ts";

/** The written examples as authored, in both languages. */
export const AUTHORED: readonly WrittenExample[] = PLAYGROUND_EXAMPLES;

const AT = "2026-09-01T08:00:00.000Z";

/** What `GET /api/v1/playground-examples/{language}` answers once the seed has run. */
export function examplesReply(language: Language): PlaygroundExamples {
  const { questions, examples } = compileExamples(PLAYGROUND_EXAMPLES, language);
  return PlaygroundExamples.parse({
    examples: examples.map((e) => ({
      ...e,
      id: idOf(
        ID_PREFIXES.lesson_question_example,
        uuidOf(ID_PREFIXES.lesson_question, e.lesson_question_id),
      ),
      pod_id: FEATURED_POD_ID,
      created_at: AT,
    })),
    questions: questions.map((q) => ({ ...q, pod_id: FEATURED_POD_ID, created_at: AT })),
  });
}

/** A client whose reads answer with `examplesReply`, or with `answer` when given. */
export function fakeApi(
  answer: (language: Language) => Promise<PlaygroundExamples> = async (language) =>
    examplesReply(language),
): PlaygroundClient {
  return { playgroundExamples: answer };
}
