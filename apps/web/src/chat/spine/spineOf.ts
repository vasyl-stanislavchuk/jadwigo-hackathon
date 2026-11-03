/**
 * A turn's spine from its run events (handoff §2, §10). STUB from step 0 of wave dl-uukj.47.71:
 * it names the phase and the start and nothing else, so lane B can draw against the shape while
 * lane A (dl-uukj.47.71.2) writes the fold: stages, lines, merges, the reply, the foot.
 */
import type { RunEvent } from "@jadwigo/contracts/run";
import type { RunPhase } from "../phase.ts";
import type { LessonCardState, SpinePhase, TurnSpine } from "./types.ts";

const PHASE: Readonly<Record<RunPhase["kind"], SpinePhase>> = {
  connecting: "queued",
  queued: "queued",
  thinking: "thinking",
  tool: "tool",
  awaiting_input: "awaiting_input",
  slow: "slow",
  stalled: "stalled",
  done: "done",
  failed: "failed",
  cancelled: "cancelled",
};

/** The turn's spine at `now`, given its events and the page's phase for it. */
export function spineOf(
  events: readonly RunEvent[],
  phase: RunPhase | null,
  now: number,
): TurnSpine {
  const first = events[0];
  const startedAt = first === undefined ? now : Date.parse(first.created_at);
  const kind = phase === null ? "done" : PHASE[phase.kind];
  return {
    phase: kind,
    title: { copyKey: kind === "queued" ? "chat_phase_queued" : "chat_phase_thinking", values: {} },
    startedAt,
    stepCount: events.filter((e) => e.type === "tool_call").length,
    stages: [],
    looseLines: [],
  };
}

/** The lesson card of a turn, or null when the turn wrote none. STUB: lane A writes it. */
export function cardStateOf(_events: readonly RunEvent[]): LessonCardState | null {
  return null;
}
