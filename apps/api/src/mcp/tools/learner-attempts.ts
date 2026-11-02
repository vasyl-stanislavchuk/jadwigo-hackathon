import { LearnerId } from "@jadwigo/contracts";
import { z } from "zod";
import { getLearnerAttempts } from "../../people.ts";
import type { McpTool } from "../tool.ts";

/** `GET /api/v1/learners/{id}/attempts` as a tool. */
export const learnerAttempts: McpTool = {
  name: "learner_attempts",
  description:
    "A child's lesson attempts, newest first, each with its lesson's title and the result of every question. learner_id comes from me.",
  inputSchema: z.object({ learner_id: LearnerId }),
  run: (input, { store, claims }) => {
    const { learner_id } = input as { learner_id: LearnerId };
    return getLearnerAttempts(store, claims, learner_id);
  },
};
