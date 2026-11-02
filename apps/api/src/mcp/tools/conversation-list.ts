import { listConversations } from "../../conversations.ts";
import type { McpTool } from "../tool.ts";

/** `GET /api/v1/conversations` as a tool. */
export const conversationList: McpTool = {
  name: "conversation_list",
  description:
    "Your conversations with Jadwigo's AI in the app, newest first; archived ones are left out.",
  run: (_input, { store, claims }) => listConversations(store, claims),
};
