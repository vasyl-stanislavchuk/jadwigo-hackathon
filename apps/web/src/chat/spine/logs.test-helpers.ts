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
