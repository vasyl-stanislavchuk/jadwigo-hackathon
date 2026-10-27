/**
 * Explain: the learner explains a reason, typed today and aloud later. Question type: explain. ClassTime's
 * ESSAY, but judged by the AI tutor against criteria written and cited before the task, never by
 * a teacher after it (charter: grounded-judgement). The criteria carry a version, and a judgement
 * keeps the version it used (ClassTime's AiPrediction.rubric_version).
 *
 * In a lesson a typed explanation is judged after the lesson, in /dl-debrief on the subscription,
 * never during it as a paid call: the step closes calmly and the judgement reaches the learner's
 * report (decision 2026-10-16-typed-explanations-judged-after-the-lesson). The
 * playground has no tutor, so the owner judges each criterion by hand before Check (dl-w3.51.11).
 */

import type { ExplainData } from "@jadwigo/contracts";

export type { Criterion, ExplainData } from "@jadwigo/contracts";

/** The soft minimum when a step names none: one short sentence for a nine-year-old. */
export const EXPLAIN_MIN_WORDS = 4;

/** The tutor's judgement of one criterion, with its reason. */
export interface CriterionJudgement {
  id: string;
  met: boolean;
  reason: string;
}

/** The words in an explanation: runs with a letter or a digit, so punctuation alone counts for nothing. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Whether the text is under the step's soft minimum (and not empty: that is `missingText`). */
export function isShort(data: Pick<ExplainData, "min_words">, text: string): boolean {
  const n = wordCount(text);
  return n > 0 && n < (data.min_words ?? EXPLAIN_MIN_WORDS);
}
