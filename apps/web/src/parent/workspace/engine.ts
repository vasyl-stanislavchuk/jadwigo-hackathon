/**
 * What the parent's lesson workspace runs on (dl-z5ja.108): the route that makes a conversation,
 * the transport that sends and follows its turns, and the consent and rating routes. In the browser
 * it is the conversation routes and Realtime of the build's Supabase project (apiTransport, the
 * playground chat's, reused as the owner chose on 2026-11-01; moving it out is dl-uukj.47.11).
 * Tests pass their own.
 *
 * The first message waits in the tab between the first screen and the workspace, so the send that
 * made the conversation and the page that follows it are two steps a reload cannot repeat.
 */

import type { ConversationClient, RunRatingClient } from "@jadwigo/api-client";
import type { ConversationId } from "@jadwigo/contracts";
import type { ConsentClient } from "../../playground/chat/ConsentScreen.tsx";
import { apiTransport } from "../../playground/chat/realtime.ts";
import type { EngineTransport } from "../../playground/chat/useConversation.ts";

export interface LessonEngine {
  conversations: Pick<ConversationClient, "createConversation">;
  transport: EngineTransport;
  consent: ConsentClient | null;
  ratings: RunRatingClient | null;
}

/** The build's engine, or null when it has no Supabase project (no sign-in, no chat). */
export function browserEngine(): LessonEngine | null {
  const api = apiTransport();
  if (api === null) return null;
  return {
    conversations: api.client,
    transport: api.transport,
    consent: api.client,
    ratings: api.client,
  };
}

const KEY = (conversation: ConversationId) => `jw.parent.first.${conversation}`;

/** The first screen's words, kept for the conversation they made until its page sends them. */
export const firstMessage = {
  put(conversation: ConversationId, text: string, held: Storage = window.sessionStorage): void {
    try {
      held.setItem(KEY(conversation), text);
    } catch {
      // Storage refused: the workspace opens on an empty chat and the parent writes again.
    }
  },
  /** The words, once: taken out as they are read, so a reload never sends them twice. */
  take(conversation: ConversationId, held: Storage = window.sessionStorage): string | null {
    try {
      const text = held.getItem(KEY(conversation));
      held.removeItem(KEY(conversation));
      return text;
    } catch {
      return null;
    }
  },
};
