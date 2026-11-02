import { LearnerId } from "@jadwigo/contracts";
import { z } from "zod";
import { getLearnerGoals } from "../../knowledge.ts";
import type { McpTool } from "../tool.ts";

/** `GET /api/v1/learners/{id}/goals` as a tool. */
export const learnerGoals: McpTool = {
  name: "learner_goals",
  description: "A child's goals, oldest first, each with its skills and how far along it is.",
  inputSchema: z.object({ learner_id: LearnerId }),
  run: (input, { store, claims }) => {
    const { learner_id } = input as { learner_id: LearnerId };
    return getLearnerGoals(store, claims, learner_id);
  },
};
