/**
 * Synthetic events appended to a golden run log, and its clock. The logs come from
 * `@jadwigo/testing`, which only a test file imports (dependency-cruiser), so each test file reads them.
 */

import { PLAN_STAGE_OF, RunEvent } from "@jadwigo/contracts/run";

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

/** The stage a plan event starts: an entry in progress that was not before it, or -1. */
const startedBy = (
  before: readonly { status: string }[],
  e: Extract<RunEvent, { type: "plan" }>,
): number =>
  e.payload.entries.findIndex(
    (entry, i) => entry.status === "in_progress" && before[i]?.status !== "in_progress",
  );

/**
 * A log in the engine's own order (jadwigo-ai run-step.ts): the model's reply, its message and every
 * tool_call are written first, and the plan event that starts a stage only when a call of that
 * stage's verb (`PLAN_STAGE_OF`) runs. The golden logs write the plan first, so each plan event that
 * starts a stage moves to just after the next call of that stage's verb, when one comes before the
 * next plan event or the turn's end; else it stays. The events are numbered again in their new
 * order, and each keeps its event_id and its time (dl-uukj.47.71.36).
 */
export function engineOrder(events: readonly RunEvent[]): RunEvent[] {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  const kept = sorted.filter((e, i) => sorted.findIndex((x) => x.event_id === e.event_id) === i);
  const out: RunEvent[] = [];
  let held: { event: RunEvent; stage: number } | null = null;
  let entries: readonly { status: string }[] = [];
  for (const e of kept) {
    const ends = e.type === "status" || e.type === "turn_complete" || e.type === "plan";
    if (held !== null && ends) {
      out.push(held.event);
      held = null;
    }
    if (e.type === "plan") {
      const stage = startedBy(entries, e);
      entries = e.payload.entries;
      const call = kept.find(
        (x) => x.seq > e.seq && x.type === "tool_call" && PLAN_STAGE_OF[x.payload.verb] === stage,
      );
      const nextPlan = kept.find((x) => x.seq > e.seq && x.type === "plan");
      if (
        stage !== -1 &&
        call !== undefined &&
        (nextPlan === undefined || call.seq < nextPlan.seq)
      ) {
        held = { event: e, stage };
        continue;
      }
    }
    out.push(e);
    if (held !== null && e.type === "tool_call" && PLAN_STAGE_OF[e.payload.verb] === held.stage) {
      out.push(held.event);
      held = null;
    }
  }
  if (held !== null) out.push(held.event);
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
