/**
 * A teaching step (decision 2026-10-25-a-question-is-a-body-with-answer-slots-a-teaching-step-holds-no,
 * dl-uukj.29.43): a step that teaches and asks nothing. It holds no question, so it is no family: no
 * key, no judge, no Check. Its body is a stem (words, TeX, pictures, a figure) and `say` speaks it;
 * the footer's one action is Dalej (dl-uukj.29.39). It replaces the material family (say, show,
 * pattern, reveal) in the playground.
 */

import type { Stem } from "../stem/model.ts";

export interface TeachStep {
  id: string;
  /** Spoken verbatim by TTS. */
  say: string;
  teach: Stem;
}
