import { LearnerId } from "@jadwigo/contracts";
import { z } from "zod";
import { getLearnerSkills } from "../../knowledge.ts";
import type { McpTool } from "../tool.ts";

/** `GET /api/v1/learners/{id}/skills` as a tool. */
export const learnerSkills: McpTool = {
  name: "learner_skills",
  description:
    "What a child can do: each skill's mastery folded from their answers, and the brief of what to practise next.",
  inputSchema: z.object({ learner_id: LearnerId }),
  run: (input, { store, claims }) => {
    const { learner_id } = input as { learner_id: LearnerId };
    return getLearnerSkills(store, claims, learner_id);
  },
};
