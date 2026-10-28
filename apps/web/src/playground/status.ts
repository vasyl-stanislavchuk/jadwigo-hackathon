/**
 * Where a question type stands in the playground (decision
 * jadwigo-learner-experience/decisions/2026-10-27-the-playground-narrows-to-question-types-and-moves-into-the-jadw):
 * Refined once its family's design session is done (Choose, Enter, Slots), Draft while it plays but
 * has had no design iteration yet (Sequence, Group, Place, Explain), Idea while it is only proposed.
 * It replaces "In lessons" and "Playground only": lessons come later.
 */

import type { QuestionTypeInfo } from "@jadwigo/lesson-kit";

type Status = QuestionTypeInfo["status"];

export const STATUS_LABEL: Readonly<Record<Status, string>> = {
  refined: "Refined",
  draft: "Draft",
  idea: "Idea",
};

export const STATUS_MEANS: Readonly<Record<Status, string>> = {
  refined: "Its family's design session is done: the look and the behaviour are settled.",
  draft: "It plays, and its family has had no design session yet.",
  idea: "Proposed: no family plays it yet.",
};

export const statusLabel = (p: QuestionTypeInfo): string => STATUS_LABEL[p.status];
export const statusMeans = (p: QuestionTypeInfo): string => STATUS_MEANS[p.status];
