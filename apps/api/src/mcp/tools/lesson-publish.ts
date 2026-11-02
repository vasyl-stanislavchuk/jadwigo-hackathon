import { ErrorType, LearnerId } from "@jadwigo/contracts";
import { fromJsonSchema } from "@modelcontextprotocol/server";
import { ApiError } from "../../errors.ts";
import { publishLesson } from "../../give.ts";
import type { McpTool } from "../tool.ts";
import { draftRun, latestTurn } from "./lesson-draft-run.ts";

/**
 * lesson_publish (dl-1u6fn.11): the parent said yes in their own AI's chat, which is the
 * confirmation. The draft's checked lesson becomes a version and an assignment for one child, as
 * the app's "Daj lekcję" does (`publishLesson`, dl-5ssh.136). A lesson that is not ready is refused
 * with what to fix (LessonNotPublishable), which the AI reads and acts on.
 */
export const lessonPublish: McpTool = {
  name: "lesson_publish",
  description:
    "Give the checked draft to one child to play, once the parent has said yes in this chat. learner_id is the child (from me). Returns play_url, the link the child opens to play it as themselves, and parent_url, where the parent follows how it goes. If the lesson is not ready, the error says what to do first (usually lesson_check until ok is true).",
  inputSchema: fromJsonSchema({
    type: "object",
    properties: { draft_id: { type: "string" }, learner_id: { type: "string" } },
    required: ["draft_id", "learner_id"],
    additionalProperties: false,
  }),
  run: async (raw, { store, member, appUrl }) => {
    const input = raw as { draft_id?: unknown; learner_id?: unknown };
    const draft = await draftRun(store, member.pod, input.draft_id);
    // Not while the app is changing the lesson: its next revision would go out unchecked or unseen.
    await latestTurn(store, member.pod, draft);
    const learner = LearnerId.safeParse(input.learner_id);
    if (!learner.success) throw new ApiError(ErrorType.enum.NotFound, "no such learner");
    const { assignment, lesson_version } = await publishLesson(store, member.pod, {
      conversation_id: draft.conversation_id,
      learner_id: learner.data,
    });
    return {
      assignment_id: assignment.id,
      lesson_version_id: lesson_version.id,
      play_url: appUrl(`/play/${assignment.id}?learner=${learner.data}`),
      parent_url: appUrl(`/parent/assignments/${assignment.id}`),
    };
  },
};
