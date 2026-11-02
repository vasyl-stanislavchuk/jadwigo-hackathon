import { AttemptId, LearnerId } from "@jadwigo/contracts";
import { z } from "zod";
import { getParentReview } from "../../review.ts";
import type { McpTool } from "../tool.ts";

/** `GET /api/v1/learners/{id}/attempts/{attempt}/review` as a tool. */
export const attemptReview: McpTool = {
  name: "attempt_review",
  description:
    "One attempt of a child's, question by question, with every try, the help used and what was skipped. The attempt_id comes from learner_attempts.",
  inputSchema: z.object({ learner_id: LearnerId, attempt_id: AttemptId }),
  run: (input, { store, claims }) => {
    const { learner_id, attempt_id } = input as { learner_id: LearnerId; attempt_id: AttemptId };
    return getParentReview(store, claims, learner_id, attempt_id);
  },
};
