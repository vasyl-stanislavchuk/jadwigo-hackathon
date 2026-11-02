import { AttachmentId } from "@jadwigo/contracts";
import { z } from "zod";
import { getAttachment } from "../../attachments.ts";
import type { McpTool } from "../tool.ts";

/** `GET /api/v1/attachments/{id}` as a tool. */
export const attachmentGet: McpTool = {
  name: "attachment_get",
  description:
    "A photo a message in a conversation carries, with a link to it that works for 5 minutes.",
  inputSchema: z.object({ attachment_id: AttachmentId }),
  run: (input, { store, claims, deps }) => {
    const { attachment_id } = input as { attachment_id: AttachmentId };
    return getAttachment(store, { uploads: deps.uploads, now: deps.now }, claims, attachment_id);
  },
};
