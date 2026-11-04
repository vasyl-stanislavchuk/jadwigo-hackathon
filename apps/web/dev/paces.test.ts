// The dev engine's paces (dl-uukj.47.71.7): each plays the log its chat state needs, on the real
// engine (acceptMessage, drain, ScriptedMuse, InMemoryStore) with no network. chat-spine.spec.ts
// draws these logs in a browser; this checks the logs themselves, so a pace that stops reaching
// its state fails here first.
import * as contracts from "@jadwigo/contracts";
import type { RunEvent } from "@jadwigo/contracts/run";
import * as run from "@jadwigo/contracts/run";
import * as engine from "@jadwigo/jadwigo-ai";
import * as store from "@jadwigo/store";
import { describe, expect, it } from "vitest";
import { newConversationId } from "../src/chat/ids.ts";
import type { Pace } from "../src/chat/wire.ts";
import { devEngine } from "./engine-plugin.ts";

const modules = { contracts, run, engine, store };

/** A fresh engine with nobody listening, and a conversation sent one message at a pace. */
async function play(pace: Pace | null) {
  const errors: string[] = [];
  const dev = devEngine({ push: () => {}, error: (e) => errors.push(e) }, modules);
  const conversation = newConversationId();
  const send = (body: Record<string, unknown>) =>
    dev.send(
      {
        conversation_id: conversation,
        event_id: crypto.randomUUID(),
        ...body,
      } as Parameters<typeof dev.send>[0],
      pace,
    );
  const { run: started } = await send({ kind: "message", text: "Dodawanie do 20 dla 1 klasy." });
  const log = async (): Promise<RunEvent[]> => (await dev.events(started.id, 0)).events;
  /** Waits for the log to hold what `seen` asks, or fails after `ms`. */
  const until = async (seen: (events: RunEvent[]) => boolean, ms = 15_000) => {
    const end = performance.now() + ms;
    for (;;) {
      const events = await log();
      if (seen(events)) return events;
      if (performance.now() > end)
        throw new Error(`never saw it: ${types(events).join(" ")}; ${errors.join(" | ")}`);
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  return { send, log, until, errors };
}

const types = (events: RunEvent[]) =>
  events.map((e) =>
    e.type === "tool_call" || e.type === "tool_result" ? `${e.type}:${e.payload.verb}` : e.type,
  );
const ended = (events: RunEvent[]) => events.some((e) => e.type === "turn_complete");
const statusOf = (events: RunEvent[]) =>
  events.findLast((e) => e.type === "status")?.payload.status;
const callsOf = (events: RunEvent[], verb: string) =>
  events.filter((e) => e.type === "tool_call" && e.payload.verb === verb);
const resultsOf = (events: RunEvent[], verb: string) =>
  events.filter((e) => e.type === "tool_result" && e.payload.verb === verb);

describe("the dev engine's paces (dl-uukj.47.71.7)", () => {
  it("normal and s15: draft, check, ready, the turn completed", async () => {
    const p = await play("s15");
    const events = await p.until(ended);
    expect(statusOf(events)).toBe("completed");
    expect(resultsOf(events, "lesson_check")).toHaveLength(1);
    expect(events.some((e) => e.type === "lesson_revision")).toBe(true);
    expect(p.errors).toEqual([]);
  });

  it("s01/s02: the parent's words and in_progress, then the model never answers", async () => {
    const p = await play("s02");
    await p.until((e) => statusOf(e) === "in_progress");
    await new Promise((r) => setTimeout(r, 600));
    const events = await p.log();
    expect(events.some((e) => e.type === "model_response")).toBe(false);
    expect(ended(events)).toBe(false);
  });

  it("s03: the plan with the find stage done and the draft running, never answered", async () => {
    const p = await play("s03");
    const events = await p.until((e) => callsOf(e, "lesson_draft").length === 1);
    await new Promise((r) => setTimeout(r, 600));
    const later = await p.log();
    expect(resultsOf(later, "question_search")).toHaveLength(1);
    expect(resultsOf(later, "lesson_draft")).toHaveLength(0);
    expect(later.findLast((e) => e.type === "plan")?.payload.entries.map((s) => s.status)).toEqual([
      "done",
      "in_progress",
      "pending",
    ]);
    expect(ended(later)).toBe(false);
    expect(events.length).toBeGreaterThan(0);
  });

  it("s14: the check held, then stopped by the parent, ends cancelled with the lesson kept", async () => {
    const p = await play("s14");
    await p.until((e) => callsOf(e, "lesson_check").length === 1);
    await p.send({ kind: "cancel" });
    const events = await p.until(ended);
    expect(statusOf(events)).toBe("cancelled");
    expect(events.some((e) => e.type === "lesson_revision")).toBe(true);
  });

  it("s06: the check running a second time, held there", async () => {
    const p = await play("s06");
    await p.until((e) => callsOf(e, "lesson_check").length === 2);
    await new Promise((r) => setTimeout(r, 600));
    const events = await p.log();
    expect(resultsOf(events, "lesson_check")).toHaveLength(1);
    expect(resultsOf(events, "lesson_edit")).toHaveLength(2);
    expect(ended(events)).toBe(false);
  });

  it("s07/s09: the long turn completes, its check run twice", async () => {
    const p = await play("s09");
    const events = await p.until(ended, 20_000);
    expect(statusOf(events)).toBe("completed");
    expect(resultsOf(events, "lesson_check")).toHaveLength(2);
    expect(resultsOf(events, "question_search")).toHaveLength(1);
  });

  it("s11: a model call fails once, its step comes back as a retry, then the check runs", async () => {
    const p = await play("s11");
    const events = await p.until((e) => callsOf(e, "lesson_check").length === 1);
    expect(events.filter((e) => e.type === "error")).toHaveLength(1);
    expect(ended(events)).toBe(false);
  });

  it("s12: question_types refused once, then the lesson is built without it", async () => {
    const p = await play("s12");
    const events = await p.until(ended);
    expect(statusOf(events)).toBe("completed");
    const types = resultsOf(events, "question_types").map((e) =>
      e.type === "tool_result" ? e.payload.error === null : null,
    );
    expect(types).toEqual([false]);
    expect(resultsOf(events, "lesson_draft")).toHaveLength(1);
  });

  it("s12-fixed: an edit refused once, then the same edit goes through", async () => {
    const p = await play("s12-fixed");
    const events = await p.until(ended);
    expect(statusOf(events)).toBe("completed");
    const edits = resultsOf(events, "lesson_edit").map((e) =>
      e.type === "tool_result" ? e.payload.error === null : null,
    );
    expect(edits).toEqual([false, true]);
  });

  it("s12-dropped: an edit refused and never tried again, and no check passes after it", async () => {
    const p = await play("s12-dropped");
    const events = await p.until(ended);
    const edits = resultsOf(events, "lesson_edit").map((e) =>
      e.type === "tool_result" ? [e.payload.error === null, e.payload.call_id] : null,
    );
    // s01's edit is refused, s02's goes through; nothing edits s01 again.
    expect(edits.map((e) => e?.[0])).toEqual([false, true]);
    // The engine may check the lesson by itself (#858); no check after the refusal passes.
    const passed = resultsOf(events, "lesson_check").filter((e) => {
      if (e.type !== "tool_result") return false;
      const view = e.payload.view?.data as { publishable?: boolean } | undefined;
      return view?.publishable === true;
    });
    expect(passed).toEqual([]);
  });

  it("s13: the turn ends failed", async () => {
    const p = await play("s13");
    const events = await p.until(ended);
    expect(statusOf(events)).toBe("failed");
  });

  it("s16: the last check finds a step to fix", async () => {
    const p = await play("s16");
    const events = await p.until(ended);
    const checked = resultsOf(events, "lesson_check").at(-1);
    const view = checked?.type === "tool_result" ? checked.payload.view?.data : undefined;
    expect((view as { publishable?: boolean } | undefined)?.publishable).toBe(false);
  });
});
