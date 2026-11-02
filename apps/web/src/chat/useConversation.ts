/**
 * The chat page's live side (dl-z5ja.17): for each run, subscribe to `run:<id>` first, then fetch
 * its log after the cursor, and let `conversationReducer` merge the two. A dropped connection
 * shows Restoring and fetches every run again after its cursor once the socket is back. The
 * transport is the dev server's (`hotTransport`) and a test's stand-in, the same interface.
 */

import { ApiError } from "@jadwigo/api-client";
import { ErrorType, type EventId } from "@jadwigo/contracts";
import type { ConversationId, MessageContext, Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  type ConversationState,
  conversationReducer,
  cursorOf,
  EMPTY,
  isOpen,
  type SendLimit,
  turnsOf,
} from "./conversation.ts";
import { newEventId } from "./ids.ts";
import type { LessonChange } from "./patches.ts";
import { useNextQueue } from "./queue.ts";
import {
  type EventsAnswer,
  eventsPath,
  type LivePush,
  messagesPath,
  type Pace,
  type RunsAnswer,
  runChannel,
  runsPath,
  type SendAnswer,
  type SendBody,
} from "./wire.ts";

/** Which message limit refused a send, read by the error's type, never its text; null for any other failure. */
function limitOf(e: unknown): SendLimit | null {
  if (!(e instanceof ApiError)) return null;
  if (e.type === ErrorType.enum.MessageLimitMinute) return "minute";
  if (e.type === ErrorType.enum.MessageLimitDay) return "day";
  return null;
}

/** Whether the routes refused the conversation itself: not this family's, or not there (dl-uukj.47.33). */
const refusedConversation = (e: unknown): boolean =>
  e instanceof ApiError && (e.status === 404 || e.status === 403);

/** Whether a route refused for want of the pod's consent to the AI (dl-z5ja.112), by its type. */
const consentMissing = (e: unknown): boolean =>
  e instanceof ApiError && e.type === ErrorType.enum.AiConsentMissing;

/**
 * The live channel's state (dl-uukj.47.29): `up`, `down` while it drops and may come back on its
 * own, or `error` when it refused the page, which is said as stalled, never as failed.
 */
export type Link = "up" | "down" | "error";

export interface EngineTransport {
  /** Live pushes for one run; answers the unsubscribe. */
  subscribe(run: RunId, onEvents: (events: readonly RunEvent[]) => void): () => void;
  /** The channel going down, refusing, and coming back; answers the unsubscribe. */
  onConnection(on: (link: Link) => void): () => void;
  runs(conversation: ConversationId): Promise<Run[]>;
  events(run: RunId, after: number): Promise<RunEvent[]>;
  send(body: SendBody): Promise<Run>;
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

/** The dev server's transport: HMR custom events for the live channel, fetch for the log. Null
 * outside `vite` serve, where the engine plugin does not run. A pace plays every turn it sends
 * slow, stalled or failed (wire.ts). */
export function hotTransport(pace: Pace | null = null): EngineTransport | null {
  const hot = import.meta.hot;
  if (hot === undefined) return null;
  return {
    subscribe(run, onEvents) {
      const on = (push: LivePush) => onEvents(push.events);
      hot.on(runChannel(run), on);
      return () => hot.off(runChannel(run), on);
    },
    onConnection(on) {
      const down = () => on("down");
      const up = () => on("up");
      hot.on("vite:ws:disconnect", down);
      hot.on("vite:ws:connect", up);
      return () => {
        hot.off("vite:ws:disconnect", down);
        hot.off("vite:ws:connect", up);
      };
    },
    runs: async (conversation) =>
      (await json<RunsAnswer>(await fetch(runsPath(conversation)))).runs,
    events: async (run, after) =>
      (await json<EventsAnswer>(await fetch(eventsPath(run, after)))).events,
    send: async (body) =>
      (
        await json<SendAnswer>(
          await fetch(messagesPath(pace), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
        )
      ).run,
  };
}

export interface Conversation {
  state: ConversationState;
  /** Sends the parent's words, with the page they were sent from when there is one (dl-uukj.47.12). */
  send(text: string, context?: MessageContext): void;
  stop(): void;
  /**
   * A parent's edit in the lesson pane (dl-z5ja.30): a steer naming the questions while the turn
   * runs, which the runner keeps (dl-z5ja.42); after the turn, the same words as a new message,
   * since a steer on an ended turn changes nothing. With a `patch`, the parent's own change, it is
   * always a steer, with the revision it was made on: the runner applies it to the last turn with
   * no model call while the lesson is still at that revision (dl-z5ja.111). Answers the steer's
   * `event_id`, which the pane follows to its revision, or null when it went as a message.
   */
  edit(text: string, question_ids: string[], change?: LessonChange): EventId | null;
  /**
   * True once a route answered 409 `AiConsentMissing` (dl-z5ja.32): the page asks for the pod's
   * consent instead of saying the send failed.
   */
  consentMissing: boolean;
  /** The consent was given: the message the route refused is sent again. */
  consented(): void;
  /** Reads the conversation back once more: the slow phase's one fetch (dl-uukj.47.29). */
  refetch(): void;
  /**
   * The "Następne" queue (dl-uukj.47.34, queue.ts): what the parent sent while a turn ran, waiting
   * in the tab. It goes out in order once the turn ends, one turn each.
   */
  next: readonly string[];
  /** "Wyślij teraz": one waiting row goes into the running turn now, as a steer. */
  sendNow(index: number): void;
  /** Takes one waiting row out (to remove it, or back to the composer), answering its words. */
  takeNext(index: number): string | null;
  /** "Spróbuj ponownie" after a failed send: the exact words that failed, sent the same way. */
  resend(): void;
  /**
   * "Spróbuj ponownie" on a stalled turn (dl-uukj.47.29): a failed restore reads the conversation
   * back again; an open turn is cancelled first, so no 2 runs race, and then its words go again.
   */
  retry(): void;
}

/** The words that opened a turn, or null when it holds none. */
function openingWords(turn: ReturnType<typeof turnsOf>[number] | undefined): string | null {
  for (const item of turn?.view.chat ?? [])
    if (item.kind === "message" && item.from === "parent") return item.text;
  return null;
}

export function useConversation(
  transport: EngineTransport,
  conversation: ConversationId,
  /**
   * The signed-in account, whose "Następne" queue alone the page reads (queue.ts): false while it
   * is not known yet, null where there is no sign-in (the dev pages).
   */
  owner: string | null | false = null,
): Conversation {
  const [state, dispatch] = useReducer(conversationReducer, {
    ...EMPTY,
    connection: "restoring",
  });
  const latest = useRef(state);
  latest.current = state;
  const subscribed = useRef(new Map<RunId, () => void>());
  const queue = useNextQueue(conversation, owner === false ? undefined : owner);
  /** The last send that failed, so "Spróbuj ponownie" sends those exact words again. */
  const failed = useRef<{ kind: "message" | "steer"; text: string; queued: boolean } | null>(null);
  /** A retry's words, waiting for the turn it cancelled to end (dl-uukj.47.29). */
  const afterEnd = useRef<{ run: RunId; text: string } | null>(null);
  /** The words a route refused for want of consent, sent again once it is given. */
  const [refused, setRefused] = useState<{ text: string; context?: MessageContext } | null>(null);

  /** Subscribe first, then fetch after the cursor: what lands between is buffered and merged. */
  const follow = useCallback(
    (run: Run) => {
      dispatch({ type: "run", run, at: Date.now() });
      if (!subscribed.current.has(run.id))
        subscribed.current.set(
          run.id,
          transport.subscribe(run.id, (events) =>
            dispatch({ type: "live", run_id: run.id, events, at: Date.now() }),
          ),
        );
      const known = latest.current.runs.find((r) => r.run.id === run.id);
      return transport
        .events(run.id, cursorOf(known?.events ?? []))
        .then((events) => dispatch({ type: "fetched", run_id: run.id, events, at: Date.now() }));
    },
    [transport],
  );

  const restore = useCallback(async () => {
    dispatch({ type: "restoring" });
    try {
      const runs = await transport.runs(conversation);
      await Promise.all(runs.map(follow));
      dispatch({ type: "restored" });
    } catch (e) {
      // The page keeps what it drew and says the restore stalled, with a retry; the socket's
      // next connect tries again too (dl-uukj.47.15). A conversation the routes refuse is not
      // there for this parent at all (dl-uukj.47.33).
      dispatch({ type: "restore_failed", notFound: refusedConversation(e) });
    }
  }, [transport, conversation, follow]);

  useEffect(() => {
    const subs = subscribed.current;
    void restore();
    const off = transport.onConnection((link) => {
      if (link === "up") void restore();
      else if (link === "down") dispatch({ type: "disconnected" });
      else dispatch({ type: "link_error" });
    });
    return () => {
      off();
      for (const unsubscribe of subs.values()) unsubscribe();
      subs.clear();
    };
  }, [transport, restore]);

  /**
   * The words as a message, echoed until their event lands. Answers whether the server took them;
   * a failure is kept, with whether the words came from the queue, for "Spróbuj ponownie".
   */
  const post = useCallback(
    (text: string, context?: MessageContext, queued = false): Promise<boolean> => {
      const event_id = newEventId();
      dispatch({ type: "pending", pending: { text, event_id, at: Date.now() } });
      return transport
        .send({
          conversation_id: conversation,
          event_id,
          kind: "message",
          text,
          ...(context === undefined ? {} : { context }),
        })
        .then((run) => {
          failed.current = null;
          dispatch({ type: "send_failed", failed: false });
          dispatch({ type: "sent", event_id, run_id: run.id });
          void follow(run);
          return true;
        })
        .catch((e: unknown) => {
          if (consentMissing(e)) {
            // Not sent: the consent screen asks first, and the words go again once it is given.
            dispatch({ type: "unsent", event_id });
            setRefused(context === undefined ? { text } : { text, context });
          } else {
            failed.current = { kind: "message", text, queued };
            dispatch({ type: "send_failed", failed: true, limit: limitOf(e) });
          }
          return false;
        });
    },
    [transport, conversation, follow],
  );

  const send = useCallback(
    (text: string, context?: MessageContext) => {
      const last = turnsOf(latest.current).at(-1);
      // Mid-turn words wait under "Następne" in the tab, not in the running turn's inbox (once the
      // account they belong to is known; before that they go as they did).
      const busy = (last !== undefined && isOpen(last)) || latest.current.pending !== null;
      if (busy && queue.ready) {
        queue.add(text);
        return;
      }
      void post(text, context);
    },
    [post, queue.ready, queue.add],
  );

  /**
   * "Wyślij teraz": the row goes into the running turn as a chat steer, or as a turn when none
   * runs. The row leaves the queue only once the server took the words; a failure keeps it.
   */
  const sendNow = useCallback(
    (index: number) => {
      const text = queue.items[index];
      if (text === undefined) return;
      const last = turnsOf(latest.current).at(-1);
      if (last === undefined || !isOpen(last)) {
        void post(text, undefined, true).then((ok) => ok && queue.remove(text));
        return;
      }
      transport
        .send({
          conversation_id: conversation,
          event_id: newEventId(),
          kind: "steer",
          source: "chat",
          text,
        })
        .then((run) => {
          failed.current = null;
          queue.remove(text);
          dispatch({ type: "send_failed", failed: false });
          return follow(run);
        })
        .catch(() => {
          failed.current = { kind: "steer", text, queued: true };
          dispatch({ type: "send_failed", failed: true });
        });
    },
    [queue.items, queue.remove, post, transport, conversation, follow],
  );

  /** "Spróbuj ponownie" after a failed send: those exact words, the way they went the first time. */
  const resend = useCallback(() => {
    const last = failed.current;
    if (last === null) return;
    if (last.queued) {
      const index = queue.items.indexOf(last.text);
      if (index >= 0) sendNow(index);
      return;
    }
    void post(last.text);
  }, [queue.items, sendNow, post]);

  // Once no turn runs, the waiting rows go out in order, one turn each; never after a failed send
  // (it waits for "Spróbuj ponownie"), a failed restore or a lesson that is not there.
  useEffect(() => {
    if (queue.items.length === 0 || state.connection === "restoring" || state.pending !== null)
      return;
    if (state.sendFailed || state.restoreFailed || state.notFound) return;
    const last = turnsOf(state).at(-1);
    if (last !== undefined && isOpen(last)) return;
    const text = queue.items[0];
    if (text === undefined) return;
    void post(text, undefined, true).then((ok) => ok && queue.remove(text));
  }, [state, queue.items, queue.remove, post]);

  const consented = useCallback(() => {
    const words = refused;
    setRefused(null);
    if (words !== null) send(words.text, words.context);
  }, [refused, send]);

  const stop = useCallback(() => {
    dispatch({ type: "stop" });
    transport
      .send({ conversation_id: conversation, event_id: newEventId(), kind: "cancel" })
      .catch(() => dispatch({ type: "send_failed", failed: true }));
  }, [transport, conversation]);

  const retry = useCallback(() => {
    const now = latest.current;
    if (now.restoreFailed || now.connection === "error") {
      void restore();
      return;
    }
    const last = turnsOf(now).at(-1);
    const text = now.pending?.text ?? openingWords(last);
    if (last === undefined || !isOpen(last)) {
      if (text !== null) send(text);
      return;
    }
    // A cancel only asks the turn to end (cancel_requested_at): words sent now would join the
    // same turn's inbox and end with it. So they wait until the turn has ended, then open a new one.
    if (text !== null) afterEnd.current = { run: last.run.id, text };
    transport
      .send({ conversation_id: conversation, event_id: newEventId(), kind: "cancel" })
      .then((run) => follow(run))
      .catch(() => {
        afterEnd.current = null;
        dispatch({ type: "send_failed", failed: true });
      });
  }, [transport, conversation, follow, restore, send]);

  // The retried words go out once the cancelled turn has ended, as a turn of their own.
  useEffect(() => {
    const waiting = afterEnd.current;
    if (waiting === null) return;
    const turn = turnsOf(state).find((t) => t.run.id === waiting.run);
    if (turn === undefined || isOpen(turn)) return;
    afterEnd.current = null;
    send(waiting.text);
  }, [state, send]);

  const edit = useCallback(
    (text: string, question_ids: string[], change?: LessonChange): EventId | null => {
      const last = turnsOf(latest.current).at(-1);
      if (last === undefined || (change === undefined && !isOpen(last))) {
        send(text);
        return null;
      }
      const event_id = newEventId();
      transport
        .send({
          conversation_id: conversation,
          event_id,
          kind: "steer",
          text,
          source: "lesson_edit",
          question_ids,
          ...(change === undefined
            ? {}
            : { patch: change.patch, base_revision: change.base_revision }),
        })
        .then((run) => {
          dispatch({ type: "send_failed", failed: false });
          return follow(run);
        })
        .catch(() => {
          dispatch({ type: "send_failed", failed: true });
          dispatch({ type: "steer_failed", event_id });
        });
      return event_id;
    },
    [transport, conversation, follow, send],
  );

  const refetch = useCallback(() => void restore(), [restore]);

  return {
    state,
    send,
    stop,
    edit,
    consentMissing: refused !== null,
    consented,
    refetch,
    retry,
    next: queue.items,
    sendNow,
    takeNext: queue.take,
    resend,
  };
}
