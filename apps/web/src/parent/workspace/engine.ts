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

import type { ConversationClient, LessonGiveClient, RunRatingClient } from "@jadwigo/api-client";
import { AttachmentId, type ConversationId } from "@jadwigo/contracts";
import type { ConsentClient } from "../../chat/ConsentScreen.tsx";
import { apiTransport } from "../../chat/realtime.ts";
import type { EngineTransport } from "../../chat/useConversation.ts";

export interface LessonEngine {
  conversations: Pick<ConversationClient, "createConversation">;
  transport: EngineTransport;
  consent: ConsentClient | null;
  ratings: RunRatingClient | null;
  /** Gives the checked lesson to play (dl-uukj.47.55); null where there is no sign-in to give with. */
  give: LessonGiveClient | null;
  /**
   * The signed-in account, by the sign-in's token: the "Następne" queue is kept for it alone
   * (chat/queue.ts). Absent where there is no sign-in.
   */
  owner?: () => Promise<string | null>;
}

/** The `sub` of a JWT: who signed in. Null for no token or one that does not read. */
function subOf(jwt: string | null): string | null {
  const body = jwt?.split(".")[1];
  if (body === undefined) return null;
  try {
    const claims: unknown = JSON.parse(atob(body.replaceAll("-", "+").replaceAll("_", "/")));
    const sub = (claims as { sub?: unknown }).sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
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
    give: api.client,
    owner: async () => subOf(await api.auth.token()),
  };
}

const KEY = (conversation: ConversationId) => `jw.parent.first.${conversation}`;

/** The first screen's send: its words and the photos it uploaded (dl-z5ja.11.16). */
export interface FirstMessage {
  text: string;
  attachment_ids: AttachmentId[];
}

/**
 * The kept value read back: the JSON this page writes, or the plain words a tab opened before photos
 * came wrote, which go with no photos. An id that does not read is left off.
 */
function readFirst(raw: string): FirstMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { text: raw, attachment_ids: [] };
  }
  if (typeof parsed !== "object" || parsed === null) return { text: raw, attachment_ids: [] };
  const { text, attachment_ids } = parsed as { text?: unknown; attachment_ids?: unknown };
  if (typeof text !== "string") return { text: raw, attachment_ids: [] };
  const ids = Array.isArray(attachment_ids) ? attachment_ids : [];
  return {
    text,
    attachment_ids: ids.flatMap((id) => {
      const read = AttachmentId.safeParse(id);
      return read.success ? [read.data] : [];
    }),
  };
}

/** The first screen's words and photos, kept for the conversation they made until its page sends them. */
export const firstMessage = {
  /** Plain words are kept as they are, the shape `take` also reads from an older tab. */
  put(
    conversation: ConversationId,
    first: FirstMessage | string,
    held: Storage = window.sessionStorage,
  ): void {
    try {
      held.setItem(KEY(conversation), typeof first === "string" ? first : JSON.stringify(first));
    } catch {
      // Storage refused: the workspace opens on an empty chat and the parent writes again.
    }
  },
  /** The send, once: taken out as it is read, so a reload never sends it twice. */
  take(conversation: ConversationId, held: Storage = window.sessionStorage): FirstMessage | null {
    try {
      const raw = held.getItem(KEY(conversation));
      held.removeItem(KEY(conversation));
      return raw === null ? null : readFirst(raw);
    } catch {
      return null;
    }
  },
};
