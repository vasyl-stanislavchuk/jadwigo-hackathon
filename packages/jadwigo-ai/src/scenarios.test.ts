import { EventId, ID_PREFIXES, idOf, Uuid } from "@jadwigo/contracts";
import {
  ConversationId,
  type NewRunEvent,
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
import { ScriptedMuse, type ScriptedReply } from "./muse/scripted.ts";
import { InMemoryRunQueue } from "./queue/memory.ts";
import { STEP_VISIBILITY_S } from "./queue/types.ts";
import { acceptMessage, drain, type EngineDeps, type InboxEntry, sweep } from "./run/run-step.ts";
import { createVerbs, fixtureBank } from "./verbs/index.ts";
import type { Verb, VerbContext, VerbEffect, Verbs } from "./verbs/types.ts";

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
    expect((await idle.log(quiet)).at(-1)?.type).toBe("turn_complete");

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
    expect(events.some((e) => e.type === "error")).toBe(true);
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
  /** The store throws once, as a dying process would, on the first append this matches. */
  crashOn?: (events: readonly NewRunEvent[]) => boolean;
}

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
  const deps: EngineDeps = { store, muse, verbs, queue: new InMemoryRunQueue(now), now };
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

/** Everything the model was sent on call `call_no`, as one string to search. */
function sent(muse: ScriptedMuse, call_no: number): string {
  return JSON.stringify(muse.calls.find((c) => c.call_no === call_no) ?? null);
}
