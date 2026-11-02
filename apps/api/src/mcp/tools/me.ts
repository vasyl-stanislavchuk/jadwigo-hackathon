import { Me } from "@jadwigo/contracts";
import type { McpTool } from "../tool.ts";

/** `GET /api/v1/me` as a tool: the parent's pod, account and children (learners), oldest first. */
export const me: McpTool = {
  name: "me",
  description:
    "Who you are signed in as in Jadwigo: your family's pod, your account, and your children (learners) with their ids. Call it first: other tools take a learner_id from it.",
  run: async (_input, { store, member }) => Me.parse(await store.getMe(member.pod, member.account)),
};
