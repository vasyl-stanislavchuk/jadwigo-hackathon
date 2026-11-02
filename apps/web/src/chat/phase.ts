/**
 * One honest run state (dl-uukj.47.29; wave plan dl-uukj.47-1, lead decision 3): `runPhase` is the
 * only source for the workspace's band, the folded chat strip, the lesson column's placeholder, the
 * footer's status, the live region and the chat's activity line, so they never disagree.
 *
 *   connecting      the page is (re)reading the conversation, or the channel dropped
 *   queued          the words are sent and the turn has not started
 *   thinking        the turn runs, no tool at work
 *   tool            a tool runs: its verb's own words ("Szukanie zadań")
 *   awaiting_input  the turn waits on the parent; no clock runs
 *   slow            nothing heard for 20 s: "To trwa dłużej niż zwykle" (the page fetches once)
 *   stalled         nothing heard for 60 s, the channel refused, or a restore failed: "Utknęło"
 *   done · failed · cancelled   the turn ended so
 *
 * "Utknęło" is said before "Nie udało się": failed only when the run's status says so. A late
 * event resets the quiet clock, so the phase comes back. Pure: `now` comes in, and `usePhase`
 * ticks it each second only while a turn is open.
 */

import type { RunId, VerbName } from "@jadwigo/contracts/run";
import type { CopyKey } from "@jadwigo/copy";
import { useEffect, useState } from "react";
import { type ConversationState, isOpen, type Turn } from "./conversation.ts";
import { TOOL_KEY } from "./tools.ts";

type PhaseKind =
  | "connecting"
  | "queued"
  | "thinking"
  | "tool"
  | "awaiting_input"
  | "slow"
  | "stalled"
  | "done"
  | "failed"
  | "cancelled";

export interface RunPhase {
  kind: PhaseKind;
  /** The phase in words. */
  copyKey: CopyKey;
  /** When the open turn began, for the elapsed seconds; null once it ended. */
  since: number | null;
  /** Whether a turn is open (or words are on their way). */
  open: boolean;
  /** The tool at work, while one is. */
  verb?: VerbName;
  /** The turn's run, for Copy details; null before the server named one. */
  run: RunId | null;
}

/** Nothing heard for this long: slow, and the page fetches the log once. */
export const SLOW_MS = 20_000;
/** Nothing heard for this long: stalled, with Spróbuj ponownie. */
export const STALL_MS = 60_000;

const KEY: Readonly<Record<Exclude<PhaseKind, "tool">, CopyKey>> = {
  connecting: "chat_phase_connecting",
  queued: "chat_phase_queued",
  thinking: "chat_phase_thinking",
  awaiting_input: "chat_phase_awaiting_input",
  slow: "chat_phase_slow",
  stalled: "chat_phase_stalled",
  done: "chat_phase_done",
  failed: "chat_phase_failed",
  cancelled: "chat_status_cancelled",
};

const phase = (
  kind: Exclude<PhaseKind, "tool">,
  open: boolean,
  since: number | null,
  run: RunId | null,
): RunPhase => ({ kind, copyKey: KEY[kind], open, since, run });

/** The tool at work in a turn: the latest one running or about to. */
function toolAtWork(turn: Turn | undefined): VerbName | null {
  const chat = turn?.view.chat ?? [];
  for (let i = chat.length - 1; i >= 0; i -= 1) {
    const item = chat[i];
    if (item?.kind === "tool" && (item.state === "running" || item.state === "pending"))
      return item.verb;
  }
  return null;
}

/** The last turn's state in one word, or null before any turn. */
export function runPhase(
  turns: readonly Turn[],
  state: ConversationState,
  now: number,
): RunPhase | null {
  const last = turns.at(-1);
  const run = last?.run.id ?? null;
  const open = (last !== undefined && isOpen(last)) || state.pending !== null;
  const since = open ? (state.openedAt ?? now) : null;
  if (state.restoreFailed) return phase("stalled", open, since, run);

  if (!open) {
    if (last === undefined)
      return state.connection === "restoring" ? phase("connecting", false, null, null) : null;
    const status = last.view.status ?? last.run.status;
    if (status === "failed") return phase("failed", false, null, run);
    if (status === "cancelled") return phase("cancelled", false, null, run);
    return phase("done", false, null, run);
  }

  // A refusing channel is said as stalled, never as failed: the run may still be fine.
  if (state.connection === "error") return phase("stalled", true, since, run);
  const status = last === undefined ? "queued" : (last.view.status ?? last.run.status);
  const asks = last?.view.chat.some((i) => i.kind === "approval" && i.decision === null) ?? false;
  if (status === "awaiting_input" || asks) return phase("awaiting_input", true, since, run);

  const quiet = now - (state.lastEventAt ?? now);
  if (quiet >= STALL_MS) return phase("stalled", true, since, run);
  if (quiet >= SLOW_MS) return phase("slow", true, since, run);
  if (state.connection !== "live") return phase("connecting", true, since, run);
  const verb = toolAtWork(last);
  if (verb !== null) return { kind: "tool", copyKey: TOOL_KEY[verb], open, since, verb, run };
  if (status === "queued") return phase("queued", true, since, run);
  return phase("thinking", true, since, run);
}

/** Whole seconds since the turn began, or null when none is open. */
export const elapsedSeconds = (p: RunPhase | null, now: number): number | null =>
  p?.since == null ? null : Math.max(0, Math.floor((now - p.since) / 1000));

/**
 * What the polite live region says: only when a turn ends, needs the parent or stalls, never each
 * step, so a screen reader is not read every tool line. Quiet while the page reconnects.
 */
export function phaseAnnouncement(p: RunPhase | null): CopyKey | null {
  switch (p?.kind) {
    case "done":
      return "chat_announce_done";
    case "cancelled":
      return "chat_announce_stopped";
    case "failed":
      return "chat_turn_unfinished";
    case "awaiting_input":
      return "chat_announce_needs_you";
    case "stalled":
      return "chat_phase_stalled";
    default:
      return null;
  }
}

/** The page's clock, ticked each second only while `active`. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [active]);
  return now;
}

/**
 * The phase, kept current: the clock ticks while a turn is open, and on entering `slow` the page
 * reads the conversation back once (`refetch`), which brings a missed event in.
 */
export function usePhase(
  turns: readonly Turn[],
  state: ConversationState,
  refetch?: () => void,
): { phase: RunPhase | null; now: number } {
  const last = turns.at(-1);
  const active = (last !== undefined && isOpen(last)) || state.pending !== null;
  const now = useNow(active);
  const p = runPhase(turns, state, now);
  const slow = p?.kind === "slow";
  useEffect(() => {
    if (slow) refetch?.();
  }, [slow, refetch]);
  return { phase: p, now };
}
