/**
 * A conversation as the chat page holds it (dl-z5ja.17): its runs, one per turn, each with the log
 * it has folded so far. The order is PostHog's (`docs/research/posthog-ai-runtime.md` section 3):
 * subscribe to `run:<id>` first and buffer what arrives, fetch the log after the cursor, then
 * merge the two with `mergeLive`, so a reload or a reconnect draws without a gap or a duplicate.
 * After the fetch, a live push merges straight in. Pure, so the tests drive it without a server.
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

/** A follow-up the parent sent while a turn was open: shown until its message is in the log. */
interface Queued {
  text: string;
  /** How many parent messages with this text the log held when it was sent. */
  seen: number;
}

export interface ConversationState {
  runs: RunState[];
  queued: Queued[];
  /** `restoring` from a reload or a dropped connection until every run is fetched again. */
  connection: "live" | "restoring";
  /** Stop was pressed; cleared when the turn ends. */
  stopping: boolean;
  /** The last send did not reach the server. */
  sendFailed: boolean;
}

export type ConversationAction =
  | { type: "run"; run: Run }
  | { type: "live"; run_id: RunId; events: readonly RunEvent[] }
  | { type: "fetched"; run_id: RunId; events: readonly RunEvent[] }
  | { type: "disconnected" }
  | { type: "restoring" }
  | { type: "restored" }
  | { type: "queued"; text: string }
  | { type: "stop" }
  | { type: "send_failed"; failed: boolean };

export const EMPTY: ConversationState = {
  runs: [],
  queued: [],
  connection: "live",
  stopping: false,
  sendFailed: false,
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

function withRun(
  state: ConversationState,
  run_id: RunId,
  change: (r: RunState) => RunState,
): ConversationState {
  const runs = state.runs.map((r) => (r.run.id === run_id ? change(r) : r));
  const next = { ...state, runs };
  return { ...next, queued: stillQueued(next), stopping: next.stopping && turnOpen(next) };
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
      return { ...state, runs: [...state.runs, added] };
    }
    case "live":
      return withRun(state, action.run_id, (r) =>
        r.fetched
          ? { ...r, events: [...r.events, ...mergeLive(action.events, [], cursorOf(r.events))] }
          : { ...r, buffer: [...r.buffer, ...action.events] },
      );
    case "fetched":
      return withRun(state, action.run_id, (r) => ({
        ...r,
        events: [...r.events, ...mergeLive(r.buffer, action.events, cursorOf(r.events))],
        buffer: [],
        fetched: true,
      }));
    case "disconnected":
      return {
        ...state,
        connection: "restoring",
        runs: state.runs.map((r) => ({ ...r, fetched: false })),
      };
    case "restoring":
      return { ...state, connection: "restoring" };
    case "restored":
      return { ...state, connection: "live" };
    case "queued": {
      const seen = parentTexts(state).filter((t) => t === action.text).length;
      return { ...state, queued: [...state.queued, { text: action.text, seen }] };
    }
    case "stop":
      return { ...state, stopping: turnOpen(state) };
    case "send_failed":
      return { ...state, sendFailed: action.failed };
  }
}

const ENDED: readonly RunStatus[] = ["completed", "failed", "cancelled"];

/** One turn drawn: its run and the fold of its log. */
export interface Turn {
  run: Run;
  view: RunView;
}

export const turnsOf = (state: ConversationState): Turn[] =>
  state.runs.map((r) => ({ run: r.run, view: foldRun(r.events) }));

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
