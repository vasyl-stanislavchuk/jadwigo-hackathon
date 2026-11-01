/**
 * The chat page on the conversation routes and the Realtime run channel (dl-z5ja.65, the page's
 * half of dl-z5ja.21). The log comes over `/api/v1` through `@jadwigo/api-client`; a broadcast on
 * `run:<run id>` carries only `{run_id, seq, event_id}` (dl-z5ja.59), so it is a poke: the
 * transport fetches the run's events after its cursor and hands them to the page, where
 * `mergeLive` and `foldRun` do what they did on the dev server. `hotTransport` stays for `make dev`.
 */

import type { ConversationClient } from "@jadwigo/api-client";
import type { EventId } from "@jadwigo/contracts";
import { ConversationId, type RunEvent, type RunId } from "@jadwigo/contracts/run";
import { newEventId } from "./ids.ts";
import type { EngineTransport } from "./useConversation.ts";
import { runChannel } from "./wire.ts";

/** The live side: a poke per broadcast on a topic, and the connection going down and back. */
export interface RunLive {
  subscribe(topic: string, onPoke: () => void): () => void;
  onConnection(on: (up: boolean) => void): () => void;
}

/** Where the page keeps which server conversation its own conversation id maps to. */
type Held = Pick<Storage, "getItem" | "setItem">;

const SERVER_KEY = (local: string) => `jadwigo.playground.chat.server.${local}`;
const CREATE_KEY = (local: string) => `jadwigo.playground.chat.create.${local}`;

/**
 * Opens a server conversation from the list (dl-z5ja.106) as the page's own: its id stands for
 * itself, so the transport reads its runs and posts to it without making a new one.
 */
export function holdServer(id: ConversationId, held: Held = window.sessionStorage): void {
  held.setItem(SERVER_KEY(id), id);
}

export function routesTransport(
  api: ConversationClient,
  live: RunLive,
  held: Held = window.sessionStorage,
): EngineTransport {
  /** The server's conversation for the page's, made on the first send, once by `event_id`. */
  const creating = new Map<string, Promise<ConversationId>>();
  const serverOf = (local: ConversationId): ConversationId | null => {
    const parsed = ConversationId.safeParse(held.getItem(SERVER_KEY(local)));
    return parsed.success ? parsed.data : null;
  };
  const ensure = (local: ConversationId): Promise<ConversationId> => {
    const known = serverOf(local);
    if (known !== null) return Promise.resolve(known);
    let pending = creating.get(local);
    if (pending === undefined) {
      // The same event_id on a retry, so a create that landed but did not answer is not made twice.
      const event_id = (held.getItem(CREATE_KEY(local)) as EventId | null) ?? newEventId();
      held.setItem(CREATE_KEY(local), event_id);
      pending = api.createConversation({ event_id }).then((c) => {
        held.setItem(SERVER_KEY(local), c.id);
        return c.id;
      });
      pending.catch(() => creating.delete(local));
      creating.set(local, pending);
    }
    return pending;
  };

  /** The highest `seq` this transport handed the page, per run: where a poke fetches after. */
  const cursors = new Map<RunId, number>();
  const seen = (run: RunId, events: RunEvent[]): RunEvent[] => {
    const top = events.reduce((max, e) => Math.max(max, e.seq), cursors.get(run) ?? 0);
    cursors.set(run, top);
    return events;
  };
  const fetchAfter = async (run: RunId, after: number) =>
    seen(run, (await api.listRunEvents(run, after)).events);

  return {
    subscribe(run, onEvents) {
      // One fetch at a time per run; pokes that land meanwhile are one more fetch after it.
      let busy = false;
      let again = false;
      let closed = false;
      const pull = async (): Promise<void> => {
        if (busy) {
          again = true;
          return;
        }
        busy = true;
        try {
          do {
            again = false;
            const events = await fetchAfter(run, cursors.get(run) ?? 0);
            if (!closed && events.length > 0) onEvents(events);
          } while (again && !closed);
        } catch {
          // The next poke, or the reconnect's fetch after the cursor, picks it up.
        } finally {
          busy = false;
        }
      };
      const off = live.subscribe(runChannel(run), () => void pull());
      return () => {
        closed = true;
        off();
      };
    },
    onConnection: (on) => live.onConnection(on),
    async runs(local) {
      const server = serverOf(local);
      if (server === null) return [];
      return (await api.listConversationRuns(server)).runs;
    },
    events: (run, after) => fetchAfter(run, after),
    async send(body) {
      if (body.kind === "cancel") {
        const server = serverOf(body.conversation_id);
        const last =
          server === null ? undefined : (await api.listConversationRuns(server)).runs.at(-1);
        if (last === undefined) throw new Error("no run to stop");
        return (await api.cancelRun(last.id, { event_id: body.event_id })).run;
      }
      const server = await ensure(body.conversation_id);
      // A lesson-pane edit or Cofnij goes as a steer naming its questions (dl-z5ja.93).
      const message =
        body.kind === "steer"
          ? {
              event_id: body.event_id,
              text: body.text,
              kind: "steer" as const,
              source: body.source,
              question_ids: body.question_ids,
            }
          : { event_id: body.event_id, text: body.text };
      return (await api.postMessage(server, message)).run;
    },
  };
}
