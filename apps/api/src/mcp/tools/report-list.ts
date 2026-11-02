import { LearnerId } from "@jadwigo/contracts";
import { z } from "zod";
import { getLearnerReports } from "../../knowledge.ts";
import type { McpTool } from "../tool.ts";

/** `GET /api/v1/learners/{id}/reports` as a tool. */
export const reportList: McpTool = {
  name: "report_list",
  description: "A child's stored reports, newest first: each one's digest and its narrative.",
  inputSchema: z.object({ learner_id: LearnerId }),
  run: (input, { store, claims }) => {
    const { learner_id } = input as { learner_id: LearnerId };
    return getLearnerReports(store, claims, learner_id);
  },
};
