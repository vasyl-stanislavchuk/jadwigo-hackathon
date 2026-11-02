/**
 * Each verb's own words, as a tool line, the activity line and the folded summary say them
 * (dl-z5ja.17, dl-uukj.47.29). A verb name never reaches the parent.
 */

import type { VerbName } from "@jadwigo/contracts/run";
import type { CopyKey } from "@jadwigo/copy";

export const TOOL_KEY: Readonly<Record<VerbName, CopyKey>> = {
  lesson_draft: "chat_tool_lesson_draft",
  lesson_show: "chat_tool_lesson_show",
  lesson_edit: "chat_tool_lesson_edit",
  lesson_check: "chat_tool_lesson_check",
  question_search: "chat_tool_question_search",
  learner_skills: "chat_tool_learner_skills",
  learner_week: "chat_tool_learner_week",
  learner_mistakes: "chat_tool_learner_mistakes",
  curriculum_topics: "chat_tool_curriculum_topics",
  lesson_ideas: "chat_tool_lesson_ideas",
};
