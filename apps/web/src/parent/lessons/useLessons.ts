/**
 * The family's conversations, read once for the whole signed-in app (dl-uukj.47.9): the Lekcje table
 * draws them, and the sidebar drops its "Lekcje i historia pojawią się tu…" line once there is one.
 * Read again when `again` changes (the page moved to another place, or a new conversation opened),
 * so a lesson just made or saved is listed. Archive is the parent's delete (decision dl-84wo): the
 * row leaves only once the route answers.
 */

import type { ConversationListClient } from "@jadwigo/api-client";
import type { Conversation, ConversationId } from "@jadwigo/contracts";
import { useCallback, useEffect, useState } from "react";

/** The rows, newest first; "failed" when the route failed; null while it is read. */
export type LessonRows = readonly Conversation[] | "failed" | null;

export interface Lessons {
  rows: LessonRows;
  /** Archives one; rejects when the route fails, and the row stays. */
  archive: (id: ConversationId) => Promise<void>;
}

export function useLessons(list: ConversationListClient | null, again: string): Lessons {
  const [rows, setRows] = useState<LessonRows>(list === null ? [] : null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `again` is the cue to read once more
  useEffect(() => {
    if (list === null) return;
    let live = true;
    list.listConversations().then(
      (reply) => live && setRows(reply.conversations),
      () => live && setRows((held) => (Array.isArray(held) ? held : "failed")),
    );
    return () => {
      live = false;
    };
  }, [list, again]);

  const archive = useCallback(
    async (id: ConversationId): Promise<void> => {
      if (list === null) return;
      await list.patchConversation(id, { archived: true });
      setRows((held) => (Array.isArray(held) ? held.filter((row) => row.id !== id) : held));
    },
    [list],
  );

  return { rows, archive };
}
