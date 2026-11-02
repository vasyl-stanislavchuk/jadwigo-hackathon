import { ConversationId } from "@jadwigo/contracts";
import { z } from "zod";
import { listConversationRuns } from "../../conversations.ts";
import type { McpTool } from "../tool.ts";

/** `GET /api/v1/conversations/{id}/runs` as a tool. */
export const conversationRuns: McpTool = {
  name: "conversation_runs",
  description:
    "A conversation's turns (runs), oldest first. Read a turn's messages and lessons with run_events.",
  inputSchema: z.object({ conversation_id: ConversationId }),
  run: (input, { store, claims }) => {
    const { conversation_id } = input as { conversation_id: ConversationId };
    return listConversationRuns(store, claims, conversation_id);
  },
};
