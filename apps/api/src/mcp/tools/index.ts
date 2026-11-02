import type { McpTool } from "../tool.ts";
import { lessonCheck } from "./lesson-check.ts";
import { lessonDraft } from "./lesson-draft.ts";
import { lessonEdit } from "./lesson-edit.ts";
import { lessonPublish } from "./lesson-publish.ts";
import { lessonShow } from "./lesson-show.ts";
import { me } from "./me.ts";

/** Every remote MCP tool. A new tool is one file beside this one and one line here. */
export const TOOLS: readonly McpTool[] = [
  me,
  lessonDraft,
  lessonShow,
  lessonEdit,
  lessonCheck,
  lessonPublish,
];
