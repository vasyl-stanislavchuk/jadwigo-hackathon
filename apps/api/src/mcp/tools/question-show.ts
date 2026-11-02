import { z } from "zod";
import { questionBody } from "../../questions.ts";
import type { McpTool } from "../tool.ts";
import { bankHeaders } from "./bank.ts";

/** `GET /api/v1/questions/{id}` as a tool, on the server's own bank token. */
export const questionShow: McpTool = {
  name: "question_show",
  description:
    "One bank question in full, its answer key included. The question_id comes from question_search.",
  inputSchema: z.object({ question_id: z.string() }),
  run: async (input, { deps }) => {
    const { question_id } = input as { question_id: string };
    return questionBody(deps.bank, deps.bucket, await bankHeaders(deps), question_id);
  },
};
