import { type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatScreen } from "./ChatScreen.tsx";
import { conversationReducer, EMPTY, lessonOf, turnsOf } from "./conversation.ts";
import type { EngineTransport } from "./useConversation.ts";

afterEach(cleanup);

const eventsOf = (name: string): RunEvent[] =>
  (RUN_LOGS.find((l) => l.name === name)?.events ?? []).map((e) => RunEvent.parse(e));

function runOf(events: readonly RunEvent[], status: Run["status"] = "in_progress"): Run {
  return {
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
  };
}

describe("conversationReducer", () => {
  it("buffers live pushes until the fetch, then merges without a gap or a duplicate", () => {
    const events = eventsOf("happy-turn");
    const run = runOf(events);
    let state = conversationReducer(EMPTY, { type: "run", run });
    // Subscribed first: seq 4 on, with repeats, arrives before the fetch.
    state = conversationReducer(state, {
      type: "live",
      run_id: run.id,
      events: [...events.slice(3), ...events.slice(5)],
    });
    state = conversationReducer(state, {
      type: "fetched",
      run_id: run.id,
      events: events.slice(0, -1),
    });
    expect(state.runs[0]?.events.map((e) => e.seq)).toEqual(events.map((e) => e.seq));
    expect(turnsOf(state)[0]?.view).toEqual(foldRun(events));
    // A push after the fetch that repeats what is held changes nothing.
    const again = conversationReducer(state, { type: "live", run_id: run.id, events });
    expect(again.runs[0]?.events).toHaveLength(events.length);
  });

  it("a reconnect fetches after the cursor and keeps what it drew", () => {
    const events = eventsOf("happy-turn");
    const run = runOf(events);
    let state = conversationReducer(EMPTY, { type: "run", run });
    state = conversationReducer(state, {
      type: "fetched",
      run_id: run.id,
      events: events.slice(0, 8),
    });
    state = conversationReducer(state, { type: "disconnected" });
    expect(state.connection).toBe("restoring");
    state = conversationReducer(state, { type: "live", run_id: run.id, events: events.slice(12) });
    state = conversationReducer(state, {
      type: "fetched",
      run_id: run.id,
      events: events.slice(8),
    });
    state = conversationReducer(state, { type: "restored" });
    expect(state.connection).toBe("live");
    expect(state.runs[0]?.events.map((e) => e.seq)).toEqual(events.map((e) => e.seq));
    expect(lessonOf(turnsOf(state))?.revision).toBe(2);
  });

  it("a queued follow-up leaves the list once its message is in the log", () => {
    const events = eventsOf("follow-up-mid-turn");
    const run = runOf(events);
    let state = conversationReducer(EMPTY, { type: "run", run });
    state = conversationReducer(state, {
      type: "fetched",
      run_id: run.id,
      events: events.slice(0, 7),
    });
    state = conversationReducer(state, { type: "queued", text: "Make it 5 questions, not 8." });
    expect(state.queued).toHaveLength(1);
    state = conversationReducer(state, {
      type: "live",
      run_id: run.id,
      events: events.slice(7, 8),
    });
    expect(state.queued).toEqual([]);
  });

  it("Stopping clears when the turn ends", () => {
    const events = eventsOf("cancel-during-a-verb");
    const run = runOf(events);
    let state = conversationReducer(EMPTY, { type: "run", run });
    state = conversationReducer(state, {
      type: "fetched",
      run_id: run.id,
      events: events.slice(0, 5),
    });
    state = conversationReducer(state, { type: "stop" });
    expect(state.stopping).toBe(true);
    state = conversationReducer(state, { type: "live", run_id: run.id, events: events.slice(5) });
    expect(state.stopping).toBe(false);
  });
});

/** A transport that records the order of calls and pushes when the test says. */
function fakeTransport(events: readonly RunEvent[]) {
  const calls: string[] = [];
  const listeners = new Map<string, (e: readonly RunEvent[]) => void>();
  const run = runOf(events, "completed");
  const transport: EngineTransport = {
    subscribe(id, on) {
      calls.push(`subscribe ${id}`);
      listeners.set(id, on);
      return () => listeners.delete(id);
    },
    onConnection: () => () => {},
    runs: async () => {
      calls.push("runs");
      return [run];
    },
    events: async (id, after) => {
      calls.push(`events ${id} after ${after}`);
      return events.filter((e) => e.seq > after);
    },
    send: async () => run,
  };
  return { transport, calls, run, push: (e: RunEvent[]) => listeners.get(run.id)?.(e) };
}

describe("ChatScreen on a transport", () => {
  it("a reload subscribes before it fetches, then draws both panes", async () => {
    const events = eventsOf("happy-turn");
    const t = fakeTransport(events);
    render(<ChatScreen transport={t.transport} />);
    expect(await screen.findByText("Your lesson is ready on the right.")).toBeTruthy();
    expect(t.calls).toEqual(["runs", `subscribe ${t.run.id}`, `events ${t.run.id} after 0`]);
    expect(screen.getByText("Wersja 2")).toBeTruthy();
    await act(async () => t.push(events));
    expect(screen.getAllByText("Your lesson is ready on the right.")).toHaveLength(1);
  });
});
