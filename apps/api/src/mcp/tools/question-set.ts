import { z } from "zod";
import { questionSet as readSet } from "../../questions.ts";
import type { McpTool } from "../tool.ts";
import { bankHeaders } from "./bank.ts";

/** `GET /api/v1/question-sets/{id}` as a tool, on the server's own bank token. */
export const questionSet: McpTool = {
  name: "question_set",
  description:
    "One bank question set: its question ids, and the ones ready for a lesson in each language. The set_id comes from question_search.",
  inputSchema: z.object({ set_id: z.string() }),
  run: async (input, { deps }) => {
    const { set_id } = input as { set_id: string };
    return readSet(deps.bank, await bankHeaders(deps), set_id);
  },
};
