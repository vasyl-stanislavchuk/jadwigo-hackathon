/**
 * `/playground/chat` (epic dl-z5ja, dl-z5ja.17): a parent's chat on the left becomes a lesson on
 * the right. Dev only: the engine runs in the dev server (`dev/engine-plugin.ts`) on an in-memory
 * store and a scripted model, so nothing here costs or calls out. Wave 2 moves the page onto the
 * conversation routes and the Realtime channel (dl-z5ja.21). A reload keeps the conversation (its
 * id is in the tab's session storage) and draws it again from the log.
 */

import type { RunRatingClient } from "@jadwigo/api-client";
import { ConversationId, type RunId, type RunRatingCreate } from "@jadwigo/contracts/run";
import { copy, type Language } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { queryLanguage, useLocation } from "../route.ts";
import { Button } from "../tool/button.tsx";
import { ChatPane } from "./ChatPane.tsx";
import { type ConversationState, lessonOf, type Turn, turnsOf } from "./conversation.ts";
import { newConversationId } from "./ids.ts";
import { LessonPane } from "./LessonPane.tsx";
import { type LessonChange, patchOutcome } from "./patches.ts";
import { apiTransport } from "./realtime.ts";
import { changedOf, revertOf, undoOf } from "./revisions.ts";
import { undoSteer } from "./steerText.ts";
import { type EngineTransport, hotTransport, useConversation } from "./useConversation.ts";

const STORED = "jadwigo.playground.chat.conversation";

function storedConversation(): ConversationId {
  const held = ConversationId.safeParse(window.sessionStorage.getItem(STORED));
  if (held.success) return held.data;
  const minted = newConversationId();
  window.sessionStorage.setItem(STORED, minted);
  return minted;
}

/** Which lesson the right pane draws, as a key that changes with each new revision of any turn. */
function lessonKey(turns: readonly Turn[]): string | null {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i];
    if (turn?.view.lesson) return `${turn.run.id}:${turn.view.lesson.revision}`;
  }
  return null;
}

/**
 * The height the page may use: the visual viewport's, which shrinks when the phone's keyboard
 * opens, so the composer at the bottom stays above it (dl-z5ja.28). Null where there is none, and
 * the page keeps `h-dvh`.
 */
function useViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(() => window.visualViewport?.height ?? null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const on = () => setHeight(viewport.height);
    viewport.addEventListener("resize", on);
    return () => viewport.removeEventListener("resize", on);
  }, []);
  return height;
}

type PaneName = "chat" | "lesson";

/** The 2 panes for a conversation's state: what the tests draw from the golden logs. */
function ChatView({
  language,
  state,
  onSend,
  onStop,
  onEdit,
  onNew,
  onRate,
}: {
  language: Language;
  state: ConversationState;
  onSend(text: string): void;
  onStop(): void;
  onEdit?: (text: string, question_ids: string[], change?: LessonChange) => unknown;
  onNew?: () => void;
  /** Rates a completed turn by its run (dl-z5ja.63). */
  onRate?: ((run: RunId, body: RunRatingCreate) => Promise<unknown>) | undefined;
}): ReactElement {
  const turns = turnsOf(state);
  /** The last Cofnij's patch steer, followed to its revision or its refusal (dl-z5ja.111). */
  const [undoSent, setUndoSent] = useState<string | null>(null);
  const outcomeOf = (event_id: string) => patchOutcome(state.runs, event_id);
  const shown = lessonOf(turns);
  const changed = changedOf(turns);
  const undo = undoOf(turns);
  const revert = revertOf(turns);
  /**
   * "Cofnij": a lesson_edit steer back to the revision before, carrying the patch that restores it,
   * which the runner applies with no model call (dl-z5ja.111). Where no patch can say it, the steer
   * asks the AI to take the change back in words (dl-z5ja.30, .42).
   */
  const onUndo =
    undo === null || onEdit === undefined
      ? undefined
      : () => {
          const text = undoSteer(undo.language, undo.question_ids, undo.revision);
          if (revert === null || shown === null) {
            onEdit(text, undo.question_ids);
            return;
          }
          // The revision Cofnij undoes from: the one the pane shows.
          const sent = onEdit(text, undo.question_ids, {
            patch: revert,
            base_revision: shown.revision,
          });
          setUndoSent(typeof sent === "string" ? sent : null);
        };
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
          sendLimit={state.sendLimit}
          onSend={onSend}
          onStop={onStop}
          onRate={onRate}
        />
      }
      lesson={
        <LessonPane
          language={language}
          lesson={shown}
          changed={changed}
          onUndo={onUndo}
          undoRefused={undoSent !== null && outcomeOf(undoSent) === "refused"}
          onEdit={onEdit}
          outcomeOf={outcomeOf}
        />
      }
      lessonKey={lessonKey(turns)}
    />
  );
}

/**
 * Side by side from the lg width. Below it, one pane at a time with a Rozmowa/Lekcja switch, and a
 * badge on Lekcja when a revision lands while the chat is in front (dl-z5ja.28). Whether the panes
 * sit side by side or one at a time is a layout claim, checked in e2e/chat.spec.ts.
 */
function ChatLayout({
  language,
  chat,
  lesson,
  lessonKey,
  onNew,
}: {
  language: Language;
  chat: ReactElement;
  lesson: ReactElement;
  lessonKey: string | null;
  onNew?: (() => void) | undefined;
}): ReactElement {
  const say = (key: Parameters<typeof copy>[1]) => copy(language, key, {}, "adult");
  const [front, setFront] = useState<PaneName>("chat");
  const [seen, setSeen] = useState<string | null>(lessonKey);
  const height = useViewportHeight();
  if (front === "lesson" && seen !== lessonKey) setSeen(lessonKey);
  const changed = front === "chat" && lessonKey !== null && lessonKey !== seen;
  const tab = (name: PaneName, label: string, badge: boolean) => (
    <button
      type="button"
      role="tab"
      aria-selected={front === name}
      aria-controls={`pane-${name}`}
      data-tab={name}
      onClick={() => setFront(name)}
      className={cn(
        "flex-1 rounded-md px-3 py-1 text-sm",
        front === name ? "bg-muted font-medium" : "text-muted-foreground",
      )}
    >
      {label}
      {badge && (
        <span
          data-badge
          className="bg-primary text-primary-foreground ml-2 rounded-full px-2 text-xs"
        >
          {say("chat_lesson_changed")}
        </span>
      )}
    </button>
  );
  return (
    <main
      data-page="chat"
      style={height === null ? undefined : { height }}
      className="grid h-dvh grid-rows-[auto_auto_1fr] gap-4 p-4 text-foreground bg-background lg:grid-rows-[auto_1fr]"
    >
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-medium">{say("chat_title")}</h1>
        {onNew && (
          <Button variant="outline" size="sm" onClick={onNew}>
            {say("chat_new")}
          </Button>
        )}
      </header>
      <div role="tablist" aria-label={say("chat_switch")} className="flex gap-1 lg:hidden">
        {tab("chat", say("chat_title"), false)}
        {tab("lesson", say("chat_lesson_title"), changed)}
      </div>
      <div className="grid min-h-0 gap-6 lg:grid-cols-2">
        <div
          id="pane-chat"
          data-pane="chat"
          data-front={front === "chat"}
          className={cn("min-h-0 flex-col lg:flex", front === "chat" ? "flex" : "hidden")}
        >
          {chat}
        </div>
        <div
          id="pane-lesson"
          data-pane="lesson"
          data-front={front === "lesson"}
          className={cn(
            "min-h-0 flex-col overflow-y-auto lg:flex",
            front === "lesson" ? "flex" : "hidden",
          )}
        >
          {lesson}
        </div>
      </div>
    </main>
  );
}

function LiveChat({
  transport,
  ratings,
  conversation,
  language,
  onNew,
}: {
  transport: EngineTransport;
  /** The rating route, on the routes transport only (dl-z5ja.63). */
  ratings: RunRatingClient | null;
  conversation: ConversationId;
  language: Language;
  onNew(): void;
}): ReactElement {
  const { state, send, stop, edit } = useConversation(transport, conversation);
  return (
    <ChatView
      language={language}
      state={state}
      onSend={send}
      onStop={stop}
      onEdit={edit}
      onNew={onNew}
      onRate={ratings === null ? undefined : (run, body) => ratings.rateRun(run, body)}
    />
  );
}

/**
 * The page's transport: a test's, else the dev server's (`make dev`), else the conversation routes
 * and Realtime of the build's Supabase project (dl-z5ja.65). `?engine=api` takes the routes on the
 * dev server too, through its `/api` proxy. Null when there is neither.
 */
function useEngine(
  given: EngineTransport | undefined,
  givenRatings: RunRatingClient | undefined,
  engine: string | null,
): {
  transport: EngineTransport;
  signIn: (() => Promise<string | null>) | null;
  ratings: RunRatingClient | null;
} | null {
  return useMemo(() => {
    if (given) return { transport: given, signIn: null, ratings: givenRatings ?? null };
    const hot = engine === "api" ? null : hotTransport();
    if (hot) return { transport: hot, signIn: null, ratings: null };
    const api = apiTransport();
    return api === null
      ? null
      : { transport: api.transport, signIn: () => api.auth.token(), ratings: api.client };
  }, [given, givenRatings, engine]);
}

export function ChatScreen({
  transport,
  ratings,
}: {
  transport?: EngineTransport;
  /** A test's rating route, beside its transport. */
  ratings?: RunRatingClient;
} = {}): ReactElement {
  const { query } = useLocation();
  const language = queryLanguage(query) ?? "pl";
  const live = useEngine(transport, ratings, query.get("engine"));
  const [conversation, setConversation] = useState<ConversationId>(storedConversation);
  /** Null until known; the routes refuse a parent who is not signed in. */
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const signIn = live?.signIn ?? null;
  useEffect(() => {
    if (signIn === null) return;
    void signIn().then((token) => setSignedIn(token !== null));
  }, [signIn]);
  if (live === null) return <p className="p-4">{copy(language, "chat_dev_only", {}, "adult")}</p>;
  if (signIn !== null && signedIn === false)
    return <p className="p-4">{copy(language, "chat_sign_in", {}, "adult")}</p>;
  const startNew = () => {
    const minted = newConversationId();
    window.sessionStorage.setItem(STORED, minted);
    setConversation(minted);
  };
  return (
    <LiveChat
      key={conversation}
      transport={live.transport}
      ratings={live.ratings}
      conversation={conversation}
      language={language}
      onNew={startNew}
    />
  );
}
