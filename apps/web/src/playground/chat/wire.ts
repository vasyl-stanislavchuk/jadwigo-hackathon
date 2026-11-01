/**
 * The chat page's dev wire (dl-z5ja.17): what `/playground/chat` and `dev/engine-plugin.ts` say to
 * each other while `vite` serves. Wave 2 swaps it for the `/api/v1/conversations` routes and the
 * Realtime channel (dl-z5ja.21); the shapes here are what those carry.
 *
 *   POST /__engine/messages                          a message or a cancel → {run}
 *   GET  /__engine/conversations/<id>/runs           the conversation's runs, oldest first → {runs}
 *   GET  /__engine/runs/<id>/events?after=<seq>      the run's events after a cursor → {events}
 *   HMR  run:<id>                                    the events a run just appended → {events}
 */

// Types only, so dev/engine-plugin.ts, which Vite loads with Node's type stripping, can import it.
import type { EventId } from "@jadwigo/contracts";
import type { ConversationId, Run, RunEvent, RunId } from "@jadwigo/contracts/run";

export const ENGINE_BASE = "/__engine";
export const MESSAGES_PATH = `${ENGINE_BASE}/messages`;
export const runsPath = (conversation: string): string =>
  `${ENGINE_BASE}/conversations/${encodeURIComponent(conversation)}/runs`;
export const eventsPath = (run: string, after: number): string =>
  `${ENGINE_BASE}/runs/${encodeURIComponent(run)}/events?after=${after}`;

/** The live channel's name for one run, as the Realtime broadcast in wave 2 names it. */
export const runChannel = (run: string): string => `run:${run}`;

/**
 * What the page sends: the parent's words, Stop, or a parent's edit in the lesson pane as a steer
 * naming the questions it changed (dl-z5ja.30). `event_id` makes a resend land once.
 */
export type SendBody =
  | { conversation_id: ConversationId; event_id: EventId; kind: "message"; text: string }
  | { conversation_id: ConversationId; event_id: EventId; kind: "cancel" }
  | {
      conversation_id: ConversationId;
      event_id: EventId;
      kind: "steer";
      text: string;
      source: "lesson_edit";
      question_ids: string[];
    };

export interface SendAnswer {
  run: Run;
}
export interface RunsAnswer {
  runs: Run[];
}
export interface EventsAnswer {
  events: RunEvent[];
}
/** One push on `run:<id>`. */
export interface LivePush {
  run_id: RunId;
  events: RunEvent[];
}
