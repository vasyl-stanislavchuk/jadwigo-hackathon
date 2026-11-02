import { Need } from "@jadwigo/contracts";
import { searchQuestions } from "../../questions.ts";
import type { McpTool } from "../tool.ts";
import { bankHeaders } from "./bank.ts";

/** `POST /api/v1/question-searches` as a tool, after the member check, on the server's own bank token. */
export const questionSearch: McpTool = {
  name: "question_search",
  description:
    "Searches Jadwigo's question bank: a need in plain words (and skills, mistakes, a task to resemble), ranked questions out, each with its set.",
  inputSchema: Need,
  run: async (input, { deps }) => searchQuestions(deps.bank, await bankHeaders(deps), input),
};
