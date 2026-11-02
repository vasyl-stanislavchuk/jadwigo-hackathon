/**
 * A conversation as the chat page holds it (dl-z5ja.17): its runs, one per turn, each with the log
 * it has folded so far. The order is PostHog's (`docs/research/posthog-ai-runtime.md` section 3):
 * subscribe to `run:<id>` first and buffer what arrives, fetch the log after the cursor, then
 * merge the two with `mergeLive`, so a reload or a reconnect draws without a gap or a duplicate.
 * After the fetch, a live push merges straight in. Pure, so the tests drive it without a server.
 *
 * It also keeps what the run's honest state needs (dl-uukj.47.29, src/chat/phase.ts): the words
 * just sent, echoed until their own event is in the log; when anything last arrived; and the live
 * channel's state, with a restore that failed said as such rather than "restoring" forever. Times
 * come in on the actions, so the reducer stays pure.
 */

import type { Run, RunEvent, RunId, RunStatus } from "@jadwigo/contracts/run";
import { foldRun, mergeLive, type RunView } from "@jadwigo/core";

interface RunState {
  run: Run;
  /** What the page has merged, in `seq` order. */
  events: RunEvent[];
  /** Live pushes that arrived before this run's fetch landed. */
  buffer: RunEvent[];
  /** False until the fetch after the cursor lands; a reconnect sets it false again. */
  fetched: boolean;
}

/**
 * What the parent just sent, echoed at once until its message event is in the log: by its
 * `event_id`, or by its words once the log holds them more often than when they were sent.
 */
interface Pending {
  text: string;
  event_id: string;
  /** When it was sent, by the page's clock. */
  at: number;
  /** How many parent messages with these words the log held when they were sent (the reducer's). */
  seen?: number;
  /** The run the send landed on, once the server answered. */
  run?: RunId;
}

/** A follow-up the parent sent while a turn was open: shown until its message is in the log. */
interface Queued {
  text: string;
  /** How many parent messages with this text the log held when it was sent. */
  seen: number;
}

export interface ConversationState {
  runs: RunState[];
  queued: Queued[];
  /**
   * `restoring` from a reload or a reconnect until every run is fetched again; `down` while the
   * live channel is dropped; `error` when it refused the page or a restore failed.
   */
  connection: "live" | "restoring" | "down" | "error";
  /** The last restore did not reach the server: said as stalled, with a retry, never as restoring. */
  restoreFailed: boolean;
  /**
   * The routes refused the conversation itself (a 404 or a 403: another family's, or gone), so the
   * page says there is no such lesson instead of a workspace stuck restoring (dl-uukj.47.33).
   */
  notFound: boolean;
  /** The words just sent, until their event is in the log or the send failed. */
  pending: Pending | null;
  /** When the page last heard anything of the conversation (an event, a run): the stall clock. */
  lastEventAt: number | null;
  /** When the open turn began for this page: its send, or its first sight on a restore. */
  openedAt: number | null;
  /** Stop was pressed; cleared when the turn ends. */
  stopping: boolean;
  /** The last send did not reach the server. */
  sendFailed: boolean;
  /**
   * Which message limit refused the last send, by the error's type (dl-z5ja.62, .96, .100): the
   * per-minute one or the day's. Either way there is no retry.
   */
  sendLimit: SendLimit | null;
  /**
   * The edit steers whose send was refused or never reached the server, by `event_id`: no log will
   * hold them, so what waits on one (Cofnij) stops waiting (dl-z5ja.111).
   */
  failedSteers: readonly string[];
}

/** The two message limits a send can hit: `MessageLimitMinute` and `MessageLimitDay`. */
export type SendLimit = "minute" | "day";

export type ConversationAction =
  // `at`: when the page heard it, by its clock; the stall clock (phase.ts) reads it.
  | { type: "run"; run: Run; at?: number }
  | { type: "live"; run_id: RunId; events: readonly RunEvent[]; at?: number }
  | { type: "fetched"; run_id: RunId; events: readonly RunEvent[]; at?: number }
  | { type: "disconnected" }
  | { type: "link_error" }
  | { type: "restoring" }
  | { type: "restored" }
  | { type: "restore_failed"; notFound?: boolean }
  | { type: "pending"; pending: Pending }
  | { type: "sent"; event_id: string; run_id: RunId }
  | { type: "queued"; text: string }
  | { type: "stop" }
  | { type: "send_failed"; failed: boolean; limit?: SendLimit | null }
  | { type: "steer_failed"; event_id: string };

export const EMPTY: ConversationState = {
  runs: [],
  queued: [],
  connection: "live",
  restoreFailed: false,
  notFound: false,
  pending: null,
  lastEventAt: null,
  openedAt: null,
  stopping: false,
  sendFailed: false,
  sendLimit: null,
  failedSteers: [],
};

/** The highest `seq` merged: where the next fetch starts. */
export const cursorOf = (events: readonly RunEvent[]): number =>
  events.reduce((max, e) => Math.max(max, e.seq), 0);

const parentTexts = (state: ConversationState): string[] =>
  state.runs.flatMap((r) =>
    r.events.flatMap((e) =>
      e.type === "message" && e.payload.from === "parent" ? [e.payload.text] : [],
    ),
  );

/** The queued follow-ups whose message has not reached the log yet. */
function stillQueued(state: ConversationState): Queued[] {
  const texts = parentTexts(state);
  return state.queued.filter((q) => texts.filter((t) => t === q.text).length <= q.seen);
}

/** The echo, until its own message event is in the log. */
function stillPending(state: ConversationState): Pending | null {
  const { pending } = state;
  if (pending === null) return null;
  const logged = state.runs.some((r) => r.events.some((e) => e.event_id === pending.event_id));
  const said = parentTexts(state).filter((t) => t === pending.text).length > (pending.seen ?? 0);
  // A turn that ended holds its words or never will: the echo goes either way.
  const landed = state.runs.find((r) => r.run.id === pending.run);
  const ended =
    landed !== undefined &&
    (ENDED.includes(landed.run.status) || landed.events.some((e) => e.type === "turn_complete"));
  return logged || said || ended ? null : pending;
}

function withRun(
  state: ConversationState,
  run_id: RunId,
  change: (r: RunState) => RunState,
  at?: number,
): ConversationState {
  let grew = false;
  const runs = state.runs.map((r) => {
    if (r.run.id !== run_id) return r;
    const changed = change(r);
    grew = changed.events.length + changed.buffer.length > r.events.length + r.buffer.length;
    return changed;
  });
  const next = {
    ...state,
    runs,
    ...(grew && at !== undefined ? { lastEventAt: at } : {}),
  };
  return {
    ...next,
    queued: stillQueued(next),
    pending: stillPending(next),
    stopping: next.stopping && turnOpen(next),
  };
}

export function conversationReducer(
  state: ConversationState,
  action: ConversationAction,
): ConversationState {
  switch (action.type) {
    case "run": {
      const known = state.runs.some((r) => r.run.id === action.run.id);
      if (known) return withRun(state, action.run.id, (r) => ({ ...r, run: action.run }));
      const added: RunState = { run: action.run, events: [], buffer: [], fetched: false };
      // A turn first seen here (a send's answer, a restore) starts the stall clock, unless the
      // words that opened it already did.
      return {
        ...state,
        runs: [...state.runs, added],
        lastEventAt:
          action.at === undefined ? state.lastEventAt : Math.max(state.lastEventAt ?? 0, action.at),
        openedAt: state.pending?.at ?? action.at ?? state.openedAt,
      };
    }
    case "live":
      return withRun(
        state,
        action.run_id,
        (r) =>
          r.fetched
            ? { ...r, events: [...r.events, ...mergeLive(action.events, [], cursorOf(r.events))] }
            : { ...r, buffer: [...r.buffer, ...action.events] },
        action.at,
      );
    case "fetched":
      return withRun(
        state,
        action.run_id,
        (r) => ({
          ...r,
          events: [...r.events, ...mergeLive(r.buffer, action.events, cursorOf(r.events))],
          buffer: [],
          fetched: true,
        }),
        action.at,
      );
    case "disconnected":
      return {
        ...state,
        connection: "down",
        runs: state.runs.map((r) => ({ ...r, fetched: false })),
      };
    case "link_error":
      return { ...state, connection: "error" };
    case "restoring":
      return { ...state, connection: "restoring", restoreFailed: false };
    case "restored":
      return { ...state, connection: "live", restoreFailed: false };
    case "restore_failed":
      return {
        ...state,
        connection: "error",
        restoreFailed: true,
        notFound: action.notFound ?? false,
      };
    case "pending":
      return {
        ...state,
        pending: {
          ...action.pending,
          seen: parentTexts(state).filter((t) => t === action.pending.text).length,
        },
        lastEventAt: action.pending.at,
        openedAt: action.pending.at,
      };
    case "queued": {
      const seen = parentTexts(state).filter((t) => t === action.text).length;
      return { ...state, queued: [...state.queued, { text: action.text, seen }] };
    }
    case "stop":
      return { ...state, stopping: turnOpen(state) };
    case "sent": {
      if (state.pending?.event_id !== action.event_id) return state;
      const next = { ...state, pending: { ...state.pending, run: action.run_id } };
      return { ...next, pending: stillPending(next) };
    }
    case "send_failed":
      // A send that failed takes its echo away: the failure row offers it again.
      return {
        ...state,
        sendFailed: action.failed,
        sendLimit: action.limit ?? null,
        ...(action.failed ? { pending: null } : {}),
      };
    case "steer_failed":
      return { ...state, failedSteers: [...state.failedSteers, action.event_id] };
  }
}

const ENDED: readonly RunStatus[] = ["completed", "failed", "cancelled"];

/** One turn drawn: its run and the fold of its log. */
export interface Turn {
  run: Run;
  view: RunView;
  /**
   * What wrote the turn's latest lesson revision: its `call_id`, the AI's tool call or the parent's
   * patch steer (dl-z5ja.111); null before a revision. Absent where a test builds the turn by hand.
   */
  writer?: string | null;
}

/** The `call_id` of the highest `lesson_revision` in a run's log, or null before one. */
function writerOf(events: readonly RunEvent[]): string | null {
  let latest: { revision: number; call_id: string } | null = null;
  for (const e of events)
    if (e.type === "lesson_revision" && (latest === null || e.payload.revision > latest.revision))
      latest = { revision: e.payload.revision, call_id: e.payload.call_id };
  return latest?.call_id ?? null;
}

export const turnsOf = (state: ConversationState): Turn[] =>
  state.runs.map((r) => ({ run: r.run, view: foldRun(r.events), writer: writerOf(r.events) }));

/** A turn is open from its run's creation until `turn_complete`, or its row says it ended. */
export function isOpen(turn: Turn): boolean {
  if (turn.view.cursor === 0) return !ENDED.includes(turn.run.status);
  return turn.view.turn_open;
}

function turnOpen(state: ConversationState): boolean {
  const last = turnsOf(state).at(-1);
  return last !== undefined && isOpen(last);
}

/** The lesson the right pane draws: the latest turn's highest revision that has one. */
export function lessonOf(turns: readonly Turn[]): RunView["lesson"] {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const lesson = turns[i]?.view.lesson;
    if (lesson) return lesson;
  }
  return null;
}
