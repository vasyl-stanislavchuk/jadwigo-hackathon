/**
 * The chat page's live side (dl-z5ja.17): for each run, subscribe to `run:<id>` first, then fetch
 * its log after the cursor, and let `conversationReducer` merge the two. A dropped connection
 * shows Restoring and fetches every run again after its cursor once the socket is back. The
 * transport is the dev server's (`hotTransport`) and a test's stand-in, the same interface.
 */

import { ApiError } from "@jadwigo/api-client";
import { ErrorType } from "@jadwigo/contracts";
import type { ConversationId, Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  type ConversationState,
  conversationReducer,
  cursorOf,
  EMPTY,
  isOpen,
  turnsOf,
} from "./conversation.ts";
import { newEventId } from "./ids.ts";
import {
  type EventsAnswer,
  eventsPath,
  type LivePush,
  MESSAGES_PATH,
  type RunsAnswer,
  runChannel,
  runsPath,
  type SendAnswer,
  type SendBody,
} from "./wire.ts";

/** Whether a send was refused by the message limit, read by the error's type, never its text. */
const limited = (e: unknown): boolean =>
  e instanceof ApiError && e.type === ErrorType.enum.MessageLimit;

export interface EngineTransport {
  /** Live pushes for one run; answers the unsubscribe. */
  subscribe(run: RunId, onEvents: (events: readonly RunEvent[]) => void): () => void;
  /** The socket going down (false) and coming back (true); answers the unsubscribe. */
  onConnection(on: (up: boolean) => void): () => void;
  runs(conversation: ConversationId): Promise<Run[]>;
  events(run: RunId, after: number): Promise<RunEvent[]>;
  send(body: SendBody): Promise<Run>;
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

/** The dev server's transport: HMR custom events for the live channel, fetch for the log. Null
 * outside `vite` serve, where the engine plugin does not run. */
export function hotTransport(): EngineTransport | null {
  const hot = import.meta.hot;
  if (hot === undefined) return null;
  return {
    subscribe(run, onEvents) {
      const on = (push: LivePush) => onEvents(push.events);
      hot.on(runChannel(run), on);
      return () => hot.off(runChannel(run), on);
    },
    onConnection(on) {
      const down = () => on(false);
      const up = () => on(true);
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
          await fetch(MESSAGES_PATH, {
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
  send(text: string): void;
  stop(): void;
}

export function useConversation(
  transport: EngineTransport,
  conversation: ConversationId,
): Conversation {
  const [state, dispatch] = useReducer(conversationReducer, {
    ...EMPTY,
    connection: "restoring",
  });
  const latest = useRef(state);
  latest.current = state;
  const subscribed = useRef(new Map<RunId, () => void>());

  /** Subscribe first, then fetch after the cursor: what lands between is buffered and merged. */
  const follow = useCallback(
    (run: Run) => {
      dispatch({ type: "run", run });
      if (!subscribed.current.has(run.id))
        subscribed.current.set(
          run.id,
          transport.subscribe(run.id, (events) =>
            dispatch({ type: "live", run_id: run.id, events }),
          ),
        );
      const known = latest.current.runs.find((r) => r.run.id === run.id);
      return transport
        .events(run.id, cursorOf(known?.events ?? []))
        .then((events) => dispatch({ type: "fetched", run_id: run.id, events }));
    },
    [transport],
  );

  const restore = useCallback(async () => {
    dispatch({ type: "restoring" });
    try {
      const runs = await transport.runs(conversation);
      await Promise.all(runs.map(follow));
      dispatch({ type: "restored" });
    } catch {
      // The socket's next connect tries again; the page keeps what it drew.
    }
  }, [transport, conversation, follow]);

  useEffect(() => {
    const subs = subscribed.current;
    void restore();
    const off = transport.onConnection((up) => {
      if (up) void restore();
      else dispatch({ type: "disconnected" });
    });
    return () => {
      off();
      for (const unsubscribe of subs.values()) unsubscribe();
      subs.clear();
    };
  }, [transport, restore]);

  const send = useCallback(
    (text: string) => {
      const last = turnsOf(latest.current).at(-1);
      if (last !== undefined && isOpen(last)) dispatch({ type: "queued", text });
      transport
        .send({ conversation_id: conversation, event_id: newEventId(), kind: "message", text })
        .then((run) => {
          dispatch({ type: "send_failed", failed: false });
          return follow(run);
        })
        .catch((e: unknown) =>
          dispatch({ type: "send_failed", failed: true, limited: limited(e) }),
        );
    },
    [transport, conversation, follow],
  );

  const stop = useCallback(() => {
    dispatch({ type: "stop" });
    transport
      .send({ conversation_id: conversation, event_id: newEventId(), kind: "cancel" })
      .catch(() => dispatch({ type: "send_failed", failed: true }));
  }, [transport, conversation]);

  return { state, send, stop };
}
