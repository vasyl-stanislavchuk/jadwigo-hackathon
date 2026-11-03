import { RunEvent } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { cardStateOf, cardStatesOf } from "./card.ts";
import { checkOf } from "./lines.ts";
import { complete } from "./logs.test-helpers.ts";

const parsed = (name: string): RunEvent[] => {
  const log = RUN_LOGS.find((l) => l.name === name);
  if (log === undefined) throw new Error(`no golden log ${name}`);
  return log.events.map((e) => RunEvent.parse(e));
};

/** A golden log's events up to and including `seq` (all of them without one). */
const upTo = (name: string, seq?: number): RunEvent[] =>
  parsed(name).filter((e) => seq === undefined || e.seq <= seq);

describe("cardStateOf (S16)", () => {
  it("is ready when the last check passed and the lesson has questions (s15)", () => {
    expect(cardStateOf(upTo("happy-turn"))).toMatchObject({
      kind: "ready",
      version: 2,
      title: "Równe grupy",
      count: 4,
    });
    expect(cardStateOf(upTo("long-turn"))).toMatchObject({ kind: "ready", version: 12 });
  });

  it("is fix with the check's findings by step place when the check failed (s16)", () => {
    const card = cardStateOf(complete(upTo("long-turn", 36)));
    expect(card).toMatchObject({ kind: "fix", version: 5 });
    expect(card?.kind === "fix" ? card.findings : null).toEqual([
      { step: 4, words: { copyKey: "chat_check_level_error", values: {} } },
      { step: 2, words: { copyKey: "chat_check_level_error", values: {} } },
    ]);
  });

  it("is fix when the lesson changed after its check, or was never checked", () => {
    expect(cardStateOf(complete(upTo("long-turn", 49)))).toMatchObject({
      kind: "fix",
      findings: [],
    });
    expect(cardStateOf(complete(upTo("happy-turn", 7)))).toMatchObject({ kind: "fix" });
  });

  it("is fix, never '0 zadań', when no step can be shown (dl-uukj.47.69)", () => {
    const empty = parsed("happy-turn").map((e) =>
      e.type === "lesson_revision"
        ? ({
            ...e,
            payload: { ...e.payload, lesson_file: { id: "x", title: "T", script: { parts: [] } } },
          } as RunEvent)
        : e,
    );
    expect(cardStateOf(empty)).toMatchObject({ kind: "fix", count: 0 });
  });

  it("is working while its turn is open (s06)", () => {
    expect(cardStateOf(upTo("long-turn", 70))).toMatchObject({
      kind: "working",
      version: 8,
      nextVersion: 9,
    });
  });

  it("is null for a turn that wrote no lesson", () => {
    expect(cardStateOf(upTo("plan-and-cite"))).toBeNull();
    expect(cardStateOf(upTo("failed-turn"))).toBeNull();
  });

  it("is never ready over a failed check or 0 steps, on any golden log at any seq", () => {
    for (const log of RUN_LOGS) {
      const events = parsed(log.name);
      for (const e of events) {
        const prefix = complete(events.filter((x) => x.seq <= e.seq));
        const card = cardStateOf(prefix);
        if (card?.kind !== "ready") continue;
        expect(card.count).toBeGreaterThan(0);
        const check = prefix.findLast(
          (x): x is Extract<RunEvent, { type: "tool_result" }> =>
            x.type === "tool_result" && x.payload.verb === "lesson_check",
        );
        expect(checkOf(check?.payload.output)?.publishable).toBe(true);
      }
    }
  });
});

describe("cardStatesOf (S7)", () => {
  it("keeps one living card, in the newest turn with the latest revision", () => {
    const states = cardStatesOf([upTo("happy-turn"), upTo("long-turn")]);
    expect(states.map((s) => s?.kind)).toEqual(["superseded", "ready"]);
  });

  it("makes the living card working while a later turn is open", () => {
    const states = cardStatesOf([upTo("long-turn"), upTo("plan-and-cite", 6)]);
    expect(states.map((s) => s?.kind)).toEqual(["working", undefined]);
    expect(states[0]).toMatchObject({ version: 12, nextVersion: 13 });
  });

  it("leaves the newest card living when a later turn holds only the parent's patch", () => {
    const patched: RunEvent[] = parsed("happy-turn").map((e) =>
      e.type === "lesson_revision"
        ? ({ ...e, payload: { ...e.payload, revision: 3 } } as RunEvent)
        : e,
    );
    const onlyPatch = patched.filter((e) => e.type !== "tool_call" && e.type !== "tool_result");
    const states = cardStatesOf([upTo("happy-turn"), onlyPatch]);
    expect(states.map((s) => s?.kind)).toEqual(["ready", undefined]);
  });
});
