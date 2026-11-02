import type { McpTool } from "../tool.ts";
import { draftLesson, verbDescription, verbSchema } from "./lesson-draft-run.ts";

/** The engine's lesson_draft for one child of the family: a draft the app opens at open_url. */
export const lessonDraft: McpTool = {
  name: "lesson_draft",
  description: `${verbDescription("lesson_draft")} learner_id is the child it is for (from me); count is 1 to 20. Returns draft_id for the other lesson tools, and open_url, where the parent sees and edits the draft in Jadwigo.`,
  inputSchema: verbSchema("lesson_draft", {
    properties: { learner_id: { type: "string" } },
    required: ["learner_id"],
  }),
  run: draftLesson,
};
