import { EventId, ID_PREFIXES, idOf, Uuid } from "@jadwigo/contracts";
import {
  ConversationId,
  type NewRunEvent,
  RUN_ERROR_TYPE,
  RUN_IDLE_MS,
  RUN_MAX_MS,
  type RunEvent,
  type RunId,
  type VerbName,
} from "@jadwigo/contracts/run";
import { foldRun, mergeLive } from "@jadwigo/core";
import { parseLessonFileLenient } from "@jadwigo/lesson-import/file";
import { InMemoryStore } from "@jadwigo/store";
import { FIXED_NOW } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { fence } from "./fence/index.ts";
import type { MuseClient, MuseRequest } from "./muse/client.ts";
import { ScriptedMuse, type ScriptedReply } from "./muse/scripted.ts";
import { InMemoryRunQueue } from "./queue/memory.ts";
import { STEP_VISIBILITY_S } from "./queue/types.ts";
import { acceptMessage, drain, type EngineDeps, type InboxEntry, sweep } from "./run/run-step.ts";
import { createVerbs, fixtureBank } from "./verbs/index.ts";
import {
  type Verb,
  type VerbContext,
  type VerbEffect,
  VerbError,
  type Verbs,
} from "./verbs/types.ts";

/**
 * PostHog's production failures as frozen scenarios (step 0, dl-z5ja.12; wave plan
 * `docs/worklog/dl-z5ja/2026-10-31-wave-1.md`, Lead decision 13; the copy table in
 * `docs/research/posthog-ai-production.md`). They drive the engine only through `acceptMessage`,
 * `drain` and `sweep`, on `InMemoryStore`, `InMemoryRunQueue` and `ScriptedMuse`, with a clock the
 * test moves. A gap here is a message to the lead.
 *
 * Every name runs as `it.fails` while it is in EXPECTED_RED. The lanes remove names as their code
 * lands: the store (dl-z5ja.14), fold (dl-z5ja.13) and verbs (dl-z5ja.15) lanes first, the runner
 * (dl-z5ja.16) last, when the set ends empty.
 */
const EXPECTED_RED = new Set<string>([]);

/** `it`, or `it.fails` while the name is in EXPECTED_RED. */
function frozen(name: string, body: () => Promise<void>): void {
  (EXPECTED_RED.has(name) ? it.fails : it)(name, body);
}

describe("the engine keeps PostHog's production lessons", () => {
  frozen("an answer with an invented number or level is corrected once, then refused", async () => {
    const INVENTED = "Done: 37 questions, and the learner has mastered adding.";
    const REQUEST = "Adding within 20, grade 1.";
    const isMessage = (e: RunEvent, text: string) =>
      e.type === "message" && e.payload.from === "agent" && e.payload.text === text;

    // The correction words only what the turn gave: it is written, and the invented one never is.
    const fixed = await setup([draft(), { text: INVENTED }, { text: "Your lesson is ready." }]);
    const run = await fixed.say(REQUEST);
    await drain(fixed.deps);
    const events = await fixed.log(run);
    expect(fixed.muse.calls).toHaveLength(3);
    const note = fixed.muse.calls[2]?.instructions ?? "";
    expect(note).toContain('"37"');
    expect(note).toContain('"mastered"');
    expect(events.some((e) => isMessage(e, INVENTED))).toBe(false);
    expect(events.some((e) => isMessage(e, "Your lesson is ready."))).toBe(true);
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect((await fixed.store.getRun(fixed.pod, run)).status).toBe("completed");

    // The correction invents again: an error event in its place, and the turn ends.
    const stuck = await setup([draft(), { text: INVENTED }, { text: "Still 37, mastered." }]);
    const other = await stuck.say(REQUEST);
    await drain(stuck.deps);
    const log = await stuck.log(other);
    expect(stuck.muse.calls).toHaveLength(3);
    expect(log.filter((e) => e.type === "message" && e.payload.from === "agent")).toEqual([]);
    expect(log.find((e) => e.type === "error")?.payload).toMatchObject({
      error: { type: RUN_ERROR_TYPE.answerUnchecked },
      retryable: false,
    });
    expect(log.at(-1)?.type).toBe("turn_complete");
  });

  frozen("a reload replays without a gap or a duplicate", async () => {
    const t = await setup([draft(), { text: "Your lesson is ready." }]);
    const run = await t.say("Halves for grade 2.");
    await drain(t.deps);

    const events = await t.log(run);
    expect(events.map((e) => e.seq)).toEqual(events.map((_, i) => i + 1));
    // The page subscribed, buffered from seq 4 with repeats, then fetched all but the last.
    const buffer = [...events.slice(3), ...events.slice(5)];
    const fetched = events.slice(0, -1);
    const merged = mergeLive(buffer, fetched, 0);
    expect(merged.map((e) => e.seq)).toEqual(events.map((e) => e.seq));
    expect(foldRun(merged)).toEqual(foldRun(events));
  });

  frozen(
    "a follow-up sent mid-turn arrives once, at the next step, never inside a running call",
    async () => {
      const FOLLOW_UP = "Make it 5 questions, not 8.";
      const t = await setup(
        [draft(), edit(), { text: "Done: 5 questions now." }],
        fakeVerbs({ lesson_draft: async () => void (await t.say(FOLLOW_UP)) }),
      );
      const run = await t.say("Adding within 20, grade 1.");
      await drain(t.deps);

      expect(await t.store.listRuns(t.pod, t.conversation)).toHaveLength(1);
      const events = await t.log(run);
      const parent = events.filter((e) => e.type === "message" && e.payload.from === "parent");
      expect(parent.map((e) => (e.type === "message" ? e.payload.text : ""))).toEqual([
        "Adding within 20, grade 1.",
        FOLLOW_UP,
      ]);
      const followUp = seqOf(events, (e) => e.type === "message" && e.payload.text === FOLLOW_UP);
      expect(followUp).toBeGreaterThan(seqOf(events, (e) => e.type === "tool_result"));
      expect(followUp).toBeLessThan(
        seqOf(events, (e) => e.type === "model_response" && e.payload.call_no === 2),
      );
      expect(sent(t.muse, 1)).not.toContain(FOLLOW_UP);
      expect(sent(t.muse, 2)).toContain(FOLLOW_UP);
    },
  );

  frozen("a redelivered step pays once", async () => {
    const t = await setup([draft(), { text: "Here it is." }], undefined, {
      crashOn: (events) => events.some((e) => e.type === "tool_result"),
    });
    const run = await t.say("Counting in 2s, grade 1.");
    await drain(t.deps); // the step dies writing call_1's result
    t.tick(STEP_VISIBILITY_S * 1000 + 1000);
    await drain(t.deps); // the redelivery

    const events = await t.log(run);
    expect(t.muse.calls.filter((c) => c.call_no === 1)).toHaveLength(1);
    const responses = events.flatMap((e) =>
      e.type === "model_response" ? [e.payload.call_no] : [],
    );
    expect(responses).toEqual([...new Set(responses)]);
    expect(events.filter((e) => e.type === "tool_result")).toHaveLength(1);
    expect(events.filter((e) => e.type === "turn_complete")).toHaveLength(1);
    expect((await t.store.getRun(t.pod, run)).status).toBe("completed");
  });

  frozen("a stale attempt writes nothing", async () => {
    let release = () => {};
    let entered = () => {};
    const inDraft = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let draftCalls = 0;
    const t = await setup(
      [draft(), { text: "Ready." }],
      fakeVerbs({
        lesson_draft: async () => {
          draftCalls += 1;
          if (draftCalls === 1) {
            entered();
            await gate;
          }
        },
      }),
    );
    const run = await t.say("Odd and even numbers, grade 2.");

    const first = drain(t.deps); // attempt 1 stalls inside lesson_draft
    await inDraft;
    t.tick(STEP_VISIBILITY_S * 1000 + 1000);
    await drain(t.deps); // the redelivery takes the run and finishes the turn
    const before = await t.log(run);
    release();
    await first;

    expect(await t.log(run)).toEqual(before);
    expect((await t.store.getRun(t.pod, run)).attempt).toBeGreaterThanOrEqual(2);
    expect(t.muse.calls.filter((c) => c.call_no === 1)).toHaveLength(1);
    expect(before.filter((e) => e.type === "turn_complete")).toHaveLength(1);
  });

  frozen("a late event doesn't reopen an ended turn", async () => {
    const t = await setup([{ text: "Tell me a topic and I will draft a lesson." }]);
    const run = await t.say("What can you make for grade 1?");
    await drain(t.deps);
    const ended = await t.log(run);
    const stored = await t.store.getRun(t.pod, run);

    // A stray step for the ended run: a duplicate delivery, or a consumer that woke up late.
    await t.deps.queue.send({ run_id: run, attempt: stored.attempt });
    await drain(t.deps);

    expect(await t.log(run)).toEqual(ended);
    expect((await t.store.getRun(t.pod, run)).status).toBe("completed");
    expect(foldRun(ended).turn_open).toBe(false);
    expect(t.muse.calls).toHaveLength(1);
  });

  frozen("the budget steers at 50% and stops at 90%", async () => {
    const t = await setup([draft(0.06), check(0.035), edit(0.01)], undefined, { cap_usd: 0.1 });
    const run = await t.say("Shapes for grade 1.");
    await drain(t.deps);

    const events = await t.log(run);
    const steer = seqOf(events, (e) => e.type === "budget_steer" && e.payload.level === "steer");
    const stop = seqOf(events, (e) => e.type === "budget_steer" && e.payload.level === "stop");
    expect(steer).toBeLessThan(
      seqOf(events, (e) => e.type === "model_response" && e.payload.call_no === 2),
    );
    expect(stop).toBeGreaterThan(steer);
    expect(t.muse.calls).toHaveLength(2); // the 3rd reply is never bought
    const stored = await t.store.getRun(t.pod, run);
    expect(stored.spent_usd).toBeCloseTo(0.095, 6);
    expect(stored.status).toBe("completed");
    expect(events.at(-1)?.type).toBe("turn_complete");
  });

  frozen("cancel during a verb stops before the next one", async () => {
    let checked = 0;
    const t = await setup(
      [
        {
          tool_calls: [
            { verb: "lesson_draft", input: DRAFT_INPUT },
            { verb: "lesson_check", input: (r) => ({ draft_id: r.run_id, help: {} }) },
          ],
          cost_usd: 0.02,
        },
        { text: "never sent" },
      ],
      fakeVerbs({
        lesson_draft: async () =>
          void (await t.send({ event_id: eventId(), kind: "cancel", payload: {} })),
        lesson_check: async () => {
          checked += 1;
        },
      }),
    );
    const run = await t.say("Telling the time, grade 2.");
    await drain(t.deps);

    const events = await t.log(run);
    expect(checked).toBe(0);
    expect(t.muse.calls).toHaveLength(1);
    expect(events.filter((e) => e.type === "tool_result").map((e) => e.payload)).toMatchObject([
      { call_id: "call_1", error: null },
    ]);
    expect((await t.store.getRun(t.pod, run)).status).toBe("cancelled");
    expect(events.at(-1)?.type).toBe("turn_complete");
  });

  frozen("the idle and max deadlines fire on their own clocks", async () => {
    // Idle: nobody consumes the step, and the run goes quiet.
    const idle = await setup([]);
    const quiet = await idle.say("Something about money.");
    idle.tick(RUN_IDLE_MS / 2);
    expect(await sweep(idle.deps, idle.now())).toEqual({ idle: [], max: [] });
    idle.tick(RUN_IDLE_MS / 2);
    expect(await sweep(idle.deps, idle.now())).toEqual({ idle: [quiet], max: [] });
    const closed = await idle.store.getRun(idle.pod, quiet);
    expect(["completed", "failed", "cancelled"]).toContain(closed.status);
    const quietLog = await idle.log(quiet);
    expect(quietLog.at(-1)?.type).toBe("turn_complete");
    expect(quietLog.find((e) => e.type === "error")?.payload).toMatchObject({
      error: { type: RUN_ERROR_TYPE.runIdle },
      retryable: true,
    });

    // Max: activity keeps pushing the idle deadline, and the wall clock fires anyway.
    const busy = await setup([]);
    const long = await busy.say("A long one.");
    const started = await busy.store.getRun(busy.pod, long);
    await busy.store.updateRun(busy.pod, long, started.attempt, {
      idle_deadline_at: new Date(busy.now().getTime() + 2 * RUN_MAX_MS).toISOString(),
    });
    busy.tick(RUN_MAX_MS - 1000);
    expect(await sweep(busy.deps, busy.now())).toEqual({ idle: [], max: [] });
    busy.tick(1000);
    expect(await sweep(busy.deps, busy.now())).toEqual({ idle: [], max: [long] });
    expect((await busy.store.getRun(busy.pod, long)).status).toBe("failed");
    const events = await busy.log(long);
    expect(events.find((e) => e.type === "error")?.payload).toMatchObject({
      error: { type: RUN_ERROR_TYPE.runTimedOut },
      retryable: false,
    });
    expect(events.at(-1)?.type).toBe("turn_complete");
  });

  frozen(
    "a happy turn: the real verbs draft and check a lesson from the fixture bank",
    async () => {
      const t = await setup(
        [
          draft(),
          {
            tool_calls: [
              { verb: "lesson_check", input: (r) => ({ draft_id: r.run_id, help: {} }) },
            ],
          },
          { text: "Your lesson is ready on the right." },
        ],
        createVerbs({ bank: fixtureBank() }),
      );
      const run = await t.say("Adding within 20, grade 1.");
      await drain(t.deps);

      const events = await t.log(run);
      expect(
        events.flatMap((e) =>
          e.type === "tool_result" ? [[e.payload.verb, e.payload.error]] : [],
        ),
      ).toEqual([
        ["lesson_draft", null],
        ["lesson_check", null],
      ]);
      const lesson = foldRun(events).lesson;
      expect(lesson).not.toBeNull();
      expect(parseLessonFileLenient(lesson?.lesson_file).skipped).toEqual([]);
      expect((await t.store.getRun(t.pod, run)).status).toBe("completed");
    },
  );

  frozen("a due run enqueued by the sweep ends without a model call", async () => {
    // Muse is scripted with no reply, so any call fails the scenario.
    const idle = await setup([]);
    const quiet = await idle.say("Something about money.");
    idle.tick(RUN_IDLE_MS);
    // The pg_cron sweep's step: the run's current attempt (app.enqueue_runs_due).
    const waiting = await idle.store.getRun(idle.pod, quiet);
    await idle.deps.queue.send({ run_id: quiet, attempt: waiting.attempt });
    const outputs = await drain(idle.deps);
    expect(outputs.map((o) => o.outcome)).toContain("turn_complete");
    expect(idle.muse.calls).toHaveLength(0);
    expect((await idle.store.getRun(idle.pod, quiet)).status).toBe("completed");
    const closed = await idle.log(quiet);
    expect(closed.map((e) => e.type)).toEqual(["message", "error", "status", "turn_complete"]);
    expect(closed[1]?.payload).toMatchObject({
      error: { type: RUN_ERROR_TYPE.runIdle },
      retryable: true,
    });

    const busy = await setup([]);
    const long = await busy.say("A long one.");
    const started = await busy.store.getRun(busy.pod, long);
    await busy.store.updateRun(busy.pod, long, started.attempt, {
      idle_deadline_at: new Date(busy.now().getTime() + 2 * RUN_MAX_MS).toISOString(),
    });
    busy.tick(RUN_MAX_MS);
    expect((await drain(busy.deps)).map((o) => o.outcome)).toEqual(["failed"]);
    expect(busy.muse.calls).toHaveLength(0);
    expect((await busy.store.getRun(busy.pod, long)).status).toBe("failed");
    const failed = await busy.log(long);
    expect(failed.find((e) => e.type === "error")?.payload).toMatchObject({
      error: { type: "RunTimedOut" },
      retryable: false,
    });
    expect(failed.at(-1)?.type).toBe("turn_complete");
  });

  frozen("a steer survives a redelivered step", async () => {
    const STEER = "Shorter, please: 5 questions.";
    const t = await setup(
      [draft(), { text: "Done: 5 questions." }],
      fakeVerbs({ lesson_draft: async () => void (await t.steer(STEER)) }),
      // The step that took the steer dies during its model call, before Muse answers.
      { museDiesOn: (request) => request.call_no === 2 },
    );
    const run = await t.say("Adding within 20, grade 1.");
    await drain(t.deps); // step 2 takes the steer off the inbox and dies in call 2
    t.tick(STEP_VISIBILITY_S * 1000 + 1000);
    await drain(t.deps); // the redelivery makes call 2 again

    const events = await t.log(run);
    const steers = events.filter((e) => e.type === "steer");
    expect(steers.map((e) => e.payload)).toEqual([{ text: STEER, source: "chat" }]);
    expect(steers[0]?.seq).toBeLessThan(
      seqOf(events, (e) => e.type === "model_response" && e.payload.call_no === 2),
    );
    expect(sent(t.muse, 2)).toContain(STEER);
    expect(foldRun(events).chat).toContainEqual(
      expect.objectContaining({ from: "parent", text: STEER, steer: { source: "chat" } }),
    );
    expect((await t.store.getRun(t.pod, run)).status).toBe("completed");
  });

  frozen("a steer during the final call keeps the turn open one more step", async () => {
    const STEER = "I rewrote question 2 myself.";
    const t = await setup(
      [draft(), { text: "Here it is." }, { text: "Kept your question 2." }],
      fakeVerbs(),
      {
        onMuse: async (request) => {
          if (request.call_no === 2) {
            await t.steer(STEER, { source: "lesson_edit", question_ids: ["s02"] });
          }
        },
      },
    );
    const run = await t.say("Adding within 20, grade 1.");
    await drain(t.deps);

    const events = await t.log(run);
    expect(t.muse.calls).toHaveLength(3);
    expect(sent(t.muse, 3)).toContain(STEER);
    const steer = seqOf(events, (e) => e.type === "steer");
    expect(steer).toBeGreaterThan(
      seqOf(events, (e) => e.type === "model_response" && e.payload.call_no === 2),
    );
    expect(steer).toBeLessThan(
      seqOf(events, (e) => e.type === "model_response" && e.payload.call_no === 3),
    );
    expect(events.filter((e) => e.type === "turn_complete")).toHaveLength(1);
    expect(foldRun(events).chat).toContainEqual(
      expect.objectContaining({
        from: "parent",
        text: STEER,
        steer: { source: "lesson_edit", question_ids: ["s02"] },
      }),
    );
    expect((await t.store.getRun(t.pod, run)).status).toBe("completed");
  });

  frozen(
    "a parent's lesson edit mid-turn reaches the next call, and the AI's revision keeps it",
    async () => {
      const WORDS = "I wrote question 2 myself: count on from 7.";
      const SAY = "Start at 7 and count on 5.";
      const steerOnCall1 =
        (t: { steer: (text: string, from?: SteerFrom) => Promise<RunId> }) =>
        async (request: MuseRequest) => {
          if (request.call_no === 1) {
            await t.steer(WORDS, { source: "lesson_edit", question_ids: ["s02"] });
          }
        };
      const verbs = createVerbs({ bank: fixtureBank() });

      // The model honours the edit: a lesson_edit on s02 in the parent's words.
      let kept: Awaited<ReturnType<typeof setup>>;
      kept = await setup(
        [
          draft(),
          {
            tool_calls: [
              {
                verb: "lesson_edit",
                input: (r) => ({
                  draft_id: r.run_id,
                  names: [],
                  step_id: "s02",
                  patch: { say: SAY },
                  why: WORDS,
                }),
              },
            ],
          },
          { text: "Kept your question 2." },
        ],
        verbs,
        { onMuse: (request) => steerOnCall1(kept)(request) },
      );
      const run = await kept.say("Adding within 20, grade 1.");
      await drain(kept.deps);

      const events = await kept.log(run);
      expect(sent(kept.muse, 1)).not.toContain(WORDS);
      const second = kept.muse.calls.find((c) => c.call_no === 2);
      expect(second?.instructions).toContain("questions s02");
      expect(second?.instructions).toContain(WORDS);
      expect(seqOf(events, (e) => e.type === "steer")).toBeLessThan(
        seqOf(events, (e) => e.type === "model_response" && e.payload.call_no === 2),
      );
      expect(stepSay(foldRun(events).lesson?.lesson_file, "s02")).toBe(SAY);
      expect((await kept.store.getRun(kept.pod, run)).status).toBe("completed");

      // The model ignores it: the engine still named the question to it.
      let ignored: Awaited<ReturnType<typeof setup>>;
      ignored = await setup([draft(), { text: "Done." }], verbs, {
        onMuse: (request) => steerOnCall1(ignored)(request),
      });
      const other = await ignored.say("Adding within 20, grade 1.");
      await drain(ignored.deps);
      const named = ignored.muse.calls.find((c) => c.call_no === 2);
      expect(named?.instructions).toContain("questions s02");
      expect(named?.instructions).toContain(WORDS);
      expect(stepSay(foldRun(await ignored.log(other)).lesson?.lesson_file, "s02")).not.toBe(SAY);
    },
  );

  // Lead decision 41 (wave 4, dl-z5ja.76): the parent's own edit wins by construction.
  frozen(
    "a parent's patch lands as a revision with no model call, and Cofnij is one more patch",
    async () => {
      const t = await setup(
        [draft(), { text: "Gotowe." }, { text: "Dobrze." }],
        createVerbs({ bank: fixtureBank() }),
      );
      const run = await t.say("Dodawanie do 20, klasa 1.");
      await drain(t.deps);
      const drafted = foldRun(await t.log(run)).lesson;
      expect(drafted?.revision).toBe(1);
      expect(t.muse.calls).toHaveLength(2);

      // The turn has ended: the pane's edit lands on it by a step of its own, and no call is made.
      await t.steer("Zmieniłam tytuł.", {
        source: "lesson_edit",
        question_ids: ["s01"],
        patch: { title: "Moja lekcja" },
        base_revision: 1,
      });
      await drain(t.deps);
      const edited = await t.log(run);
      expect(t.muse.calls).toHaveLength(2);
      const steer = edited.find((e) => e.type === "steer");
      expect(edited.at(-1)).toMatchObject({
        type: "lesson_revision",
        payload: { revision: 2, call_id: steer?.event_id },
      });
      expect(foldRun(edited).lesson?.lesson_file).toMatchObject({ title: "Moja lekcja" });
      expect((await t.store.getRun(t.pod, run)).status).toBe("completed");

      // Cofnij: the pane sends the patch back, and the lesson is the draft again, one step on.
      const title = (drafted?.lesson_file as { title?: unknown } | undefined)?.title;
      await t.steer("Cofnij.", {
        source: "lesson_edit",
        question_ids: ["s01"],
        patch: { title },
        base_revision: 2,
      });
      await drain(t.deps);
      const undone = foldRun(await t.log(run)).lesson;
      expect(undone?.revision).toBe(3);
      expect(undone?.lesson_file).toEqual(drafted?.lesson_file);
      expect(t.muse.calls).toHaveLength(2);

      // The next turn's call is told which questions the parent changed, and that it is done.
      await t.say("Dziękuję.");
      await drain(t.deps);
      const told = t.muse.calls[2]?.instructions ?? "";
      expect(told).toContain("questions s01");
      expect(told).toContain("already in the lesson, as revision 2");
      expect(told).toContain("already in the lesson, as revision 3");
    },
  );

  frozen("a parent's patch mid-turn is applied before the next call, and wins", async () => {
    const verbs = createVerbs({ bank: fixtureBank() });
    let t: Awaited<ReturnType<typeof setup>>;
    t = await setup([draft(), check(), { text: "Zostawiłam twój tytuł." }], verbs, {
      onMuse: async (request) => {
        if (request.call_no !== 2) return;
        await t.steer("Zmieniłam tytuł.", {
          source: "lesson_edit",
          question_ids: ["s01"],
          patch: { title: "Moja lekcja" },
          base_revision: 1,
        });
      },
    });
    const run = await t.say("Dodawanie do 20, klasa 1.");
    await drain(t.deps);

    const events = await t.log(run);
    const steer = events.find((e) => e.type === "steer");
    const patched = seqOf(
      events,
      (e) => e.type === "lesson_revision" && e.payload.call_id === steer?.event_id,
    );
    expect(patched).toBeLessThan(
      seqOf(events, (e) => e.type === "model_response" && e.payload.call_no === 3),
    );
    expect(t.muse.calls).toHaveLength(3);
    expect(t.muse.calls[2]?.instructions).toContain("already in the lesson, as revision 2");
    expect(foldRun(events).lesson?.lesson_file).toMatchObject({ title: "Moja lekcja" });
  });

  frozen(
    "a patch made on an older revision is not applied, so it undoes nothing the AI changed",
    async () => {
      const SAY = "Zacznij od 7 i dolicz 5.";
      const verbs = createVerbs({ bank: fixtureBank() });
      const aiEdit: ScriptedReply = {
        tool_calls: [
          {
            verb: "lesson_edit",
            input: (r) => ({
              draft_id: r.run_id,
              names: [],
              step_id: "s02",
              patch: { say: SAY },
              why: "shorter",
            }),
          },
        ],
      };
      let t: Awaited<ReturnType<typeof setup>>;
      t = await setup([draft(), aiEdit, { text: "Dobrze." }], verbs, {
        onMuse: async (request) => {
          if (request.call_no !== 2) return;
          // The pane still shows revision 1; the AI's edit makes revision 2 before this is taken.
          await t.steer("Zmieniłam tytuł.", {
            source: "lesson_edit",
            question_ids: ["s01"],
            patch: { title: "Moja lekcja" },
            base_revision: 1,
          });
        },
      });
      const run = await t.say("Dodawanie do 20, klasa 1.");
      await drain(t.deps);

      const events = await t.log(run);
      const lesson = foldRun(events).lesson;
      expect(lesson?.revision).toBe(2);
      expect(stepSay(lesson?.lesson_file, "s02")).toBe(SAY);
      expect(lesson?.lesson_file).not.toMatchObject({ title: "Moja lekcja" });
      expect(t.muse.calls[2]?.instructions).toContain("Their change was not applied");
    },
  );

  // Lead decision 48 (#541's round 3): every revision goes through the conversation's
  // compare-and-set, so a parent's patch and a later turn's AI edit can never both be revision 2.
  frozen(
    "an AI edit on a lesson the parent's patch moved is refused, re-read, and both changes stay",
    async () => {
      const SAY = "Zacznij od 7 i dolicz 5.";
      const TITLE = "Moja lekcja";
      const real = createVerbs({ bank: fixtureBank() });
      let during: (() => Promise<void>) | null = null;
      // The AI's lesson_edit reads the lesson, then the parent's patch lands before it writes.
      const verbs: Verbs = {
        ...real,
        lesson_edit: {
          ...real.lesson_edit,
          run: async (context, input) => {
            const effect = await real.lesson_edit.run(context, input);
            const hook = during;
            during = null;
            await hook?.();
            return effect;
          },
        },
      };
      const aiEdit: ScriptedReply = {
        tool_calls: [
          {
            verb: "lesson_edit",
            input: (r) => ({
              draft_id: r.run_id,
              names: [],
              step_id: "s02",
              patch: { say: SAY },
              why: "shorter",
            }),
          },
        ],
      };
      let t: Awaited<ReturnType<typeof setup>>;
      t = await setup([draft(), { text: "Gotowe." }, aiEdit, aiEdit, { text: "Dobrze." }], verbs, {
        // The patch step's first try dies before its revision is written: it runs again later.
        crashOn: (events) =>
          events.some(
            (e) =>
              e.type === "lesson_revision" &&
              (e.payload.lesson_file as { title?: unknown }).title === TITLE,
          ),
      });
      const first = await t.say("Dodawanie do 20, klasa 1.");
      await drain(t.deps);
      await t.steer("Zmieniłam tytuł.", {
        source: "lesson_edit",
        question_ids: ["s01"],
        patch: { title: TITLE },
        base_revision: 1,
      });
      await drain(t.deps);
      // The parent opens turn 2 just before the patch step comes back. Its edit reads revision 1,
      // and the patch's redelivery lands while the edit runs, before it writes: 2 workers' race.
      t.tick(STEP_VISIBILITY_S * 1000 - 1000);
      during = async () => {
        t.tick(2000);
        await drain(t.deps);
      };
      const second = await t.say("Krócej, proszę.");
      await drain(t.deps);

      const refused = (await t.log(second)).filter(
        (e) => e.type === "tool_result" && e.payload.error?.type === RUN_ERROR_TYPE.lessonChanged,
      );
      expect(refused).toHaveLength(1);
      const revisions = [...(await t.log(first)), ...(await t.log(second))].filter(
        (e) => e.type === "lesson_revision",
      );
      expect(revisions.map((e) => e.payload.revision).sort()).toEqual([1, 2, 3]);
      const last = revisions.find((e) => e.payload.revision === 3);
      expect(last?.payload.lesson_file).toMatchObject({ title: TITLE });
      expect(stepSay(last?.payload.lesson_file, "s02")).toBe(SAY);
    },
  );

  frozen("a patch whose step dies after the take is applied on its redelivery", async () => {
    const TITLE = "Moja lekcja";
    const t = await setup([draft(), { text: "Gotowe." }], createVerbs({ bank: fixtureBank() }), {
      crashOn: (events) =>
        events.some(
          (e) =>
            e.type === "lesson_revision" &&
            (e.payload.lesson_file as { title?: unknown }).title === TITLE,
        ),
    });
    const run = await t.say("Dodawanie do 20, klasa 1.");
    await drain(t.deps);
    await t.steer("Zmieniłam tytuł.", {
      source: "lesson_edit",
      question_ids: ["s01"],
      patch: { title: TITLE },
      base_revision: 1,
    });
    await drain(t.deps);
    // The take logged the steer; the step died before its revision. The inbox is empty now.
    expect((await t.log(run)).filter((e) => e.type === "steer")).toHaveLength(1);
    expect(foldRun(await t.log(run)).lesson?.revision).toBe(1);

    t.tick(STEP_VISIBILITY_S * 1000 + 1000);
    await drain(t.deps);
    const lesson = foldRun(await t.log(run)).lesson;
    expect(lesson?.revision).toBe(2);
    expect(lesson?.lesson_file).toMatchObject({ title: TITLE });
    expect(t.muse.calls).toHaveLength(2);
  });

  // Lead decision 36 (wave 4, dl-z5ja.107): the side panel's page travels on the message.
  frozen(
    "a message from a learner page names that learner to the model, read from the pod",
    async () => {
      const t = await setup([{ text: "Mole is on it." }]);
      const { learner } = await t.store.addLearner(t.pod, { first_name: "Mole" });
      const run = await t.send({
        event_id: eventId(),
        kind: "message",
        payload: { text: "How is it going?", context: { learner_id: learner.id } },
      });
      await drain(t.deps);

      const instructions = t.muse.calls[0]?.instructions ?? "";
      expect(instructions).toContain(fence("Mole", "parent"));
      expect(instructions).toContain(learner.id);
      const said = (await t.log(run)).find(
        (e) => e.type === "message" && e.payload.from === "parent",
      );
      expect(said?.payload).toMatchObject({ context: { learner_id: learner.id } });
    },
  );

  frozen("a page from another pod is refused before any model call", async () => {
    const t = await setup([{ text: "never asked" }]);
    const other = await t.store.createAccount(Uuid.parse(crypto.randomUUID()), "en");
    const { learner } = await t.store.addLearner(other.pod, { first_name: "Owl" });
    await expect(
      t.send({
        event_id: eventId(),
        kind: "message",
        payload: { text: "How is Owl?", context: { learner_id: learner.id } },
      }),
    ).rejects.toMatchObject({ type: "NotFound" });
    await drain(t.deps);

    expect(t.muse.calls).toEqual([]);
    expect(await t.store.listRuns(t.pod, t.conversation)).toEqual([]);
    // A message with no page is today's turn: no line about where the parent is.
    await t.say("Adding within 20, grade 1.");
    await drain(t.deps);
    expect(t.muse.calls[0]?.instructions).not.toContain("writing from");
  });

  // Lead decision 38 (wave 4, dl-z5ja.102): words beside a failing tool call are dropped, with no
  // correction and no error event. The tool's failure is logged, and the next call writes new words.
  frozen("words beside a failing tool call are dropped, with no correction", async () => {
    const BESIDE = "Drafting 12 questions now.";
    const t = await setup(
      [{ ...draft(), text: BESIDE }, { text: "That draft failed. Shall I try again?" }],
      fakeVerbs({
        lesson_draft: async () => {
          throw new VerbError("BadInput", "made-up refusal");
        },
      }),
    );
    const run = await t.say("Adding within 20, grade 1.");
    await drain(t.deps);

    const events = await t.log(run);
    expect(t.muse.calls).toHaveLength(2);
    expect(t.muse.calls[1]?.instructions).not.toContain("was not sent to the parent");
    expect(
      events.flatMap((e) => (e.type === "tool_result" ? [e.payload.error?.type ?? null] : [])),
    ).toEqual(["BadInput"]);
    const agent = events.flatMap((e) =>
      e.type === "message" && e.payload.from === "agent" ? [e.payload.text] : [],
    );
    expect(agent).toEqual(["That draft failed. Shall I try again?"]);
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect((await t.store.getRun(t.pod, run)).status).toBe("completed");
  });
});

// The world each scenario runs in.

const DRAFT_INPUT = { request: "a short lesson", grade: "1", names: [], topic: "addition" };

function draft(cost_usd = 0.02): ScriptedReply {
  return { tool_calls: [{ verb: "lesson_draft", input: DRAFT_INPUT }], cost_usd };
}
function check(cost_usd = 0.02): ScriptedReply {
  return {
    tool_calls: [{ verb: "lesson_check", input: (r) => ({ draft_id: r.run_id, help: {} }) }],
    cost_usd,
  };
}
function edit(cost_usd = 0.02): ScriptedReply {
  return {
    tool_calls: [
      {
        verb: "lesson_edit",
        input: (r) => ({ draft_id: r.run_id, step_id: "s01", patch: { prompt: "5 questions" } }),
      },
    ],
    cost_usd,
  };
}

interface Options {
  cap_usd?: number;
  /** Runs before Muse answers each call: the scenarios' way to act while a call is out. */
  onMuse?: (request: MuseRequest) => Promise<void>;
  /** Muse's call throws once, as a dying process would, on the first request this matches. */
  museDiesOn?: (request: MuseRequest) => boolean;
  /** The store throws once, as a dying process would, on the first append this matches. */
  crashOn?: (events: readonly NewRunEvent[]) => boolean;
}

/** A steer's optional fields, as the inbox takes them. */
type SteerFrom = Omit<Extract<InboxEntry, { kind: "steer" }>["payload"], "text">;

async function setup(
  script: readonly ScriptedReply[],
  verbs: Verbs = fakeVerbs(),
  options: Options = {},
) {
  let clock = FIXED_NOW.getTime();
  const now = () => new Date(clock);
  const store = options.crashOn
    ? new CrashingStore(now, options.crashOn)
    : new InMemoryStore({ now });
  const muse = new ScriptedMuse(script);
  let died = false;
  const client: MuseClient = {
    respond: async (request) => {
      await options.onMuse?.(request);
      if (!died && options.museDiesOn?.(request)) {
        died = true;
        throw new Error("the process died during the model call");
      }
      return muse.respond(request);
    },
  };
  const deps: EngineDeps = { store, muse: client, verbs, queue: new InMemoryRunQueue(now), now };
  const member = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  const conversation = (
    await store.createConversation(member.pod, {
      id: ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID())),
      created_by: member.account,
      title: null,
    })
  ).id;

  const send = async (entry: InboxEntry): Promise<RunId> => {
    const accepted = await acceptMessage(deps, {
      pod: member.pod,
      created_by: member.account,
      conversation_id: conversation,
      entry,
      ...(options.cap_usd === undefined ? {} : { cap_usd: options.cap_usd }),
    });
    return accepted.run.id;
  };
  return {
    deps,
    store,
    muse,
    pod: member.pod,
    conversation,
    now,
    tick: (ms: number) => {
      clock += ms;
    },
    send,
    say: (text: string) => send({ event_id: eventId(), kind: "message", payload: { text } }),
    steer: (text: string, from: SteerFrom = {}) =>
      send({ event_id: eventId(), kind: "steer", payload: { text, ...from } }),
    log: (run: RunId) => store.listRunEvents(member.pod, run, 0),
  };
}

/** An InMemoryStore whose append throws once, before it writes, where `crashOn` matches. */
class CrashingStore extends InMemoryStore {
  #crashed = false;

  constructor(
    now: () => Date,
    readonly crashOn: (events: readonly NewRunEvent[]) => boolean,
  ) {
    super({ now });
  }

  override appendRunEvents(...args: Parameters<InMemoryStore["appendRunEvents"]>) {
    if (!this.#crashed && this.crashOn(args[3])) {
      this.#crashed = true;
      return Promise.reject(new Error("the process died"));
    }
    return super.appendRunEvents(...args);
  }
}

/**
 * Verbs that draft a tiny made-up lesson, keep it as it is on an edit, and answer no findings, each
 * running `hooks[verb]` first: the scenarios' way to act while a verb runs.
 */
function fakeVerbs(
  hooks: Partial<Record<VerbName, (context: VerbContext) => Promise<void>>> = {},
): Verbs {
  const LESSON = { id: "draft-demo", title: { en: "A made-up lesson" }, language: "en", parts: [] };
  const effects: Record<VerbName, (context: VerbContext) => VerbEffect> = {
    lesson_draft: () => ({ output: { draft_id: "made-up" }, lesson_file: LESSON }),
    lesson_show: (c) => ({ output: { lesson_file: c.lesson?.lesson_file ?? null } }),
    lesson_edit: (c) => ({ output: {}, lesson_file: c.lesson?.lesson_file ?? LESSON }),
    lesson_check: () => ({ output: { findings: [] } }),
    question_search: () => ({ output: { sets: [] } }),
  };
  const verb = (name: VerbName): Verb => ({
    name,
    tool: { name, description: `the made-up ${name}`, parameters: { type: "object" } },
    run: async (context) => {
      await hooks[name]?.(context);
      return effects[name](context);
    },
  });
  return {
    lesson_draft: verb("lesson_draft"),
    lesson_show: verb("lesson_show"),
    lesson_edit: verb("lesson_edit"),
    lesson_check: verb("lesson_check"),
    question_search: verb("question_search"),
  };
}

function eventId(): EventId {
  return EventId.parse(crypto.randomUUID());
}

/** The `seq` of the first event `match` finds; a missing one fails the scenario. */
function seqOf(events: readonly RunEvent[], match: (e: RunEvent) => boolean): number {
  const found = events.find(match);
  if (!found) throw new Error("no such event in the log");
  return found.seq;
}

/** What a lesson file's step says, by its id. */
function stepSay(lesson_file: unknown, id: string): unknown {
  const parts = (
    lesson_file as { script?: { parts?: { steps?: { id: string; say?: unknown }[] }[] } }
  )?.script?.parts;
  return parts?.flatMap((p) => p.steps ?? []).find((s) => s.id === id)?.say;
}

/** Everything the model was sent on call `call_no`, as one string to search. */
function sent(muse: ScriptedMuse, call_no: number): string {
  return JSON.stringify(muse.calls.find((c) => c.call_no === call_no) ?? null);
}
