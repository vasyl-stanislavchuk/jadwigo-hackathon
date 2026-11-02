import { AssignmentId } from "@jadwigo/contracts";
import { z } from "zod";
import { getAssignmentAttempts } from "../../people.ts";
import type { McpTool } from "../tool.ts";

/** `GET /api/v1/assignments/{id}/attempts` as a tool. */
export const assignmentAttempts: McpTool = {
  name: "assignment_attempts",
  description:
    "One given lesson (an assignment) and every attempt at it your family can see, newest first, with each question's result.",
  inputSchema: z.object({ assignment_id: AssignmentId }),
  run: (input, { store, claims }) => {
    const { assignment_id } = input as { assignment_id: AssignmentId };
    return getAssignmentAttempts(store, claims, assignment_id);
  },
};
