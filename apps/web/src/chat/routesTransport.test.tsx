import type { ConversationClient } from "@jadwigo/api-client";
import { AttachmentId, EventId, ID_PREFIXES, idOf, LearnerId } from "@jadwigo/contracts";
import {
  type Conversation,
  ConversationId,
  type Run,
  RunEvent,
  RunId,
} from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatScreen } from "./ChatScreen.tsx";
import { type RunLive, routesTransport } from "./routesTransport.ts";
import { useConversation } from "./useConversation.ts";
import type { SendBody } from "./wire.ts";

afterEach(cleanup);

const LOCAL = ConversationId.parse("cnv_00000000000000000000000001");
const SERVER = ConversationId.parse("cnv_00000000000000000000000002");

const eventsOf = (name: string): RunEvent[] =>
  (RUN_LOGS.find((l) => l.name === name)?.events ?? []).map((e) => RunEvent.parse(e));

/** A made-up server: one run, whose log is the golden log up to `written` events. */
function server(name: string) {
  const events = eventsOf(name);
  const run = {
    id: RunId.parse(events[0]?.run_id),
    status: "in_progress",
    conversation_id: SERVER,
  } as unknown as Run;
  const calls: string[] = [];
  /** Each body postMessage took, as the route would read it. */
  const bodies: Record<string, unknown>[] = [];
  const state = { written: events.length, posted: false };
  const api: ConversationClient = {
    async createConversation(body) {
      calls.push(`create ${body.event_id.length > 0}`);
      return { id: SERVER } as unknown as Conversation;
    },
    async postMessage(id, body) {
      bodies.push(body as Record<string, unknown>);
      calls.push(
        body.kind === "steer"
          ? `steer ${id} ${body.source} ${body.question_ids?.join(",")} ${body.text}`
          : `message ${id} ${body.text}${body.context === undefined ? "" : ` ${JSON.stringify(body.context)}`}`,
      );
      state.posted = true;
      return { run };
    },
    async listConversationRuns(id) {
      calls.push(`runs ${id}`);
      return { runs: state.posted ? [run] : [] };
    },
    async listRunEvents(id, after = 0) {
      calls.push(`events ${id} after ${after}`);
      return { events: events.slice(0, state.written).filter((e) => e.seq > after) };
    },
    async cancelRun(id, body) {
      calls.push(`cancel ${id} ${body.event_id.length > 0}`);
      return { run };
    },
  };
  const pokes = new Map<string, () => void>();
  const live: RunLive = {
    subscribe(topic, onPoke) {
      calls.push(`subscribe ${topic}`);
      pokes.set(topic, onPoke);
      return () => pokes.delete(topic);
    },
    onConnection: () => () => {},
  };
  const held = new Map<string, string>();
  const storage = {
    getItem: (k: string) => held.get(k) ?? null,
    setItem: (k: string, v: string) => void held.set(k, v),
  };
  return {
    api,
    live,
    storage,
    held,
    calls,
    bodies,
    run,
    events,
    state,
    poke: () => pokes.get(`run:${run.id}`)?.(),
  };
}

const settle = () => act(async () => {});

describe("the routes transport (dl-z5ja.65)", () => {
  it("a first send makes the server's conversation once, then a poke fetches after the cursor", async () => {
    const s = server("happy-turn");
    s.state.written = 5;
    const transport = routesTransport(s.api, s.live, s.storage);
    const { result } = renderHook(() => useConversation(transport, LOCAL));
    await settle();
    // No server conversation yet: nothing to list.
    expect(s.calls).toEqual([]);
    await act(async () => result.current.send("Dodawanie do 20."));
    expect(s.calls).toEqual([
      "create true",
      `message ${SERVER} Dodawanie do 20.`,
      `subscribe run:${s.run.id}`,
      `events ${s.run.id} after 0`,
    ]);
    expect(result.current.state.runs[0]?.events).toHaveLength(5);

    // The log grows; the broadcast carries only ids, so the transport fetches after its cursor.
    s.state.written = s.events.length;
    await act(async () => s.poke());
    expect(s.calls.at(-1)).toBe(`events ${s.run.id} after 5`);
    expect(result.current.state.runs[0]?.events.map((e) => e.seq)).toEqual(
      s.events.map((e) => e.seq),
    );
    // A poke with nothing new changes nothing and repeats nothing.
    await act(async () => s.poke());
    expect(result.current.state.runs[0]?.events).toHaveLength(s.events.length);

    await act(async () => result.current.send("Jeszcze jedno."));
    expect(s.calls.filter((c) => c.startsWith("create"))).toHaveLength(1);
  });

  it("a reload finds the server's conversation again and draws the turn", async () => {
    const s = server("happy-turn");
    s.held.set(`jadwigo.playground.chat.server.${LOCAL}`, SERVER);
    s.state.posted = true;
    window.sessionStorage.setItem("jadwigo.playground.chat.conversation", LOCAL);
    render(<ChatScreen transport={routesTransport(s.api, s.live, s.storage)} />);
    expect(await screen.findByText("Your lesson is ready on the right.")).toBeTruthy();
    expect(s.calls.slice(0, 3)).toEqual([
      `runs ${SERVER}`,
      `subscribe run:${s.run.id}`,
      `events ${s.run.id} after 0`,
    ]);
    expect(screen.getByText("Wersja 2")).toBeTruthy();
  });

  it("Stop cancels the conversation's last run", async () => {
    const s = server("reload-with-duplicates");
    s.held.set(`jadwigo.playground.chat.server.${LOCAL}`, SERVER);
    s.state.posted = true;
    const transport = routesTransport(s.api, s.live, s.storage);
    const { result } = renderHook(() => useConversation(transport, LOCAL));
    await settle();
    await act(async () => result.current.stop());
    expect(s.calls).toContain(`cancel ${s.run.id} true`);
  });

  it("a lesson-pane edit during a turn goes as a steer naming its questions (dl-z5ja.93)", async () => {
    const s = server("reload-with-duplicates");
    s.held.set(`jadwigo.playground.chat.server.${LOCAL}`, SERVER);
    s.state.posted = true;
    const transport = routesTransport(s.api, s.live, s.storage);
    const { result } = renderHook(() => useConversation(transport, LOCAL));
    await settle();
    await act(async () => result.current.edit("Rodzic prosi o zmianę w kroku s02: …", ["s02"]));
    expect(s.calls).toContain(
      `steer ${SERVER} lesson_edit s02 Rodzic prosi o zmianę w kroku s02: …`,
    );
  });

  it("carries a message's page as its context, and none when it has none (dl-uukj.47.12)", async () => {
    const s = server("happy-turn");
    const transport = routesTransport(s.api, s.live, s.storage);
    const { result } = renderHook(() => useConversation(transport, LOCAL));
    await settle();
    const learner_id = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
    await act(async () => result.current.send("Dodawanie do 20.", { learner_id }));
    expect(s.calls).toContain(`message ${SERVER} Dodawanie do 20. {"learner_id":"${learner_id}"}`);
    await act(async () => result.current.send("Jeszcze jedno."));
    expect(s.calls).toContain(`message ${SERVER} Jeszcze jedno.`);
  });

  it("puts a message's photos on it, none when it has none, and never any on a steer (dl-z5ja.11.16)", async () => {
    const s = server("happy-turn");
    const transport = routesTransport(s.api, s.live, s.storage);
    const { result } = renderHook(() => useConversation(transport, LOCAL));
    await settle();
    const photo = AttachmentId.parse(
      idOf(ID_PREFIXES.attachment, "00000000-0000-4000-8000-000000000001"),
    );
    await act(async () => result.current.send("Zadanie ze zdjęcia.", undefined, [photo]));
    expect(s.bodies.at(-1)).toMatchObject({ text: "Zadanie ze zdjęcia.", attachment_ids: [photo] });
    await act(async () => result.current.send("Bez zdjęcia.", undefined, []));
    expect(s.bodies.at(-1)).not.toHaveProperty("attachment_ids");

    // A steer body that somehow names photos still goes without them: the route refuses them there.
    const steer = {
      conversation_id: LOCAL,
      event_id: EventId.parse("00000000-0000-4000-8000-0000000000aa"),
      kind: "steer",
      source: "chat",
      text: "Teraz.",
      attachment_ids: [photo],
    } as SendBody;
    await act(async () => void (await transport.send(steer)));
    expect(s.bodies.at(-1)).toMatchObject({ kind: "steer", text: "Teraz." });
    expect(s.bodies.at(-1)).not.toHaveProperty("attachment_ids");
  });
});
