import { RunEvent } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import type { RunPhase } from "../phase.ts";
import { stepIds } from "./lessonFile.ts";
import { SAY_KEY } from "./lines.ts";
import { append, complete, lastAt } from "./logs.test-helpers.ts";
import { spineOf, titleOf } from "./spineOf.ts";
import type { SpineLine, TurnSpine } from "./types.ts";

const parsed = (name: string): RunEvent[] => {
  const log = RUN_LOGS.find((l) => l.name === name);
  if (log === undefined) throw new Error(`no golden log ${name}`);
  return log.events.map((e) => RunEvent.parse(e));
};

/** A golden log's events up to and including `seq` (all of them without one). */
const upTo = (name: string, seq?: number): RunEvent[] =>
  parsed(name).filter((e) => seq === undefined || e.seq <= seq);

/** Every line of the spine, stage lines first. */
const linesOf = (spine: TurnSpine): SpineLine[] => [
  ...spine.stages.flatMap((s) => s.lines),
  ...spine.looseLines,
];

/**
 * What must never reach the parent (S3, `dl-uukj.47.72`): the engine's messages, ids of any kind,
 * step ids, a call's `change` instruction, and the agent text a pass-through line may carry only when
 * the log holds it as the model's sentence, the parent's words or a bank set's title.
 */
function fences(events: readonly RunEvent[]) {
  const forbidden = new Set<string>();
  const sayable = new Set<string>();
  for (const e of events) {
    forbidden.add(e.event_id);
    switch (e.type) {
      case "error":
        forbidden.add(e.payload.error.message);
        break;
      case "tool_call":
        forbidden.add(e.payload.call_id);
        for (const [key, value] of Object.entries(e.payload.input))
          if (typeof value === "string" && (key.endsWith("_id") || key === "change"))
            forbidden.add(value);
        break;
      case "tool_result": {
        if (e.payload.error) forbidden.add(e.payload.error.message);
        const sets = e.payload.output?.["sets"];
        for (const set of Array.isArray(sets) ? sets : []) {
          forbidden.add(String(set.set_id));
          sayable.add(String(set.title));
        }
        const steps = e.payload.output?.["steps"];
        for (const step of Array.isArray(steps) ? steps : []) forbidden.add(String(step));
        break;
      }
      case "lesson_revision":
        for (const id of stepIds(e.payload.lesson_file)) forbidden.add(id);
        break;
      case "message":
      case "steer":
        sayable.add(e.payload.text.trim());
        break;
      default:
        break;
    }
  }
  return { forbidden, sayable };
}

/** Each prefix of a golden log, as the page sees it grow. */
const prefixes = (name: string): RunEvent[][] => {
  const events = parsed(name);
  return events.map((e) => events.filter((x) => x.seq <= e.seq));
};

describe("spineOf on every golden log, at every seq", () => {
  it.each(RUN_LOGS.map((log) => [log.name] as const))("%s keeps the fences", (name) => {
    for (const events of prefixes(name)) {
      const spine = spineOf(events, null, lastAt(events));
      const { forbidden, sayable } = fences(events);
      const lines = linesOf(spine);
      // One working indicator: at most one now line (D4).
      expect(lines.filter((l) => l.kind === "now").length).toBeLessThanOrEqual(1);
      for (const line of lines) {
        const words = [line, ...(line.tags ?? [])];
        for (const w of words) {
          for (const value of Object.values(w.values)) {
            expect(forbidden.has(String(value))).toBe(false);
            expect(String(value)).not.toMatch(/[{}]|"[a-z_]+":|^s\d{2}$/);
          }
          if (w.copyKey === SAY_KEY) expect(sayable.has(String(w.values["text"]))).toBe(true);
        }
        if (line.quote !== undefined) expect(sayable.has(line.quote)).toBe(true);
      }
      // A stage's summary is words too.
      for (const stage of spine.stages)
        for (const value of Object.values(stage.summary?.values ?? {}))
          expect(forbidden.has(String(value))).toBe(false);
      expect(spine.stepCount).toBe(
        new Set(events.flatMap((e) => (e.type === "tool_call" ? [e.payload.call_id] : []))).size,
      );
    }
  });
});

describe("long-turn (screen 13)", () => {
  it("draws one spine whose stages hold their calls, with no now line repeated", () => {
    for (const events of prefixes("long-turn")) {
      const spine = spineOf(events, null, lastAt(events));
      const lines = linesOf(spine);
      for (let i = 1; i < lines.length; i += 1) {
        const [a, b] = [lines[i - 1], lines[i]];
        if (a?.kind === "now" || b?.kind === "now")
          expect(JSON.stringify([a?.copyKey, a?.values])).not.toBe(
            JSON.stringify([b?.copyKey, b?.values]),
          );
      }
    }
  });

  it("re-opens the check stage a second time at seq 70 (s06)", () => {
    const events = upTo("long-turn", 70);
    const spine = spineOf(events, null, lastAt(events));
    expect(spine.stages.map((s) => [s.name, s.status, s.visit])).toEqual([
      ["Szukanie zadań w banku", "done", 1],
      ["Układanie lekcji", "done", 2],
      ["Sprawdzanie lekcji", "active", 2],
    ]);
    const open = spine.stages[2]?.lines ?? [];
    expect(open.at(-1)).toMatchObject({
      kind: "now",
      copyKey: SAY_KEY,
      values: { text: "Teraz bliźniacze zadanie do nowego pytania." },
    });
    // Both checks of the visit merge into one line (S2): the later one found 3 things.
    expect(open.filter((l) => l.copyKey.startsWith("chat_line_check"))).toEqual([
      { kind: "done", copyKey: "chat_line_check_found", values: { n: 2 } },
      { kind: "done", copyKey: "chat_line_check_found", values: { n: 3 } },
    ]);
  });

  it("merges one line per verb per stage visit (S2)", () => {
    const spine = spineOf(upTo("long-turn"), null, 0);
    const search = spine.stages[0]?.lines ?? [];
    // 2 searches, 1 line: the second's grade, the sets of both by id.
    expect(search).toHaveLength(1);
    expect(search[0]).toMatchObject({
      copyKey: "chat_line_search",
      values: { query: "mnożenie przez 10", grade: "2", n: 7 },
    });
    expect(search[0]?.tags?.map((t) => t.copyKey)).toEqual(Array(7).fill(SAY_KEY));
    for (const stage of spine.stages) {
      const visitVerbs = stage.lines.map((l) => l.copyKey);
      expect(visitVerbs.length).toBeLessThanOrEqual(2 * new Set(visitVerbs).size);
    }
  });

  it("folds at the end: every stage done, the reply, no now line (D4, D5)", () => {
    const spine = spineOf(upTo("long-turn"), null, 0);
    expect(spine.phase).toBe("done");
    expect(spine.stages.map((s) => s.status)).toEqual(["done", "done", "done"]);
    expect(spine.reply).toBe(
      "Dodałam zadanie z mnożeniem przez 10 i poprawiłam powitanie oraz krok z kropkami. Lekcja jest gotowa.",
    );
    expect(linesOf(spine).some((l) => l.kind === "now")).toBe(false);
    expect(spine.stepCount).toBe(18);
    expect(spine.endedAt).toBe(Date.parse("2026-09-01T09:03:38.000Z"));
    expect(spine.title).toEqual({ text: "Zawężę wyszukiwanie do drugiej klasy" });
  });

  it("reads a search with 7 sets at seq 7 (s09b) and no grade", () => {
    const spine = spineOf(upTo("long-turn", 7), null, 0);
    const [line] = spine.stages[0]?.lines ?? [];
    expect(line).toMatchObject({ copyKey: "chat_line_search_any", values: { n: 7 } });
    expect(line?.tags).toHaveLength(7);
  });
});

describe("failed-turn (screen 50)", () => {
  it("ends with the failed stage, hollow todo stages and a foot with tries 3 (D7, s13)", () => {
    const spine = spineOf(upTo("failed-turn"), null, 0);
    expect(spine.phase).toBe("failed");
    expect(spine.stages.map((s) => s.status)).toEqual(["done", "failed", "todo"]);
    expect(spine.stages[1]?.summary).toEqual({
      copyKey: "chat_stage_failed_sum",
      values: { n: 3 },
    });
    expect(spine.foot).toEqual({ kind: "failed", tries: 3 });
    expect(spine.reply).toBeUndefined();
  });

  it("shows one quiet retry line while the step is redelivered (S5, s11)", () => {
    const spine = spineOf(upTo("failed-turn", 23), null, 0);
    const retries = linesOf(spine).filter((l) => l.kind === "retry");
    expect(retries).toEqual([
      { kind: "retry", copyKey: "chat_line_retry", values: { stage: "Układanie lekcji" } },
    ]);
  });

  it("shows a recovered failure only after the turn (S13, s12)", () => {
    const skipped = (seq?: number) =>
      linesOf(spineOf(upTo("failed-turn", seq), null, 0)).filter((l) => l.kind === "skip");
    expect(skipped(20)).toEqual([]);
    expect(skipped()).toEqual([{ kind: "skip", copyKey: "chat_line_recovered_types", values: {} }]);
  });

  it("says a failure nothing recovered from in plain words, never the engine's (dl-uukj.47.72)", () => {
    const events = complete(upTo("failed-turn", 10));
    const lines = linesOf(spineOf(events, null, 0));
    expect(lines).toContainEqual({ kind: "skip", copyKey: "chat_line_failed_generic", values: {} });
  });
});

describe("the run's states", () => {
  const planAndCite = upTo("plan-and-cite", 6);

  it("adds the slow line at 20 s and the stalled foot at 60 s (S11, s04, s05)", () => {
    const slow = spineOf(planAndCite, null, lastAt(planAndCite, 25_000));
    expect(slow.phase).toBe("slow");
    expect(slow.stages[0]?.lines.at(-1)).toEqual({
      kind: "slow",
      copyKey: "chat_slow_line",
      values: {},
    });
    expect(slow.foot).toBeUndefined();
    const stalled = spineOf(planAndCite, null, lastAt(planAndCite, 65_000));
    expect(stalled.foot).toEqual({ kind: "stalled" });
  });

  it("takes the page's phase over the log's", () => {
    const phase: RunPhase = {
      kind: "stalled",
      copyKey: "chat_phase_stalled",
      since: 0,
      open: true,
      run: null,
    };
    expect(spineOf(planAndCite, phase, lastAt(planAndCite)).foot).toEqual({ kind: "stalled" });
  });

  it("waits on the parent with the person mark and the line below (S12, s10)", () => {
    const spine = spineOf(upTo("plan-and-cite", 12), null, 0);
    expect(spine.phase).toBe("awaiting_input");
    expect(spine.stages[0]?.status).toBe("waiting");
    expect(spine.stages[0]?.lines.at(-1)).toEqual({
      kind: "wait",
      copyKey: "chat_line_waiting",
      values: {},
    });
  });

  it("names the running call when the model said nothing (S10, s03)", () => {
    const spine = spineOf(planAndCite, null, lastAt(planAndCite));
    expect(spine.stages[0]?.lines.at(-1)).toMatchObject({
      kind: "now",
      copyKey: "chat_tool_question_search",
      startedAt: Date.parse("2026-09-01T08:00:06.000Z"),
    });
  });

  it("keeps the now line's clock when the model says the same again (S2)", () => {
    const events = append(
      upTo("long-turn", 49),
      { type: "message", payload: { from: "agent", text: "Sprawdzę teraz całą lekcję." } },
      { type: "message", payload: { from: "agent", text: "Sprawdzę teraz całą lekcję." } },
    );
    const spine = spineOf(events, null, lastAt(events));
    const now = linesOf(spine).filter((l) => l.kind === "now");
    expect(now).toHaveLength(1);
    expect(now[0]?.startedAt).toBe(lastAt(events) - 2000);
  });

  it("stops with the version that stands (S15, s14)", () => {
    expect(spineOf(upTo("cancel-during-a-verb"), null, 0).foot).toEqual({
      kind: "stopped",
      changed: true,
      versionStands: 1,
    });
    const nothing = parsed("cancel-during-a-verb").filter((e) => e.type !== "lesson_revision");
    expect(spineOf(nothing, null, 0, { priorRevision: 4 }).foot).toEqual({
      kind: "stopped",
      changed: false,
      versionStands: 4,
    });
  });

  it("marks the running stage stopped", () => {
    const events = append(upTo("long-turn", 70), {
      type: "status",
      payload: { status: "cancelled" },
    });
    const spine = spineOf(events, null, 0);
    expect(spine.stages[2]).toMatchObject({
      status: "stopped",
      summary: { copyKey: "chat_stage_stopped_sum", values: {} },
    });
  });
});

describe("steers (S17)", () => {
  it("draws a chat steer in quotes and a lesson-pane steer by its label (s18)", () => {
    const steers = linesOf(spineOf(upTo("steer-kept", 9), null, 0)).filter(
      (l) => l.kind === "steer",
    );
    expect(steers).toEqual([
      {
        kind: "steer",
        copyKey: SAY_KEY,
        values: { text: "Shorter, please: 5 questions." },
        steerLabel: true,
        quote: "Shorter, please: 5 questions.",
      },
      { kind: "steer", copyKey: "chat_steered_edit", values: {} },
    ]);
  });

  it("reads a photo-only follow-up by its photo count (dl-uukj.47.70)", () => {
    const events = append(upTo("happy-turn", 7), {
      type: "message",
      payload: {
        from: "parent",
        text: "",
        attachments: [1, 2].map((n) => ({
          attachment_id: `atch_${String(n).padStart(26, "0")}`,
          storage_path: `pod/att/${n}.jpg`,
          media_type: "image/jpeg" as const,
          bytes: 100,
          width: 10,
          height: 10,
        })),
      },
    } as Parameters<typeof append>[1]);
    const steer = linesOf(spineOf(events, null, 0)).find((l) => l.kind === "steer");
    expect(steer).toEqual({
      kind: "steer",
      copyKey: "chat_steer_photos",
      values: { n: 2 },
      steerLabel: true,
    });
  });
});

describe("the header", () => {
  it("has no stage rows under 3 stages: the lines go under the header (§2 item 2)", () => {
    const spine = spineOf(upTo("happy-turn"), null, 0);
    expect(spine.stages).toEqual([]);
    expect(spine.looseLines.map((l) => l.copyKey)).toEqual([
      "chat_line_draft",
      "chat_line_check_ok",
    ]);
  });

  it("says the phase until the model says a sentence that is not the reply (S9, S10)", () => {
    expect(spineOf(upTo("happy-turn", 1), null, 0).title).toEqual({
      copyKey: "chat_phase_queued",
      values: {},
    });
    expect(spineOf(upTo("happy-turn"), null, 0).title).toEqual({
      copyKey: "chat_phase_done",
      values: {},
    });
  });

  it("trims the title to its first clause, at most 60 characters (§2 item 1)", () => {
    expect(titleOf("Zajrzę do lekcji, żeby wiedzieć, gdzie dodać zadanie.")).toBe(
      "Zajrzę do lekcji",
    );
    const long = titleOf(`${"słowo ".repeat(20)}koniec`);
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("…")).toBe(true);
  });
});
