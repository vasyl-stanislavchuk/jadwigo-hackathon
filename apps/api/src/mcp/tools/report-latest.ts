import { LearnerId } from "@jadwigo/contracts";
import { z } from "zod";
import { getLearnerReports } from "../../knowledge.ts";
import type { McpTool } from "../tool.ts";

/**
 * The newest stored report row, or null (decision
 * `2026-11-02-the-report-a-parent-s-ai-reads-through-the-mcp-is-the-newest-sto`): read, never made.
 */
export const reportLatest: McpTool = {
  name: "report_latest",
  description:
    "A child's latest report: the newest stored one, its digest and narrative, or null when there is none yet. Pair it with learner_skills for what the child can do now.",
  inputSchema: z.object({ learner_id: LearnerId }),
  run: async (input, { store, claims }) => {
    const { learner_id } = input as { learner_id: LearnerId };
    const { reports } = await getLearnerReports(store, claims, learner_id);
    return { report: reports[0] ?? null };
  },
};
