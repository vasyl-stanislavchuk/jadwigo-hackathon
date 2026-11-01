/** The ids the chat page mints: a conversation's, and each send's, so a resend lands once. */

import { EventId, ID_PREFIXES, idOf } from "@jadwigo/contracts";
import { ConversationId } from "@jadwigo/contracts/run";

export const newConversationId = (): ConversationId =>
  ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID()));
export const newEventId = (): EventId => EventId.parse(crypto.randomUUID());
