import { RunEvent, type VerbName } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import type { RunPhase } from "../phase.ts";
import { stepIds } from "./lessonFile.ts";
import { SAY_KEY } from "./lines.ts";
import { append, complete, cutAt, engineOrder, lastAt } from "./logs.test-helpers.ts";
import { spineOf, titleOf } from "./spineOf.ts";
import type { SpineLine, TurnSpine } from "./types.ts";

/** A golden log as it is written: the plan that starts a stage comes before the stage's call. */
const golden = (name: string): RunEvent[] => {
  const log = RUN_LOGS.find((l) => l.name === name);
  if (log === undefined) throw new Error(`no golden log ${name}`);
  return log.events.map((e) => RunEvent.parse(e));
};

/**
 * Every spine test runs on both orders: the golden logs' own, and the engine's, which writes a call
 * before the plan event that starts its stage (dl-uukj.47.71.36).
 */
const ORDERS: readonly (readonly [string, ((events: readonly RunEvent[]) => RunEvent[]) | null])[] =
  [
    ["the golden log's order", null],
    ["the engine's order", engineOrder],
  ];

/**
 * An edit's done line: its words with the questions it changed, or the verb's own sentence when a
 * step it changed is no question, which has no number (dl-uukj.47.71.32).
 */
const isEdit = (line: SpineLine): boolean =>
  line.kind === "done" &&
  (line.copyKey.startsWith("chat_line_edit") || line.copyKey === "chat_tool_lesson_edit");

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

describe.each(ORDERS)("in %s", (_order, order) => {
  /** The golden log in this order. */
  const parsed = (name: string): RunEvent[] =>
    order === null ? golden(name) : order(golden(name));

  /**
   * A golden log's events up to and including its event at `seq` (all of them without one), in this
   * order: the engine's holds back a stage's start until its call, so the cut is at the same event.
   */
  const upTo = (name: string, seq?: number): RunEvent[] => {
    if (seq === undefined) return parsed(name);
    if (order === null) return golden(name).filter((e) => e.seq <= seq);
    const at = golden(name).find((e) => e.seq === seq);
    if (at === undefined) throw new Error(`${name} has no seq ${seq}`);
    return cutAt(order(golden(name)), at.event_id);
  };

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

    it("re-opens the check stage a second time at seq 70, the edits inside it (s06)", () => {
      const events = upTo("long-turn", 70);
      const spine = spineOf(events, null, lastAt(events));
      expect(spine.stages.map((s) => [s.name, s.status, s.visit])).toEqual([
        ["Szukanie zadań w banku", "done", 1],
        ["Układanie lekcji", "done", 2],
        ["Sprawdzanie lekcji", "active", 2],
      ]);
      const open = spine.stages[2]?.lines ?? [];
      expect(open.some(isEdit)).toBe(true);
      expect(open.at(-1)).toMatchObject({
        kind: "now",
        copyKey: SAY_KEY,
        values: { text: "Teraz bliźniacze zadanie do nowego pytania." },
      });
      // The first check's line and the second's, which found 3 things.
      const checks = open;
      expect(checks.filter((l) => l.copyKey.startsWith("chat_line_check"))).toEqual([
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
      // One edit line per visit (S2): 2 drafting visits, then the edits of the re-check as one.
      const edits = (i: number) => spine.stages[i]?.lines.filter(isEdit) ?? [];
      expect([edits(1).length, edits(2).length]).toEqual([2, 1]);
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
      expect(skipped()).toEqual([
        { kind: "skip", copyKey: "chat_line_recovered_types", values: {} },
      ]);
    });

    it("says a failure nothing recovered from in plain words, never the engine's (dl-uukj.47.72)", () => {
      const events = complete(upTo("failed-turn", 10));
      const lines = linesOf(spineOf(events, null, 0));
      expect(lines).toContainEqual({
        kind: "skip",
        copyKey: "chat_line_failed_generic",
        values: {},
      });
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

    it("stops saying whether the turn changed the lesson, never a version (S15, s14, dl-vxjv2)", () => {
      expect(spineOf(upTo("cancel-during-a-verb"), null, 0).foot).toEqual({
        kind: "stopped",
        changed: true,
      });
      const nothing = parsed("cancel-during-a-verb").filter((e) => e.type !== "lesson_revision");
      expect(spineOf(nothing, null, 0).foot).toEqual({ kind: "stopped", changed: false });
    });

    it("marks the running stage stopped", () => {
      const events = append(upTo("long-turn", 70), {
        type: "status",
        payload: { status: "cancelled" },
      });
      const spine = spineOf(events, null, 0);
      // The edit at work when the turn stopped is the re-check's.
      expect(spine.stages.map((s) => s.status)).toEqual(["done", "done", "stopped"]);
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
});

/** A turn the way the engine writes it (jadwigo-ai run-step.ts), from the parent's message on. */
describe("the engine's own sequences", () => {
  const NAMES = ["Szukanie zadań w banku", "Układanie lekcji", "Sprawdzanie lekcji"] as const;
  type Mark = "pending" | "in_progress" | "done" | "failed";
  type Body = Parameters<typeof append>[1];
  const plan = (...marks: [Mark, Mark, Mark]): Body => ({
    type: "plan",
    payload: { entries: NAMES.map((text, i) => ({ text, status: marks[i] ?? "pending" })) },
  });
  const say = (text: string): Body => ({ type: "message", payload: { from: "agent", text } });
  const call = (call_id: string, verb: VerbName, input: Record<string, unknown>): Body => ({
    type: "tool_call",
    payload: { call_id, verb, input },
  });
  const result = (call_id: string, verb: VerbName, output: Record<string, unknown>): Body => ({
    type: "tool_result",
    payload: { call_id, verb, output, error: null },
  });
  const ending = (status: "completed" | "cancelled", ...marks: [Mark, Mark, Mark]): Body[] => [
    plan(...marks),
    { type: "status", payload: { status } },
    { type: "turn_complete", payload: {} },
  ];
  const start = (): RunEvent[] =>
    append(
      golden("happy-turn").slice(0, 1),
      { type: "status", payload: { status: "in_progress" } },
      plan("pending", "pending", "pending"),
    );
  /** Found sets, then the draft called: both stages run, the check never starts. */
  const searchedAndDrafted: Body[] = [
    say("Szukam zadań o tym w banku."),
    call("call_1", "question_search", { query: "dodawanie", grade: "1" }),
    plan("in_progress", "pending", "pending"),
    result("call_1", "question_search", { sets: [] }),
    plan("done", "pending", "pending"),
    say("Układam lekcję z tych zadań."),
    call("call_2", "lesson_draft", { topic: "dodawanie" }),
    plan("done", "in_progress", "pending"),
    result("call_2", "lesson_draft", { draft_id: "drf_demo" }),
    plan("done", "done", "pending"),
  ];

  it("puts each call in its own stage, the stage starting after the call (dl-uukj.47.71.36)", () => {
    const spine = spineOf(append(start(), ...searchedAndDrafted), null, 0);
    expect(spine.stages.map((s) => [s.status, s.lines.map((l) => l.copyKey)])).toEqual([
      ["done", ["chat_line_search"]],
      ["done", ["chat_tool_lesson_draft_about"]],
      // Between calls the plan's next stage is the open one.
      ["active", []],
    ]);
  });

  /** After the draft: a check that finds a thing, an edit, and the check again, as the engine
   * writes it: no plan event re-opens a done stage (jadwigo-ai plan.ts `movePlan`). */
  const fixedAndCheckedAgain: Body[] = [
    say("Sprawdzam lekcję."),
    call("call_3", "lesson_check", {}),
    plan("done", "done", "in_progress"),
    result("call_3", "lesson_check", {
      publishable: false,
      findings: [{ step_id: null, level: "error" }],
    }),
    plan("done", "done", "done"),
    say("Poprawiam podpowiedź."),
    call("call_4", "lesson_edit", { step_id: "s01" }),
    result("call_4", "lesson_edit", { changed_step_ids: ["s01"] }),
    say("Sprawdzam lekcję jeszcze raz."),
    call("call_5", "lesson_check", {}),
  ];

  it("draws s06 in the engine's order: edits after a check open its second visit, and the check again continues it (dl-uukj.47.71.36)", () => {
    const events = append(start(), ...searchedAndDrafted, ...fixedAndCheckedAgain);
    const spine = spineOf(events, null, lastAt(events));
    expect(spine.stages.map((s) => [s.name, s.status, s.visit])).toEqual([
      ["Szukanie zadań w banku", "done", 1],
      ["Układanie lekcji", "done", 1],
      ["Sprawdzanie lekcji", "active", 2],
    ]);
    // "Sprawdzanie lekcji · drugi raz": the first check's line, the fix, then the check again.
    expect(spine.stages[2]?.lines.map((l) => [l.kind, l.copyKey])).toEqual([
      ["done", "chat_line_check_found"],
      ["done", "chat_tool_lesson_edit"],
      ["now", SAY_KEY],
    ]);
    expect(spine.stages[2]?.lines.at(-1)?.values).toEqual({
      text: "Sprawdzam lekcję jeszcze raz.",
    });
  });

  it("counts one visit for consecutive work in a stage, and a new one only on coming back", () => {
    // The fix and the check after it: one visit, the second, never a third.
    const checked = append(start(), ...searchedAndDrafted, ...fixedAndCheckedAgain);
    const done = append(
      checked,
      result("call_5", "lesson_check", { publishable: true, findings: [] }),
    );
    expect(spineOf(done, null, lastAt(done)).stages[2]?.visit).toBe(2);
    // An edit made while the lesson is drafted stays under Układanie lekcji, in its own visit.
    const drafting = append(
      start(),
      ...searchedAndDrafted.slice(0, 9),
      call("call_6", "lesson_edit", { step_id: "s01" }),
      result("call_6", "lesson_edit", { changed_step_ids: ["s01"] }),
      ...searchedAndDrafted.slice(9),
    );
    const spine = spineOf(drafting, null, 0);
    expect(spine.stages[1]).toMatchObject({ name: "Układanie lekcji", visit: 1 });
    expect(spine.stages[1]?.lines.map((l) => l.copyKey)).toEqual([
      "chat_tool_lesson_draft_about",
      "chat_tool_lesson_edit",
    ]);
  });

  it("reads a lesson_show between stages in the stage the plan opens next, which the draft continues", () => {
    const events = append(
      start(),
      ...searchedAndDrafted.slice(0, 5),
      call("call_9", "lesson_show", {}),
      result("call_9", "lesson_show", { steps: ["s01", "s02"] }),
      ...searchedAndDrafted.slice(5),
    );
    const spine = spineOf(events, null, 0);
    expect(spine.stages.map((s) => [s.visit, s.lines.map((l) => l.copyKey)])).toEqual([
      [1, ["chat_line_search"]],
      [1, ["chat_line_read", "chat_tool_lesson_draft_about"]],
      [1, []],
    ]);
  });

  it("places a model reply's 2 calls in their own stages, run one after the other", () => {
    const events = append(
      start(),
      call("call_1", "question_search", { query: "dodawanie", grade: "1" }),
      call("call_2", "lesson_draft", { topic: "dodawanie" }),
      plan("in_progress", "pending", "pending"),
      result("call_1", "question_search", { sets: [] }),
      plan("done", "pending", "pending"),
      plan("done", "in_progress", "pending"),
      result("call_2", "lesson_draft", { draft_id: "drf_demo" }),
      plan("done", "done", "pending"),
    );
    const spine = spineOf(events, null, 0);
    expect(spine.stages.map((s) => s.lines.map((l) => l.copyKey))).toEqual([
      ["chat_line_search"],
      ["chat_tool_lesson_draft_about"],
      [],
    ]);
  });

  it("puts a retry or a steer made between stages in the stage that starts next (s11, s18)", () => {
    const events = append(
      start(),
      ...searchedAndDrafted.slice(0, 5),
      {
        type: "error",
        payload: {
          error: { type: "StepTimedOut", message: "the step ran past its visibility timeout" },
          attempt: 1,
          retryable: true,
        },
      },
      {
        type: "error",
        payload: {
          error: { type: "StepTimedOut", message: "the step ran past its visibility timeout" },
          attempt: 2,
          retryable: true,
        },
      },
      { type: "steer", payload: { text: "Dodaj jeszcze 2 zadania.", source: "chat" } },
      call("call_2", "lesson_draft", { topic: "dodawanie" }),
      plan("done", "in_progress", "pending"),
    );
    const spine = spineOf(events, null, lastAt(events));
    const [found, drafting] = spine.stages;
    expect(found?.lines.map((l) => l.kind)).toEqual(["done"]);
    expect(drafting?.status).toBe("active");
    expect(drafting?.lines.map((l) => l.kind)).toEqual(["retry", "steer", "now"]);
    expect(drafting?.lines[0]).toEqual({
      kind: "retry",
      copyKey: "chat_line_retry",
      values: { stage: "Układanie lekcji" },
    });
  });

  it("reads the engine's end-of-turn settle as no news: a completed turn has no failed stage (dl-uukj.47.71.37)", () => {
    const events = append(
      start(),
      ...searchedAndDrafted,
      say("Lekcja jest gotowa."),
      ...ending("completed", "done", "done", "failed"),
    );
    const spine = spineOf(events, null, 0);
    expect(spine.stages.map((s) => s.status)).toEqual(["done", "done", "todo"]);
    expect(spine.stages.some((s) => s.summary?.copyKey === "chat_stage_failed_sum")).toBe(false);
    expect(spine.reply).toBe("Lekcja jest gotowa.");
  });

  it("stops in the running stage with the square and leaves the rest hollow (S15, dl-uukj.47.71.37)", () => {
    const events = append(
      start(),
      ...searchedAndDrafted.slice(0, 5),
      say("Układam lekcję z tych zadań."),
      call("call_2", "lesson_draft", { topic: "dodawanie" }),
      plan("done", "in_progress", "pending"),
      ...ending("cancelled", "done", "failed", "failed"),
    );
    const spine = spineOf(events, null, 0);
    expect(spine.stages.map((s) => s.status)).toEqual(["done", "stopped", "todo"]);
    expect(spine.stages[1]?.summary).toEqual({ copyKey: "chat_stage_stopped_sum", values: {} });
    expect(spine.stages.some((s) => s.status === "failed")).toBe(false);
  });

  it("gives a turn stopped mid-call no reply: its last sentence stays in its stage (s14, dl-uukj.47.71.38)", () => {
    const events = append(
      start(),
      ...searchedAndDrafted,
      call("call_3", "lesson_check", {}),
      plan("done", "done", "in_progress"),
      ...ending("cancelled", "done", "done", "failed"),
    );
    const spine = spineOf(events, null, 0);
    expect(spine.reply).toBeUndefined();
    expect(spine.stages.map((s) => s.status)).toEqual(["done", "done", "stopped"]);
    expect(spine.stages[1]?.lines.at(-1)).toEqual({
      kind: "now",
      copyKey: SAY_KEY,
      values: { text: "Układam lekcję z tych zadań." },
    });
    expect(spineOf(golden("cancel-during-a-verb"), null, 0).reply).toBeUndefined();
  });
});
