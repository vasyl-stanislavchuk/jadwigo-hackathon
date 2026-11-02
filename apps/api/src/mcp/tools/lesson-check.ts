import type { McpTool } from "../tool.ts";
import { onDraft, verbDescription, verbSchema } from "./lesson-draft-run.ts";

/** The engine's lesson_check on a draft lesson_draft made, as the lesson stands now. */
export const lessonCheck: McpTool = {
  name: "lesson_check",
  description: verbDescription("lesson_check"),
  inputSchema: verbSchema("lesson_check"),
  run: (input, context) => onDraft("lesson_check", input, context),
};
