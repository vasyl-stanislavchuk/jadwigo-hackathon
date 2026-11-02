import { RunId } from "@jadwigo/contracts";
import { z } from "zod";
import { listRunEvents } from "../../conversations.ts";
import type { McpTool } from "../tool.ts";

/** `GET /api/v1/runs/{id}/events` as a tool. */
export const runEvents: McpTool = {
  name: "run_events",
  description:
    "A turn's events in order: the messages, the tool calls and the lesson revisions. Pass after, the last seq you hold, to read only what is new.",
  inputSchema: z.object({ run_id: RunId, after: z.int().min(0).optional() }),
  run: (input, { store, claims }) => {
    const { run_id, after } = input as { run_id: RunId; after?: number };
    return listRunEvents(store, claims, run_id, after);
  },
};
