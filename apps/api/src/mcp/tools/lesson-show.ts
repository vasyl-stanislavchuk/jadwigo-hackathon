import type { McpTool } from "../tool.ts";
import { onDraft, verbDescription, verbSchema } from "./lesson-draft-run.ts";

/** The engine's lesson_show on a draft lesson_draft made, as the lesson stands now. */
export const lessonShow: McpTool = {
  name: "lesson_show",
  description: verbDescription("lesson_show"),
  inputSchema: verbSchema("lesson_show"),
  run: (input, context) => onDraft("lesson_show", input, context),
};
