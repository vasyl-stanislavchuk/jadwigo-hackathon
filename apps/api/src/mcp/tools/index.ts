import type { McpTool } from "../tool.ts";
import { assignmentAttempts } from "./assignment-attempts.ts";
import { attachmentGet } from "./attachment-get.ts";
import { attemptReview } from "./attempt-review.ts";
import { conversationList } from "./conversation-list.ts";
import { conversationRuns } from "./conversation-runs.ts";
import { learnerAttempts } from "./learner-attempts.ts";
import { learnerGoals } from "./learner-goals.ts";
import { learnerSkills } from "./learner-skills.ts";
import { lessonCheck } from "./lesson-check.ts";
import { lessonDraft } from "./lesson-draft.ts";
import { lessonEdit } from "./lesson-edit.ts";
import { lessonShow } from "./lesson-show.ts";
import { me } from "./me.ts";
import { questionSearch } from "./question-search.ts";
import { questionSet } from "./question-set.ts";
import { questionShow } from "./question-show.ts";
import { reportLatest } from "./report-latest.ts";
import { reportList } from "./report-list.ts";
import { runEvents } from "./run-events.ts";
import { skills } from "./skills.ts";

/** Every remote MCP tool. A new tool is one file beside this one and one line here. */
export const TOOLS: readonly McpTool[] = [
  me,
  learnerAttempts,
  attemptReview,
  learnerSkills,
  skills,
  learnerGoals,
  reportList,
  reportLatest,
  assignmentAttempts,
  conversationList,
  conversationRuns,
  runEvents,
  attachmentGet,
  questionSearch,
  questionShow,
  questionSet,
  lessonDraft,
  lessonShow,
  lessonEdit,
  lessonCheck,
];
