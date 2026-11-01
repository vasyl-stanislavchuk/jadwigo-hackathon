import type { ConversationClient } from "@jadwigo/api-client";
import {
  type Conversation,
  ConversationId,
  type Run,
  RunEvent,
  RunId,
} from "@jadwigo/contracts/run";
import { foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatScreen } from "./ChatScreen.tsx";
import { LessonPane } from "./LessonPane.tsx";
import { applyPatch, revertPatch, wordsOf, wordsPatch } from "./patches.ts";
import { type RunLive, routesTransport } from "./routesTransport.ts";
import { type EngineTransport, useConversation } from "./useConversation.ts";
import type { SendBody } from "./wire.ts";

afterEach(cleanup);

const eventsOf = (name: string): RunEvent[] =>
  (RUN_LOGS.find((l) => l.name === name)?.events ?? []).map((e) => RunEvent.parse(e));

/** The happy turn's last lesson file: an ended turn, revision 2. */
const lessonFile = () => {
  const lesson = foldRun(eventsOf("happy-turn")).lesson;
  if (lesson === null) throw new Error("no lesson");
  return lesson.lesson_file;
};

/** A transport over one golden log, which records what the page sends. */
function transportOf(events: readonly RunEvent[]) {
  const sent: SendBody[] = [];
  const listeners = new Map<string, (e: readonly RunEvent[]) => void>();
  const run = { id: RunId.parse(events[0]?.run_id), status: "completed" } as unknown as Run;
  const transport: EngineTransport = {
    subscribe(id, on) {
      listeners.set(id, on);
      return () => listeners.delete(id);
    },
    onConnection: () => () => {},
    runs: async () => [run],
    events: async (_id, after) => events.filter((e) => e.seq > after),
    send: async (body) => {
      sent.push(body);
      return run;
    },
  };
  return { transport, sent, push: (e: RunEvent[]) => listeners.get(run.id)?.(e) };
}

/** The runner's answer to a patch: the next revision, the patch applied, named by its steer. */
function revisionFor(events: readonly RunEvent[], patch: unknown, revision: number): RunEvent {
  const last = events.findLast((e) => e.type === "lesson_revision");
  if (last?.type !== "lesson_revision") throw new Error("no lesson_revision");
  return RunEvent.parse({
    ...last,
    seq: Math.max(...events.map((e) => e.seq)) + 1,
    event_id: `00000000-0000-4000-8000-00000000040${revision}`,
    payload: {
      revision,
      call_id: "00000000-0000-4000-8000-000000000999",
      lesson_file: applyPatch(last.payload.lesson_file, patch),
    },
  });
}

describe("patches (dl-z5ja.111)", () => {
  it("a step's words patch only that step's say, in the lesson's language", () => {
    const file = lessonFile();
    const patch = wordsPatch(file, "s02", "pl", "Ile to jest dwa razy sześć?");
    expect(patch).not.toBeNull();
    const after = applyPatch(file, patch);
    expect(wordsOf(after, "s02", "pl")).toBe("Ile to jest dwa razy sześć?");
    expect(wordsOf(after, "s02", "en")).toBe(wordsOf(file, "s02", "en"));
    expect(wordsOf(after, "s05", "pl")).toBe(wordsOf(file, "s05", "pl"));
    expect(Object.keys(patch ?? {})).toEqual(["script"]);
    expect(wordsPatch(file, "s02", "pl", wordsOf(file, "s02", "pl"))).toBeNull();
    expect(wordsPatch(file, "s99", "pl", "Nowe")).toBeNull();
  });

  it("the revert patch restores the revision before, keys added and removed included", () => {
    const before = lessonFile();
    const after = applyPatch(before, {
      title: { pl: "Moje grupy" },
      flavour: null,
      extra: { note: "nowe" },
      ...wordsPatch(before, "s05", "pl", "Ile to jest cztery razy trzy?"),
    });
    const back = revertPatch(after, before);
    expect(back).toMatchObject({ extra: null });
    expect(applyPatch(after, back)).toEqual(before);
    expect(revertPatch(before, structuredClone(before))).toBeNull();
  });

  it("no revert patch where it would have to set a null", () => {
    expect(revertPatch({ a: 1 }, { a: null })).toBeNull();
  });
});

describe("the lesson pane sends a parent's own words as a patch (dl-z5ja.111)", () => {
  it("an edit of a step's words sends one steer with its patch and question_ids", () => {
    const lesson = foldRun(eventsOf("happy-turn")).lesson;
    const sent: unknown[][] = [];
    render(<LessonPane language="pl" lesson={lesson} onEdit={(...args) => sent.push(args)} />);
    fireEvent.click(document.querySelector("[data-edit-step='s02']") as HTMLElement);
    const words = screen.getByRole("textbox", { name: "Co ten krok mówi dziecku" });
    expect((words as HTMLTextAreaElement).value).toBe(wordsOf(lesson?.lesson_file, "s02", "pl"));
    fireEvent.change(words, { target: { value: "Ile to jest dwa razy sześć?" } });
    fireEvent.click(screen.getByRole("button", { name: "Wyślij zmianę" }));
    expect(sent).toHaveLength(1);
    const [text, ids, patch] = sent[0] ?? [];
    expect(text).toBe("Rodzic sam zmienił słowa w kroku s02.");
    expect(ids).toEqual(["s02"]);
    expect(wordsOf(applyPatch(lesson?.lesson_file, patch), "s02", "pl")).toBe(
      "Ile to jest dwa razy sześć?",
    );
    expect(screen.getByText("Twoja zmiana jest już w lekcji.")).toBeTruthy();
  });

  it("the parent's why travels with the patch", () => {
    const lesson = foldRun(eventsOf("happy-turn")).lesson;
    const sent: unknown[][] = [];
    render(<LessonPane language="pl" lesson={lesson} onEdit={(...args) => sent.push(args)} />);
    fireEvent.click(document.querySelector("[data-edit-step='s02']") as HTMLElement);
    fireEvent.change(screen.getByRole("textbox", { name: "Co ten krok mówi dziecku" }), {
      target: { value: "Ile to jest dwa razy sześć?" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Co zmienić w tym kroku i dlaczego?" }), {
      target: { value: "sześć, bo piątki już zna" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Wyślij zmianę" }));
    expect(sent[0]?.[0]).toBe("Rodzic prosi o zmianę w kroku s02: sześć, bo piątki już zna");
    expect(sent[0]?.[2]).toBeDefined();
  });

  it("on an ended turn, a patch still goes as a steer, which the runner lands on that turn", async () => {
    const { transport } = transportOf(eventsOf("happy-turn"));
    const bodies: SendBody[] = [];
    const recording: EngineTransport = {
      ...transport,
      send: async (body) => {
        bodies.push(body);
        return transport.send(body);
      },
    };
    const conversation = ConversationId.parse("cnv_00000000000000000000000001");
    const { result } = renderHook(() => useConversation(recording, conversation));
    await act(async () => {});
    const patch = { title: { pl: "Moje grupy" } };
    await act(async () => result.current.edit("Rodzic sam zmienił tytuł.", ["s02"], patch));
    expect(bodies).toEqual([
      expect.objectContaining({
        kind: "steer",
        source: "lesson_edit",
        question_ids: ["s02"],
        patch,
      }),
    ]);
  });

  it("the pane draws the revision the runner writes, with no model call in between", async () => {
    const events = eventsOf("happy-turn");
    const t = transportOf(events);
    render(<ChatScreen transport={t.transport} />);
    expect(await screen.findByText("Wersja 2")).toBeTruthy();
    fireEvent.click(document.querySelector("[data-edit-step='s02']") as HTMLElement);
    fireEvent.change(screen.getByRole("textbox", { name: "Co ten krok mówi dziecku" }), {
      target: { value: "Ile to jest dwa razy sześć?" },
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Wyślij zmianę" })));
    const [body] = t.sent;
    expect(body).toMatchObject({ kind: "steer", source: "lesson_edit", question_ids: ["s02"] });
    const patch = body?.kind === "steer" ? body.patch : undefined;
    expect(patch).toBeDefined();
    await act(async () => t.push([revisionFor(events, patch, 3)]));
    expect(screen.getByText("Wersja 3")).toBeTruthy();
    expect(screen.getByText("Ile to jest dwa razy sześć?")).toBeTruthy();
  });

  it("Cofnij sends the patch that restores the revision before", async () => {
    const events = eventsOf("happy-turn");
    const t = transportOf(events);
    render(<ChatScreen transport={t.transport} />);
    expect(await screen.findByText("Wersja 2")).toBeTruthy();
    const before = lessonFile();
    const third = revisionFor(events, wordsPatch(before, "s02", "pl", "Ile jest grup?"), 3);
    await act(async () => t.push([third]));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cofnij" })));
    const [body] = t.sent;
    expect(body).toMatchObject({
      kind: "steer",
      source: "lesson_edit",
      question_ids: ["s02"],
      text: "Rodzic prosi o cofnięcie zmiany w krokach s02: wróć do wersji 2.",
    });
    const patch = body?.kind === "steer" ? body.patch : undefined;
    const now = third.type === "lesson_revision" ? third.payload.lesson_file : null;
    expect(applyPatch(now, patch)).toEqual(before);
  });
});

describe("Cofnij falls back to words (dl-z5ja.111)", () => {
  it("when no merge patch can restore the revision before, Cofnij asks the AI in words", async () => {
    const events = eventsOf("happy-turn");
    const t = transportOf(events);
    render(<ChatScreen transport={t.transport} />);
    expect(await screen.findByText("Wersja 2")).toBeTruthy();
    const second = lessonFile();
    // Revision 3 holds a key whose value is null; revision 4 sets it, so going back needs a null.
    const third = {
      ...(applyPatch(second, wordsPatch(second, "s02", "pl", "Raz")) as object),
      extra: null,
    };
    const fourth = {
      ...(applyPatch(third, wordsPatch(third, "s02", "pl", "Dwa")) as object),
      extra: 1,
    };
    const at = (file: unknown, revision: number, seq: number) =>
      RunEvent.parse({
        ...events.findLast((e) => e.type === "lesson_revision"),
        seq,
        event_id: `00000000-0000-4000-8000-00000000060${revision}`,
        payload: { revision, call_id: "call_x", lesson_file: file },
      });
    const top = Math.max(...events.map((e) => e.seq));
    await act(async () => t.push([at(third, 3, top + 1), at(fourth, 4, top + 2)]));
    expect(screen.getByText("Wersja 4")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cofnij" })));
    expect(t.sent).toEqual([
      expect.objectContaining({
        kind: "message",
        text: "Rodzic prosi o cofnięcie zmiany w krokach s02: wróć do wersji 3.",
      }),
    ]);
    expect(t.sent[0]).not.toHaveProperty("patch");
  });
});

describe("the routes carry the patch (dl-z5ja.111)", () => {
  it("a steer's patch reaches postMessage", async () => {
    const SERVER = ConversationId.parse("cnv_00000000000000000000000002");
    const run = { id: RunId.parse(eventsOf("happy-turn")[0]?.run_id) } as unknown as Run;
    const posted: unknown[] = [];
    const api = {
      createConversation: async () => ({ id: SERVER }) as unknown as Conversation,
      postMessage: async (_id: unknown, body: unknown) => {
        posted.push(body);
        return { run };
      },
      listConversationRuns: async () => ({ runs: [run] }),
      listRunEvents: async () => ({ events: [] }),
      cancelRun: async () => ({ run }),
    } as unknown as ConversationClient;
    const live: RunLive = { subscribe: () => () => {}, onConnection: () => () => {} };
    const held = new Map<string, string>();
    const transport = routesTransport(api, live, {
      getItem: (k) => held.get(k) ?? null,
      setItem: (k, v) => void held.set(k, v),
    });
    const patch = { title: { pl: "Moje grupy" } };
    await transport.send({
      conversation_id: ConversationId.parse("cnv_00000000000000000000000001"),
      event_id: "00000000-0000-4000-8000-000000000501" as SendBody["event_id"],
      kind: "steer",
      text: "Rodzic sam zmienił tytuł.",
      source: "lesson_edit",
      question_ids: ["s01"],
      patch,
    });
    expect(posted).toEqual([expect.objectContaining({ kind: "steer", patch })]);
  });
});
