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
import { cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyPatch,
  dropPatch,
  movePatch,
  patchOutcome,
  revertPatch,
  wordsOf,
  wordsPatch,
} from "./patches.ts";
import { type RunLive, routesTransport } from "./routesTransport.ts";
import type { EngineTransport } from "./useConversation.ts";
import type { SendBody } from "./wire.ts";

afterEach(cleanup);

const eventsOf = (name: string): RunEvent[] =>
  (RUN_LOGS.find((l) => l.name === name)?.events ?? []).map((e) => RunEvent.parse(e));

/** Opens a step's row: its editor and actions sit in the opened step (dl-z5ja.108.1). */
const _openStep = (step: string) =>
  fireEvent.click(document.querySelector(`[data-step='${step}'] [aria-expanded]`) as HTMLElement);

/** The happy turn's last lesson file: an ended turn, revision 2. */
const lessonFile = () => {
  const lesson = foldRun(eventsOf("happy-turn")).lesson;
  if (lesson === null) throw new Error("no lesson");
  return lesson.lesson_file;
};

/** A transport over one golden log, which records what the page sends. */
function _transportOf(events: readonly RunEvent[]) {
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
    // A later turn's revision past the base: the conversation moved on, so it never lands.
    const later = revisionFor([...events, steer], ok, 3);
    expect(patchOutcome([{ events: [...events, steer] }, { events: [later] }], id)).toBe("refused");
    // A steer logged without its patch (a route that dropped it) is never applied.
    const dropped = {
      ...body(ok, 2),
      patch: undefined,
      base_revision: undefined,
    } as unknown as SendBody;
    expect(patchOutcome([{ events: [...events, steerFor(events, dropped)] }], id)).toBe("refused");
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

/** The ids of the file's steps in order, teaching steps included. */
const order = (file: unknown): string[] =>
  (file as { script: { parts: { steps: { id: string }[] }[] } }).script.parts.flatMap((p) =>
    p.steps.map((s) => s.id),
  );

describe("a step moved or removed by the parent (dl-z5ja.108.1)", () => {
  it("a move swaps the step with the next question that way, stepping over teaching steps", () => {
    const file = lessonFile();
    expect(order(file)).toEqual(["s01", "s02", "s03", "s05", "s06", "s07", "s08"]);
    // s03 is a teaching step: s05 up lands where s02 was.
    expect(order(applyPatch(file, movePatch(file, "s05", -1)))).toEqual([
      "s01",
      "s05",
      "s03",
      "s02",
      "s06",
      "s07",
      "s08",
    ]);
    expect(order(applyPatch(file, movePatch(file, "s06", 1)))).toEqual([
      "s01",
      "s02",
      "s03",
      "s05",
      "s07",
      "s06",
      "s08",
    ]);
    // Nowhere to go: the first question up, the last down, a step not in the file.
    expect(movePatch(file, "s02", -1)).toBeNull();
    expect(movePatch(file, "s07", 1)).toBeNull();
    expect(movePatch(file, "s99", 1)).toBeNull();
  });

  it("a removal takes only that step out, and never the lesson's last", () => {
    const file = lessonFile();
    expect(order(applyPatch(file, dropPatch(file, "s05")))).toEqual([
      "s01",
      "s02",
      "s03",
      "s06",
      "s07",
      "s08",
    ]);
    expect(dropPatch(file, "s99")).toBeNull();
    const one = { script: { parts: [{ part: "a", steps: [{ id: "s01" }] }] } };
    expect(dropPatch(one, "s01")).toBeNull();
  });
});
