/**
 * `/playground/chat` (epic dl-z5ja, dl-z5ja.17): a parent's chat on the left becomes a lesson on
 * the right. Dev only: the engine runs in the dev server (`dev/engine-plugin.ts`) on an in-memory
 * store and a scripted model, so nothing here costs or calls out. Wave 2 moves the page onto the
 * conversation routes and the Realtime channel (dl-z5ja.21). A reload keeps the conversation (its
 * id is in the tab's session storage) and draws it again from the log.
 */

import { ConversationId } from "@jadwigo/contracts/run";
import { copy, type Language } from "@jadwigo/copy";
import { type ReactElement, useMemo, useState } from "react";
import { queryLanguage, useLocation } from "../route.ts";
import { Button } from "../tool/button.tsx";
import { ChatPane } from "./ChatPane.tsx";
import { type ConversationState, lessonOf, turnsOf } from "./conversation.ts";
import { newConversationId } from "./ids.ts";
import { LessonPane } from "./LessonPane.tsx";
import { type EngineTransport, hotTransport, useConversation } from "./useConversation.ts";

const STORED = "jadwigo.playground.chat.conversation";

function storedConversation(): ConversationId {
  const held = ConversationId.safeParse(window.sessionStorage.getItem(STORED));
  if (held.success) return held.data;
  const minted = newConversationId();
  window.sessionStorage.setItem(STORED, minted);
  return minted;
}

/** The 2 panes for a conversation's state: what the tests draw from the golden logs. */
function ChatView({
  language,
  state,
  onSend,
  onStop,
  onNew,
}: {
  language: Language;
  state: ConversationState;
  onSend(text: string): void;
  onStop(): void;
  onNew?: () => void;
}): ReactElement {
  const turns = turnsOf(state);
  return (
    <ChatLayout
      language={language}
      onNew={onNew}
      chat={
        <ChatPane
          language={language}
          turns={turns}
          queued={state.queued.map((q) => q.text)}
          restoring={state.connection === "restoring"}
          stopping={state.stopping}
          sendFailed={state.sendFailed}
          onSend={onSend}
          onStop={onStop}
        />
      }
      lesson={<LessonPane language={language} lesson={lessonOf(turns)} />}
    />
  );
}

function ChatLayout({
  language,
  chat,
  lesson,
  onNew,
}: {
  language: Language;
  chat: ReactElement;
  lesson: ReactElement;
  onNew?: (() => void) | undefined;
}): ReactElement {
  return (
    <main
      data-page="chat"
      className="grid h-dvh grid-rows-[auto_1fr] gap-4 p-4 text-foreground bg-background"
    >
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-medium">{copy(language, "chat_title", {}, "adult")}</h1>
        {onNew && (
          <Button variant="outline" size="sm" onClick={onNew}>
            {copy(language, "chat_new", {}, "adult")}
          </Button>
        )}
      </header>
      <div className="grid min-h-0 gap-6 md:grid-cols-2">
        <div data-pane="chat" className="flex min-h-0 flex-col">
          {chat}
        </div>
        <div data-pane="lesson" className="flex min-h-0 flex-col overflow-y-auto">
          {lesson}
        </div>
      </div>
    </main>
  );
}

function LiveChat({
  transport,
  conversation,
  language,
  onNew,
}: {
  transport: EngineTransport;
  conversation: ConversationId;
  language: Language;
  onNew(): void;
}): ReactElement {
  const { state, send, stop } = useConversation(transport, conversation);
  return <ChatView language={language} state={state} onSend={send} onStop={stop} onNew={onNew} />;
}

export function ChatScreen({ transport }: { transport?: EngineTransport } = {}): ReactElement {
  const { query } = useLocation();
  const language = queryLanguage(query) ?? "pl";
  const live = useMemo(() => transport ?? hotTransport(), [transport]);
  const [conversation, setConversation] = useState<ConversationId>(storedConversation);
  if (live === null)
    return (
      <p className="p-4">The chat page runs on the dev server only: start it with `make dev`.</p>
    );
  const startNew = () => {
    const minted = newConversationId();
    window.sessionStorage.setItem(STORED, minted);
    setConversation(minted);
  };
  return (
    <LiveChat
      key={conversation}
      transport={live}
      conversation={conversation}
      language={language}
      onNew={startNew}
    />
  );
}
