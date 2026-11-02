import type { McpTool } from "../tool.ts";
import { onDraft, verbDescription, verbSchema } from "./lesson-draft-run.ts";

/** The engine's lesson_edit on a draft lesson_draft made, as the lesson stands now. */
export const lessonEdit: McpTool = {
  name: "lesson_edit",
  description: verbDescription("lesson_edit"),
  inputSchema: verbSchema("lesson_edit"),
  run: (input, context) => onDraft("lesson_edit", input, context),
};
