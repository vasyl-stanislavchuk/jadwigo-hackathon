/**
 * One honest run state (dl-uukj.47.29): the phase of the golden happy turn at each point, the quiet
 * clock (slow at 20 s, stalled at 60 s, back on a late event), a refusing channel or a failed
 * restore said as stalled and never as failed, and the echo keeping a turn open before the server
 * named its run.
 */

import { type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import {
  type ConversationAction,
  type ConversationState,
  conversationReducer,
  EMPTY,
  turnsOf,
} from "./conversation.ts";
import { elapsedSeconds, phaseAnnouncement, runPhase, SLOW_MS, STALL_MS } from "./phase.ts";

const events = (RUN_LOGS.find((l) => l.name === "happy-turn")?.events ?? []).map((e) =>
  RunEvent.parse(e),
);
const run = (status: Run["status"]): Run => ({
  id: RunId.parse(events[0]?.run_id),
  pod_id: "pod_00000000000000000000000001" as Run["pod_id"],
  created_by: "acc_00000000000000000000000001" as Run["created_by"],
  conversation_id: null,
  workflow: "jadwigo-lesson-compose",
  resumes: null,
  status,
  attempt: 1,
  cancel_requested_at: null,
  idle_deadline_at: null,
  max_deadline_at: "2026-09-01T08:30:00.000Z",
  cap_usd: 1,
  spent_usd: 0,
  created_at: "2026-09-01T08:00:00.000Z",
  completed_at: null,
});

const T0 = 1_000_000;
const apply = (...actions: ConversationAction[]): ConversationState =>
  actions.reduce(conversationReducer, EMPTY);
const phaseAt = (state: ConversationState, now: number) => runPhase(turnsOf(state), state, now);
/** The happy turn up to and including `seq`, heard at `at`. */
const upTo = (seq: number, at = T0): ConversationAction[] => [
  { type: "run", run: run("queued"), at },
  { type: "fetched", run_id: run("queued").id, events: events.filter((e) => e.seq <= seq), at },
];

describe("runPhase", () => {
  it("is nothing before a turn, and connecting while a first read is on its way", () => {
    expect(phaseAt(EMPTY, T0)).toBeNull();
    expect(phaseAt(apply({ type: "restoring" }), T0)?.kind).toBe("connecting");
  });

  it("walks the happy turn: queued, thinking, a tool in its own words, done", () => {
    expect(phaseAt(apply(...upTo(1)), T0)?.kind).toBe("queued");
    expect(phaseAt(apply(...upTo(2)), T0)?.kind).toBe("thinking");
    const tool = phaseAt(apply(...upTo(5)), T0);
    expect(tool).toMatchObject({ kind: "tool", verb: "lesson_draft" });
    expect(tool?.copyKey).toBe("chat_tool_lesson_draft");
    const done = phaseAt(apply(...upTo(17)), T0);
    expect(done).toMatchObject({ kind: "done", open: false, since: null });
    expect(phaseAnnouncement(done)).toBe("chat_announce_done");
  });

  it("goes slow at 20 s and stalled at 60 s without an event, and back on a late one", () => {
    const quiet = apply(...upTo(2));
    expect(phaseAt(quiet, T0 + SLOW_MS - 1)?.kind).toBe("thinking");
    expect(phaseAt(quiet, T0 + SLOW_MS)?.kind).toBe("slow");
    expect(phaseAt(quiet, T0 + STALL_MS)?.kind).toBe("stalled");
    expect(phaseAnnouncement(phaseAt(quiet, T0 + STALL_MS))).toBe("chat_phase_stalled");
    const late = conversationReducer(quiet, {
      type: "live",
      run_id: run("queued").id,
      events: events.filter((e) => e.seq > 2 && e.seq <= 5),
      at: T0 + STALL_MS + 1,
    });
    expect(phaseAt(late, T0 + STALL_MS + 2)?.kind).toBe("tool");
  });

  it("says a refusing channel and a failed restore as stalled, never failed", () => {
    expect(phaseAt(apply(...upTo(2), { type: "link_error" }), T0)?.kind).toBe("stalled");
    expect(phaseAt(apply(...upTo(2), { type: "restore_failed" }), T0)?.kind).toBe("stalled");
    expect(phaseAt(apply({ type: "restoring" }, { type: "restore_failed" }), T0)?.kind).toBe(
      "stalled",
    );
    // A dropped channel is connecting, while its clock still runs.
    expect(phaseAt(apply(...upTo(2), { type: "disconnected" }), T0)?.kind).toBe("connecting");
  });

  it("says failed only when the run's status does", () => {
    const failed = apply({ type: "run", run: run("failed"), at: T0 });
    expect(phaseAt(failed, T0)?.kind).toBe("failed");
    expect(phaseAt(apply({ type: "run", run: run("cancelled"), at: T0 }), T0)?.kind).toBe(
      "cancelled",
    );
  });

  it("keeps a turn open on the echo alone, and counts its seconds from the send", () => {
    const sent = apply({
      type: "pending",
      pending: { text: "Odejmowanie", event_id: "e1", at: T0 },
    });
    const p = phaseAt(sent, T0 + 7_400);
    expect(p).toMatchObject({ kind: "queued", open: true, since: T0, run: null });
    expect(elapsedSeconds(p, T0 + 7_400)).toBe(7);
    expect(phaseAt(sent, T0 + STALL_MS)?.kind).toBe("stalled");
  });

  it("waits on the parent with no clock", () => {
    const asked = apply({ type: "run", run: run("awaiting_input"), at: T0 });
    expect(phaseAt(asked, T0 + 10 * STALL_MS)?.kind).toBe("awaiting_input");
  });
});

describe("the echo", () => {
  it("shows at once and goes when its own event is in the log", () => {
    const sent = apply({
      type: "pending",
      pending: {
        text: events[0]?.type === "message" ? events[0].payload.text : "",
        event_id: events[0]?.event_id ?? "",
        at: T0,
      },
    });
    expect(sent.pending?.text).toBe("A short lesson on equal groups for grade 2, please.");
    const logged = [...upTo(1)].reduce(conversationReducer, sent);
    expect(logged.pending).toBeNull();
  });

  it("goes when the send fails, and when the turn it landed on ends", () => {
    const sent = apply({ type: "pending", pending: { text: "Inne", event_id: "e9", at: T0 } });
    expect(conversationReducer(sent, { type: "send_failed", failed: true }).pending).toBeNull();
    const landed = [
      { type: "sent", event_id: "e9", run_id: run("queued").id } as const,
      ...upTo(17),
    ].reduce(conversationReducer, sent);
    expect(landed.pending).toBeNull();
  });
});
