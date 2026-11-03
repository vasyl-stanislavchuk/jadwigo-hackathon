/**
 * Synthetic events appended to a golden run log, and its clock. The logs come from
 * `@jadwigo/testing`, which only a test file imports (dependency-cruiser), so each test file reads them.
 */

import { RunEvent } from "@jadwigo/contracts/run";

/** The epoch ms of the log's last event, plus `after`. */
export const lastAt = (events: readonly RunEvent[], after = 0): number =>
  Date.parse(events.at(-1)?.created_at ?? "2026-01-01T00:00:00.000Z") + after;

type Body = {
  [K in RunEvent["type"]]: { type: K; payload: Extract<RunEvent, { type: K }>["payload"] };
}[RunEvent["type"]];

/** `events` with more events after them, 2 s apart, numbered on from the last seq. */
export function append(events: readonly RunEvent[], ...bodies: Body[]): RunEvent[] {
  const last = events.at(-1);
  const run_id = events[0]?.run_id ?? "run_00000000000000000000000009";
  let seq = last?.seq ?? 0;
  let at = lastAt(events);
  const more = bodies.map((body) => {
    seq += 1;
    at += 2000;
    const n = String(900 + seq).padStart(12, "0");
    return RunEvent.parse({
      run_id,
      seq,
      event_id: `00000000-0000-4000-8fff-${n}`,
      created_at: new Date(at).toISOString(),
      ...body,
    });
  });
  return [...events, ...more];
}

/** The turn closed as completed. */
export const complete = (events: readonly RunEvent[]): RunEvent[] =>
  append(
    events,
    { type: "status", payload: { status: "completed" } },
    { type: "turn_complete", payload: {} },
  );

/** Whether a plan event starts a stage: an entry in progress that was not in the plan before it. */
const startsStage = (
  before: readonly { status: string }[],
  e: Extract<RunEvent, { type: "plan" }>,
): boolean =>
  e.payload.entries.some(
    (entry, i) => entry.status === "in_progress" && before[i]?.status !== "in_progress",
  );

/**
 * A log in the engine's own order (jadwigo-ai run-step.ts): the model's reply, its message and every
 * tool_call are written first, and the plan event that starts a call's stage only when that call
 * runs. The golden logs write the plan first, so each plan event that starts a stage moves to just
 * after the next tool_call, unless a result, an error or the turn's end comes first. The events are
 * numbered again in their new order; each keeps its event_id and its time (dl-uukj.47.71.36).
 */
export function engineOrder(events: readonly RunEvent[]): RunEvent[] {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  const out: RunEvent[] = [];
  let held: RunEvent[] = [];
  let entries: readonly { status: string }[] = [];
  const flush = () => {
    out.push(...held);
    held = [];
  };
  for (const e of sorted) {
    if (out.some((x) => x.event_id === e.event_id) || held.some((x) => x.event_id === e.event_id))
      continue;
    if (e.type === "plan") {
      const starts = startsStage(entries, e);
      entries = e.payload.entries;
      if (starts) {
        flush();
        held = [e];
        continue;
      }
    }
    if (
      e.type !== "message" &&
      e.type !== "model_response" &&
      e.type !== "usage" &&
      e.type !== "tool_call"
    )
      flush();
    out.push(e);
    if (e.type === "tool_call") flush();
  }
  flush();
  return out.map((e, i) => ({ ...e, seq: i + 1 }));
}

/**
 * The events of `ordered` up to and including the one that has `event_id`. At a tool_call, the plan
 * event right after it comes too: the engine starts the call's stage as the call runs, so a call at
 * work is always shown with its stage under way.
 */
export function cutAt(ordered: readonly RunEvent[], event_id: string): RunEvent[] {
  let end = ordered.findIndex((e) => e.event_id === event_id);
  if (ordered[end]?.type === "tool_call") while (ordered[end + 1]?.type === "plan") end += 1;
  return ordered.slice(0, end + 1);
}
