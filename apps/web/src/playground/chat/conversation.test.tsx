import { ApiError } from "@jadwigo/api-client";
import { ErrorType } from "@jadwigo/contracts";
import { ConversationId, type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatScreen } from "./ChatScreen.tsx";
import { conversationReducer, EMPTY, lessonOf, turnsOf } from "./conversation.ts";
import { LessonPane } from "./LessonPane.tsx";
import { revertPatch } from "./patches.ts";
import { type EngineTransport, useConversation } from "./useConversation.ts";
import type { SendBody } from "./wire.ts";

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
  const sent: SendBody[] = [];
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
    send: async (body) => {
      sent.push(body);
      return run;
    },
  };
  return { transport, calls, sent, run, push: (e: RunEvent[]) => listeners.get(run.id)?.(e) };
}

describe("ChatScreen on a transport", () => {
  it("a reload subscribes before it fetches, then draws both panes", async () => {
    const events = eventsOf("happy-turn");
    const t = fakeTransport(events);
    render(<ChatScreen transport={t.transport} />);
    expect(await screen.findByText("Your lesson is ready on the right.")).toBeTruthy();
    expect(t.calls).toEqual(["runs", `subscribe ${t.run.id}`, `events ${t.run.id} after 0`]);
    expect(screen.getByText("Wersja 2")).toBeTruthy();
    // Each question step is named in the parent's language (dl-z5ja.45).
    const steps = document.querySelectorAll("[data-step][aria-label]");
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps)
      expect(step.getAttribute("aria-label")).toBe(`Krok ${step.getAttribute("data-step")}`);
    await act(async () => t.push(events));
    expect(screen.getAllByText("Your lesson is ready on the right.")).toHaveLength(1);
  });
});

describe("ChatScreen's phone switch (dl-z5ja.28)", () => {
  it("badges Lekcja when a revision lands with the chat in front, and clears it once read", async () => {
    const events = eventsOf("happy-turn");
    const t = fakeTransport(events);
    render(<ChatScreen transport={t.transport} />);
    expect(await screen.findByText("Wersja 2")).toBeTruthy();
    const lessonTab = screen.getByRole("tab", { name: /Lekcja/ });
    expect(screen.getByRole("tab", { name: "Rozmowa" }).getAttribute("aria-selected")).toBe("true");
    expect(lessonTab.querySelector("[data-badge]")?.textContent).toBe("Lekcja się zmieniła");
    fireEvent.click(lessonTab);
    expect(lessonTab.getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector("[data-pane='lesson']")?.getAttribute("data-front")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Rozmowa" }));
    expect(lessonTab.querySelector("[data-badge]")).toBeNull();
  });
});

describe("a send a message limit refuses (dl-z5ja.62, .100)", () => {
  it("is marked with its limit by the error's type, and any other failure with none", async () => {
    const conversation = ConversationId.parse("cnv_00000000000000000000000001");
    const refusing = (error: Error): EngineTransport => ({
      ...fakeTransport(eventsOf("happy-turn")).transport,
      runs: async () => [],
      send: async () => {
        throw error;
      },
    });
    for (const [type, limit] of [
      [ErrorType.enum.MessageLimitMinute, "minute"],
      [ErrorType.enum.MessageLimitDay, "day"],
    ] as const) {
      const refused = refusing(new ApiError("too many messages", 429, type));
      const { result } = renderHook(() => useConversation(refused, conversation));
      await act(async () => {});
      await act(async () => result.current.send("Jeszcze jedno."));
      expect(result.current.state).toMatchObject({ sendFailed: true, sendLimit: limit });
      cleanup();
    }
    const down = refusing(new Error("offline"));
    const other = renderHook(() => useConversation(down, conversation));
    await act(async () => {});
    await act(async () => other.result.current.send("Jeszcze jedno."));
    expect(other.result.current.state).toMatchObject({ sendFailed: true, sendLimit: null });
  });
});

const isRevision = (e: RunEvent): boolean => e.type === "lesson_revision";
const lessonFileOf = (e: RunEvent | undefined): unknown =>
  e?.type === "lesson_revision" ? e.payload.lesson_file : null;

describe("co-editing: an AI revision's changed steps (dl-z5ja.30)", () => {
  /** A 3rd revision of the happy turn's lesson with step s02's words changed, as the next event. */
  function thirdRevision(events: readonly RunEvent[]): RunEvent {
    const second = events.findLast((e) => e.type === "lesson_revision");
    if (second?.type !== "lesson_revision") throw new Error("no lesson_revision");
    const file = structuredClone(second.payload.lesson_file) as {
      script: { parts: { steps: { id: string; say?: unknown }[] }[] };
    };
    for (const part of file.script.parts)
      for (const step of part.steps) if (step.id === "s02") step.say = { pl: "Ile jest grup?" };
    return RunEvent.parse({
      ...second,
      seq: Math.max(...events.map((e) => e.seq)) + 1,
      event_id: "00000000-0000-4000-8000-000000000301",
      payload: { ...second.payload, revision: 3, lesson_file: file },
    });
  }

  it("Cofnij waits for its patch, and stops waiting when the send fails (#546's review)", async () => {
    const events = eventsOf("happy-turn");
    const t = fakeTransport(events);
    let refuse = true;
    const send = t.transport.send.bind(t.transport);
    const transport: EngineTransport = {
      ...t.transport,
      send: async (body) => {
        if (refuse && body.kind === "steer") throw new Error("offline");
        return send(body);
      },
    };
    render(<ChatScreen transport={transport} />);
    expect(await screen.findByText("Wersja 2")).toBeTruthy();
    await act(async () => t.push([thirdRevision(events)]));
    const undo = () => document.querySelector("[data-undo]") as HTMLButtonElement;
    await act(async () => fireEvent.click(undo()));
    // The send never reached the server: no log will hold the steer, so Cofnij is pressable again.
    expect(undo().disabled).toBe(false);
    refuse = false;
    await act(async () => fireEvent.click(undo()));
    // This one went: Cofnij waits for its revision.
    expect(undo().disabled).toBe(true);
  });

  it("a step's words edit whose send fails hands the words back (#546's review)", async () => {
    const events = eventsOf("happy-turn");
    const t = fakeTransport(events);
    const send = t.transport.send.bind(t.transport);
    const transport: EngineTransport = {
      ...t.transport,
      send: async (body) => {
        if (body.kind === "steer") throw new Error("offline");
        return send(body);
      },
    };
    render(<ChatScreen transport={transport} />);
    expect(await screen.findByText("Wersja 2")).toBeTruthy();
    fireEvent.click(document.querySelector("[data-edit-step='s02']") as HTMLElement);
    const words = () => screen.getByRole("textbox", { name: "Co ten krok mówi dziecku" });
    fireEvent.change(words(), { target: { value: "Ile to jest dwa razy sześć?" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Wyślij zmianę" })));
    // Never saving forever: the editor opens again on the parent's words, and says it did not land.
    expect(screen.queryByText("Zapisuję Twoją zmianę w lekcji…")).toBeNull();
    expect((words() as HTMLTextAreaElement).value).toBe("Ile to jest dwa razy sześć?");
  });

  it("a revision that lands live marks only the step it changed, and a reload marks it again", async () => {
    const events = eventsOf("happy-turn");
    const t = fakeTransport(events);
    render(<ChatScreen transport={t.transport} />);
    expect(await screen.findByText("Wersja 2")).toBeTruthy();
    // Revisions 1 and 2 hold the same steps, so nothing is marked yet.
    expect(document.querySelector("[data-changed]")).toBeNull();
    const third = thirdRevision(events);
    await act(async () => t.push([third]));
    expect(screen.getByText("Wersja 3")).toBeTruthy();
    const marked = () => [...document.querySelectorAll("[data-changed]")];
    expect(marked().map((m) => m.getAttribute("data-step"))).toEqual(["s02"]);
    expect(marked()[0]?.textContent).toContain("Zmienione przez asystenta");
    // Cofnij sends the patch back to revision 2 as a lesson_edit steer, which the runner applies
    // with no model call even on an ended turn (wave 4 decision 41, dl-z5ja.111).
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cofnij" })));
    expect(t.sent).toEqual([
      expect.objectContaining({
        kind: "steer",
        source: "lesson_edit",
        question_ids: ["s02"],
        text: "Rodzic prosi o cofnięcie zmiany w krokach s02: wróć do wersji 2.",
        patch: revertPatch(lessonFileOf(third), lessonFileOf(events.findLast(isRevision))),
        base_revision: 3,
      }),
    ]);

    // A reload reads revision 2 from the log as previous_lesson (dl-z5ja.68): the same mark.
    cleanup();
    render(<ChatScreen transport={fakeTransport([...events, third]).transport} />);
    expect(await screen.findByText("Wersja 3")).toBeTruthy();
    expect(marked().map((m) => m.getAttribute("data-step"))).toEqual(["s02"]);
  });

  it("Cofnij takes back the last AI revision once a handler is wired", () => {
    const events = eventsOf("happy-turn");
    const lesson = foldRun(events).lesson;
    let undone = 0;
    render(
      <LessonPane
        language="pl"
        lesson={lesson}
        changed={new Set(["s02"])}
        onUndo={() => {
          undone += 1;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cofnij" }));
    expect(undone).toBe(1);
  });
});

describe("a parent's own edit goes back to the AI (dl-z5ja.30)", () => {
  it("the step editor sends what to change and why, in the lesson's language, naming the step", () => {
    const lesson = foldRun(eventsOf("happy-turn")).lesson;
    const sent: [string, string[]][] = [];
    render(
      <LessonPane
        language="pl"
        lesson={lesson}
        onEdit={(text, ids) => {
          sent.push([text, ids]);
        }}
      />,
    );
    fireEvent.click(document.querySelector("[data-edit-step='s02']") as HTMLElement);
    fireEvent.change(screen.getByRole("textbox", { name: "Co zmienić w tym kroku i dlaczego?" }), {
      target: { value: "mniejsze liczby, bo to dopiero początek" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Wyślij zmianę" }));
    expect(sent).toEqual([
      ["Rodzic prosi o zmianę w kroku s02: mniejsze liczby, bo to dopiero początek", ["s02"]],
    ]);
    expect(screen.getByText("Twoja zmiana trafiła do asystenta.")).toBeTruthy();
  });

  /** The bodies a transport was sent, after its conversation restored. */
  async function editOn(name: string): Promise<SendBody[]> {
    const t = fakeTransport(eventsOf(name));
    const bodies: SendBody[] = [];
    const transport: EngineTransport = {
      ...t.transport,
      send: async (body) => {
        bodies.push(body);
        return t.run;
      },
    };
    const conversation = ConversationId.parse("cnv_00000000000000000000000001");
    const { result } = renderHook(() => useConversation(transport, conversation));
    await act(async () => {});
    await act(async () => result.current.edit("Rodzic prosi o zmianę w kroku s02: …", ["s02"]));
    return bodies;
  }

  it("while the turn runs, the edit is a steer naming its questions", async () => {
    const [body] = await editOn("reload-with-duplicates");
    expect(body).toMatchObject({
      kind: "steer",
      source: "lesson_edit",
      question_ids: ["s02"],
      text: "Rodzic prosi o zmianę w kroku s02: …",
    });
  });

  it("after the turn, the same words go as a new message", async () => {
    const [body] = await editOn("happy-turn");
    expect(body).toMatchObject({ kind: "message", text: "Rodzic prosi o zmianę w kroku s02: …" });
  });
});
