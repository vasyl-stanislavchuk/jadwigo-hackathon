import { listSkills } from "../../knowledge.ts";
import type { McpTool } from "../tool.ts";

/** `GET /api/v1/skills` as a tool. */
export const skills: McpTool = {
  name: "skills",
  description: "The skill catalogue your family's lessons and goals use, by code and name.",
  run: (_input, { store, claims }) => listSkills(store, claims),
};
