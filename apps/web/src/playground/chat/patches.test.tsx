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
import { applyPatch, patchOutcome, revertPatch, wordsOf, wordsPatch } from "./patches.ts";
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
function revisionFor(
  events: readonly RunEvent[],
  patch: unknown,
  revision: number,
  call_id = "00000000-0000-4000-8000-000000000999",
): RunEvent {
  const last = events.findLast((e) => e.type === "lesson_revision");
  if (last?.type !== "lesson_revision") throw new Error("no lesson_revision");
  return RunEvent.parse({
    ...last,
    seq: Math.max(...events.map((e) => e.seq)) + 1,
    event_id: `00000000-0000-4000-8000-00000000040${revision}`,
    payload: { revision, call_id, lesson_file: applyPatch(last.payload.lesson_file, patch) },
  });
}

/** The steer the runner logs for a body the page sent, after `events`. */
function steerFor(events: readonly RunEvent[], body: SendBody | undefined): RunEvent {
  if (body?.kind !== "steer") throw new Error("not a steer");
  return RunEvent.parse({
    run_id: events[0]?.run_id,
    seq: Math.max(...events.map((e) => e.seq)) + 1,
    event_id: body.event_id,
    type: "steer",
    created_at: "2026-09-01T08:01:00.000Z",
    payload: {
      text: body.text,
      source: body.source,
      question_ids: body.question_ids,
      patch: body.patch,
      base_revision: body.base_revision,
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

  it("patchOutcome reads the runner's rule from the log: pending, applied, or refused", () => {
    const events = eventsOf("happy-turn");
    const body = (patch: unknown, base_revision: number): SendBody =>
      ({
        conversation_id: "cnv_00000000000000000000000001",
        event_id: "00000000-0000-4000-8000-000000000701",
        kind: "steer",
        text: "x",
        source: "lesson_edit",
        question_ids: ["s02"],
        patch,
        base_revision,
      }) as SendBody;
    const ok = wordsPatch(lessonFile(), "s02", "pl", "Nowe");
    const id = "00000000-0000-4000-8000-000000000701";
    expect(patchOutcome([{ events }], id)).toBe("pending");
    const steer = steerFor(events, body(ok, 2));
    expect(patchOutcome([{ events: [...events, steer] }], id)).toBe("pending");
    const landed = revisionFor([...events, steer], ok, 3, id);
    expect(patchOutcome([{ events: [...events, steer, landed] }], id)).toBe("applied");
    expect(patchOutcome([{ events: [...events, steerFor(events, body(ok, 1))] }], id)).toBe(
      "refused",
    );
    // A merged file the lenient parse cannot read whole is refused too.
    const broken = { script: { parts: [{ part: "p", steps: [{ id: "s02" }] }] } };
    expect(patchOutcome([{ events: [...events, steerFor(events, body(broken, 2))] }], id)).toBe(
      "refused",
    );
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
    const [text, ids, change] = sent[0] ?? [];
    expect(text).toBe("Rodzic sam zmienił słowa w kroku s02.");
    expect(ids).toEqual(["s02"]);
    const { patch, base_revision } = change as { patch: unknown; base_revision: number };
    expect(base_revision).toBe(lesson?.revision);
    expect(wordsOf(applyPatch(lesson?.lesson_file, patch), "s02", "pl")).toBe(
      "Ile to jest dwa razy sześć?",
    );
    // Not in the lesson until the runner's revision is logged.
    expect(screen.getByText("Zapisuję Twoją zmianę w lekcji…")).toBeTruthy();
    expect(screen.queryByText("Twoja zmiana jest już w lekcji.")).toBeNull();
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
    let sent: string | null = null;
    await act(async () => {
      sent = result.current.edit("Rodzic sam zmienił tytuł.", ["s02"], { patch, base_revision: 2 });
    });
    expect(bodies).toEqual([
      expect.objectContaining({
        kind: "steer",
        source: "lesson_edit",
        question_ids: ["s02"],
        patch,
        base_revision: 2,
      }),
    ]);
    expect(sent).toBe(bodies[0]?.event_id);
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
    expect(body).toMatchObject({
      kind: "steer",
      source: "lesson_edit",
      question_ids: ["s02"],
      base_revision: 2,
    });
    const patch = body?.kind === "steer" ? body.patch : undefined;
    expect(patch).toBeDefined();
    const steer = steerFor(events, body);
    await act(async () => t.push([steer]));
    expect(screen.getByText("Zapisuję Twoją zmianę w lekcji…")).toBeTruthy();
    await act(async () => t.push([revisionFor([...events, steer], patch, 3, body?.event_id)]));
    expect(screen.getByText("Wersja 3")).toBeTruthy();
    expect(screen.getByText("Ile to jest dwa razy sześć?")).toBeTruthy();
    expect(screen.getByText("Twoja zmiana jest już w lekcji.")).toBeTruthy();
  });

  it("a patch the runner refuses keeps the parent's text and says it was not applied", async () => {
    const events = eventsOf("happy-turn");
    const t = transportOf(events);
    render(<ChatScreen transport={t.transport} />);
    expect(await screen.findByText("Wersja 2")).toBeTruthy();
    fireEvent.click(document.querySelector("[data-edit-step='s02']") as HTMLElement);
    fireEvent.change(screen.getByRole("textbox", { name: "Co ten krok mówi dziecku" }), {
      target: { value: "Ile to jest dwa razy sześć?" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Co zmienić w tym kroku i dlaczego?" }), {
      target: { value: "piątki już zna" },
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Wyślij zmianę" })));
    // The AI's revision 3 lands before the steer is logged: the patch, made on 2, is refused.
    const ai = revisionFor(events, wordsPatch(lessonFile(), "s05", "pl", "Inne"), 3);
    const steer = steerFor([...events, ai], t.sent[0]);
    await act(async () => t.push([ai, steer]));
    expect(screen.getByRole("alert").textContent).toContain("Tej zmiany nie udało się wprowadzić");
    const words = screen.getByRole("textbox", { name: "Co ten krok mówi dziecku" });
    expect((words as HTMLTextAreaElement).value).toBe("Ile to jest dwa razy sześć?");
    const why = screen.getByRole("textbox", { name: "Co zmienić w tym kroku i dlaczego?" });
    expect((why as HTMLTextAreaElement).value).toBe("piątki już zna");
    expect(screen.queryByText("Twoja zmiana jest już w lekcji.")).toBeNull();
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
      base_revision: 3,
    });
    const patch = body?.kind === "steer" ? body.patch : undefined;
    const now = third.type === "lesson_revision" ? third.payload.lesson_file : null;
    expect(applyPatch(now, patch)).toEqual(before);
  });

  it("a Cofnij the runner refuses says it was not applied", async () => {
    const events = eventsOf("happy-turn");
    const t = transportOf(events);
    render(<ChatScreen transport={t.transport} />);
    expect(await screen.findByText("Wersja 2")).toBeTruthy();
    const third = revisionFor(events, wordsPatch(lessonFile(), "s02", "pl", "Ile jest grup?"), 3);
    await act(async () => t.push([third]));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cofnij" })));
    const fourth = revisionFor([...events, third], {}, 4);
    const steer = steerFor([...events, third, fourth], t.sent[0]);
    await act(async () => t.push([fourth, steer]));
    expect(document.querySelector("[data-undo-refused]")?.textContent).toContain(
      "Tej zmiany nie udało się wprowadzić",
    );
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
      base_revision: 1,
    });
    expect(posted).toEqual([expect.objectContaining({ kind: "steer", patch, base_revision: 1 })]);
  });
});
