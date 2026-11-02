/**
 * The chat page's dev wire (dl-z5ja.17): what the dev chat page and `dev/engine-plugin.ts` say to
 * each other while `vite` serves. Wave 2 swaps it for the `/api/v1/conversations` routes and the
 * Realtime channel (dl-z5ja.21); the shapes here are what those carry.
 *
 *   POST /__engine/messages[?pace=slow|stall|fail]   a message or a cancel → {run}
 *   GET  /__engine/conversations/<id>/runs           the conversation's runs, oldest first → {runs}
 *   GET  /__engine/runs/<id>/events?after=<seq>      the run's events after a cursor → {events}
 *   HMR  run:<id>                                    the events a run just appended → {events}
 */

// Types only, so dev/engine-plugin.ts, which Vite loads with Node's type stripping, can import it.
import type { EventId } from "@jadwigo/contracts";
import type {
  ConversationId,
  LessonPatch,
  MessageContext,
  Run,
  RunEvent,
  RunId,
} from "@jadwigo/contracts/run";

export const ENGINE_BASE = "/__engine";
const MESSAGES_PATH = `${ENGINE_BASE}/messages`;

/**
 * How the dev engine plays a turn, for seeing the workspace's states without a paid call
 * (dl-uukj.47.27): `slow` waits ~2 s per scripted step, `stall` writes nothing after the parent's
 * message, `fail` ends the turn failed. Dev only; the real routes have no such thing.
 */
const PACES = ["slow", "stall", "fail"] as const;
export type Pace = (typeof PACES)[number];
export const paceOf = (value: string | null | undefined): Pace | null =>
  PACES.find((p) => p === value) ?? null;
/** The send route, with a pace when there is one. */
export const messagesPath = (pace: Pace | null): string =>
  pace === null ? MESSAGES_PATH : `${MESSAGES_PATH}?pace=${pace}`;
export const runsPath = (conversation: string): string =>
  `${ENGINE_BASE}/conversations/${encodeURIComponent(conversation)}/runs`;
export const eventsPath = (run: string, after: number): string =>
  `${ENGINE_BASE}/runs/${encodeURIComponent(run)}/events?after=${after}`;

/** The live channel's name for one run, as the Realtime broadcast in wave 2 names it. */
export const runChannel = (run: string): string => `run:${run}`;

/**
 * What the page sends: the parent's words, Stop, or a parent's edit in the lesson pane as a steer
 * naming the questions it changed (dl-z5ja.30). A steer's `patch` is the parent's own change, which
 * the runner applies with no model call (dl-z5ja.111). `event_id` makes a resend land once.
 */
export type SendBody =
  | {
      conversation_id: ConversationId;
      event_id: EventId;
      kind: "message";
      text: string;
      /** The page the message was sent from (dl-z5ja.107): the child the lesson is for (dl-uukj.47.12). */
      context?: MessageContext;
    }
  | { conversation_id: ConversationId; event_id: EventId; kind: "cancel" }
  | {
      conversation_id: ConversationId;
      event_id: EventId;
      kind: "steer";
      text: string;
      /** A lesson-pane edit names its questions; a chat steer ("Wyślij teraz", dl-uukj.47.34) none. */
      source: "lesson_edit" | "chat";
      question_ids?: string[];
      patch?: LessonPatch;
      /** The lesson revision the patch was made on: sent with a patch, never without. */
      base_revision?: number;
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
