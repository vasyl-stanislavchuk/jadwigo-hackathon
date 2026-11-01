import { type AccountId, EventId, ID_PREFIXES, idOf, type PodId, Uuid } from "@jadwigo/contracts";
import {
  BUDGET_STEER_SHARE,
  BUDGET_STOP_SHARE,
  type Conversation,
  ConversationId,
  type NewRunEvent,
  RUN_ERROR_TYPE,
  RUN_IDLE_MS,
  RUN_MAX_MS,
  type Run,
  type RunEvent,
  RunId,
  type RunInbox,
  type VerbName,
} from "@jadwigo/contracts/run";
import {
  type Fenced,
  InMemoryStore,
  type NewConversation,
  type NewRun,
  type NewRunInbox,
  type RunChange,
  StoreError,
} from "@jadwigo/store";
import { FIXED_NOW } from "@jadwigo/testing";
import { describe, expect, it, vi } from "vitest";
import type { MuseClient, MuseRequest, MuseResponse } from "../muse/client.ts";
import { ScriptedMuse } from "../muse/scripted.ts";
import { InMemoryRunQueue } from "../queue/memory.ts";
import { STEP_VISIBILITY_S } from "../queue/types.ts";
import { createVerbs, fixtureBank } from "../verbs/index.ts";
import {
  type Verb,
  type VerbContext,
  type VerbEffect,
  VerbError,
  type Verbs,
} from "../verbs/types.ts";
import {
  acceptMessage,
  authorizeRun,
  drain,
  type EngineDeps,
  type InboxEntry,
  runStep,
  sweep,
} from "./run-step.ts";

/**
 * The runner on fakes, while the fold (dl-z5ja.13), store (dl-z5ja.14) and verbs (dl-z5ja.15)
 * lanes are stubs: a run store in memory, a scripted Muse, made-up verbs, and core's 2 rules
 * written out as `packages/core/src/run/index.ts` documents them. `src/scenarios.test.ts` drives
 * the real ones once they land.
 */
vi.mock("@jadwigo/core", async (actual) => ({
  ...(await actual<typeof import("@jadwigo/core")>()),
  budgetGuard: (spent: number | null | undefined, cap: number) => {
    if (typeof spent !== "number" || !Number.isFinite(spent)) return "stop";
    if (spent >= cap * BUDGET_STOP_SHARE) return "stop";
    if (spent >= cap * BUDGET_STEER_SHARE) return "steer";
    return "none";
  },
  deadlineDue: (run: Pick<Run, "status" | "idle_deadline_at" | "max_deadline_at">, now: Date) => {
    if (["completed", "failed", "cancelled"].includes(run.status)) return null;
    if (Date.parse(run.max_deadline_at) <= now.getTime()) return "max";
    if (run.idle_deadline_at && Date.parse(run.idle_deadline_at) <= now.getTime()) return "idle";
    return null;
  },
}));

/** The run methods kept as `packages/store/src/run.ts` documents them, on top of InMemoryStore. */
class RunMemoryStore extends InMemoryStore {
  readonly conversations = new Map<string, Conversation>();
  readonly runs = new Map<string, Run>();
  readonly events = new Map<string, RunEvent[]>();
  readonly inbox: RunInbox[] = [];
  readonly clock: () => Date;
  /** Throws once, before writing, on the first append this matches. */
  crashOn: ((events: readonly NewRunEvent[]) => boolean) | null = null;

  constructor(now: () => Date) {
    super({ now });
    this.clock = now;
  }

  #run(pod: PodId, id: RunId): Run {
    const run = this.runs.get(id);
    if (!run || run.pod_id !== pod) throw new StoreError("NotFound", "no such run");
    return run;
  }

  override findRunPod(id: RunId) {
    return Promise.resolve(this.runs.get(id)?.pod_id);
  }
  override listRunsDue(now: string) {
    const t = Date.parse(now);
    return Promise.resolve(
      [...this.runs.values()]
        .filter((r) => ["queued", "in_progress", "awaiting_input"].includes(r.status))
        .filter(
          (r) =>
            Date.parse(r.max_deadline_at) <= t ||
            (r.idle_deadline_at !== null && Date.parse(r.idle_deadline_at) <= t),
        )
        .map((run) => ({ pod: run.pod_id, run })),
    );
  }
  override createConversation(pod: PodId, c: NewConversation) {
    const row = this.conversations.get(c.id) ?? {
      ...c,
      pod_id: pod,
      created_at: this.clock().toISOString(),
    };
    this.conversations.set(c.id, row);
    return Promise.resolve(row);
  }
  override createRun(pod: PodId, r: NewRun) {
    const stored = this.runs.get(r.id);
    if (stored) return Promise.resolve(stored);
    const run: Run = {
      ...r,
      pod_id: pod,
      status: "queued",
      attempt: 1,
      cancel_requested_at: null,
      spent_usd: 0,
      created_at: this.clock().toISOString(),
      completed_at: null,
    };
    this.runs.set(r.id, run);
    return Promise.resolve(run);
  }
  override listRuns(pod: PodId, conversation: ConversationId) {
    return Promise.resolve(
      [...this.runs.values()].filter((r) => r.pod_id === pod && r.conversation_id === conversation),
    );
  }
  override getRun(pod: PodId, id: RunId) {
    return Promise.resolve(this.#run(pod, id));
  }
  override updateRun(
    pod: PodId,
    id: RunId,
    attempt: number,
    change: RunChange,
  ): Promise<Fenced<Run>> {
    const run = this.#run(pod, id);
    if (run.attempt !== attempt) return Promise.resolve({ stale: true, value: run });
    const next = { ...run, ...change };
    this.runs.set(id, next);
    return Promise.resolve({ stale: false, value: next });
  }
  override appendRunEvents(pod: PodId, id: RunId, attempt: number, events: readonly NewRunEvent[]) {
    if (this.crashOn?.(events)) {
      this.crashOn = null;
      return Promise.reject(new Error("the process died"));
    }
    const run = this.#run(pod, id);
    const log = this.events.get(id) ?? [];
    if (run.attempt !== attempt) return Promise.resolve({ stale: true, value: [] });
    const answered = events.map((e) => {
      const stored = log.find((s) => s.event_id === e.event_id);
      if (stored) return stored;
      const row = { ...e, seq: log.length + 1, created_at: this.clock().toISOString() } as RunEvent;
      log.push(row);
      return row;
    });
    this.events.set(id, log);
    return Promise.resolve({ stale: false, value: answered });
  }
  override listRunEvents(pod: PodId, id: RunId, afterSeq: number) {
    this.#run(pod, id);
    return Promise.resolve((this.events.get(id) ?? []).filter((e) => e.seq > afterSeq));
  }
  override putRunInbox(pod: PodId, entry: NewRunInbox) {
    const stored = this.inbox.find((r) => r.event_id === entry.event_id);
    if (stored) return Promise.resolve(stored);
    const row = {
      ...entry,
      pod_id: pod,
      status: "pending",
      created_at: this.clock().toISOString(),
    } as RunInbox;
    this.inbox.push(row);
    return Promise.resolve(row);
  }
  override takeRunInbox(pod: PodId, id: RunId) {
    const taken: RunInbox[] = [];
    this.inbox.forEach((row, i) => {
      if (row.pod_id !== pod || row.run_id !== id || row.status !== "pending") return;
      this.inbox[i] = { ...row, status: "delivered" };
      taken.push(row);
    });
    return Promise.resolve(taken);
  }
}

interface Reply {
  text?: string;
  calls?: readonly { verb: VerbName; input?: Record<string, unknown> }[];
  cost_usd?: number;
}

/** Replays `script`, one reply per call, and records every request. */
class FakeMuse implements MuseClient {
  readonly calls: MuseRequest[] = [];
  #ids = 0;

  constructor(readonly script: readonly Reply[]) {}

  respond(request: MuseRequest): Promise<MuseResponse> {
    const reply = this.script[this.calls.length];
    this.calls.push(request);
    if (!reply) return Promise.reject(new Error("past the script's end"));
    return Promise.resolve({
      response_id: `resp_${this.calls.length}`,
      model: "fake",
      text: reply.text ?? null,
      tool_calls: (reply.calls ?? []).map((c) => ({
        call_id: `call_${++this.#ids}`,
        verb: c.verb,
        input: c.input ?? {},
      })),
      usage: { input_tokens: 100, output_tokens: 10, cached_tokens: 0 },
      cost_usd: reply.cost_usd ?? 0.01,
    });
  }
}

type Hook = (
  context: VerbContext,
  input: Record<string, unknown>,
) => Promise<VerbEffect | undefined>;

function fakeVerbs(hooks: Partial<Record<VerbName, Hook>> = {}): Verbs {
  const verb = (name: VerbName): Verb => ({
    name,
    tool: { name, description: `the made-up ${name}`, parameters: { type: "object" } },
    run: async (context, input) => {
      const effect = await hooks[name]?.(context, input);
      if (effect) return effect;
      if (name === "lesson_draft") return { output: {}, lesson_file: { id: "made-up", parts: [] } };
      return { output: {} };
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

async function setup(script: readonly Reply[], verbs: Verbs = fakeVerbs(), cap_usd?: number) {
  let clock = FIXED_NOW.getTime();
  const now = () => new Date(clock);
  const store = new RunMemoryStore(now);
  const muse = new FakeMuse(script);
  const queue = new InMemoryRunQueue(now);
  const deps: EngineDeps = { store, muse, verbs, queue, now };
  const member = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  const conversation = (
    await store.createConversation(member.pod, {
      id: ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID())),
      created_by: member.account,
      title: null,
    })
  ).id;
  const send = async (entry: InboxEntry) =>
    acceptMessage(deps, {
      pod: member.pod,
      created_by: member.account,
      conversation_id: conversation,
      entry,
      ...(cap_usd === undefined ? {} : { cap_usd }),
    });
  return {
    deps,
    store,
    muse,
    queue,
    member,
    conversation,
    now,
    tick: (ms: number) => {
      clock += ms;
    },
    send,
    say: async (text: string, event_id = newEventId()) =>
      (await send({ event_id, kind: "message", payload: { text } })).run.id,
    log: (run: RunId) => store.listRunEvents(member.pod, run, 0),
    run: (run: RunId) => store.getRun(member.pod, run),
  };
}

const DRAFT_INPUT = { request: "a short lesson", grade: "1", names: [], topic: "addition" };

/** Another pod's run, with a lesson whose title names its learners: what must never leak. */
async function theirRun(
  store: RunMemoryStore,
  member: { pod: PodId; account: AccountId },
  title: string,
): Promise<RunId> {
  const conversation = await store.createConversation(member.pod, {
    id: ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID())),
    created_by: member.account,
    title,
  });
  const run = await store.createRun(member.pod, {
    id: RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID())),
    created_by: member.account,
    conversation_id: conversation.id,
    workflow: "jadwigo-lesson-compose",
    resumes: null,
    cap_usd: 1,
    idle_deadline_at: null,
    max_deadline_at: new Date(FIXED_NOW.getTime() + RUN_MAX_MS).toISOString(),
  });
  await store.appendRunEvents(member.pod, run.id, run.attempt, [
    {
      type: "message",
      run_id: run.id,
      event_id: newEventId(),
      payload: { from: "parent", text: title },
    },
    {
      type: "lesson_revision",
      run_id: run.id,
      event_id: newEventId(),
      payload: { revision: 1, call_id: "call_1", lesson_file: { id: "theirs", title, parts: [] } },
    },
  ]);
  return run.id;
}

function newEventId(): EventId {
  return EventId.parse(crypto.randomUUID());
}

function types(events: readonly RunEvent[]): string[] {
  return events.map((e) => e.type);
}

describe("acceptMessage", () => {
  it("opens a queued run with both deadlines and one step, and a resend lands once", async () => {
    const t = await setup([]);
    const id = newEventId();
    const run = await t.say("Halves, grade 2.", id);
    expect(await t.say("Halves, grade 2.", id)).toBe(run);
    const stored = await t.run(run);
    expect(stored).toMatchObject({ status: "queued", attempt: 1, cap_usd: 1 });
    expect(stored.idle_deadline_at).toBe(new Date(FIXED_NOW.getTime() + RUN_IDLE_MS).toISOString());
    expect(stored.max_deadline_at).toBe(new Date(FIXED_NOW.getTime() + RUN_MAX_MS).toISOString());
    expect(t.store.inbox).toHaveLength(1);
    expect(await t.queue.read(60, 10)).toHaveLength(1);
  });

  it("puts a message mid-turn on the open run without a 2nd step", async () => {
    const t = await setup([]);
    const run = await t.say("First.");
    expect(await t.say("Second.")).toBe(run);
    expect(await t.store.listRuns(t.member.pod, t.conversation)).toHaveLength(1);
    expect(await t.queue.read(60, 10)).toHaveLength(1);
  });

  it("sets cancel_requested_at on the open run", async () => {
    const t = await setup([]);
    const run = await t.say("Something.");
    await t.send({ event_id: newEventId(), kind: "cancel", payload: {} });
    expect((await t.run(run)).cancel_requested_at).toBe(FIXED_NOW.toISOString());
  });

  it("refuses a message's event_id resent as a cancel, and the run is never cancelled", async () => {
    const t = await setup([]);
    const id = newEventId();
    const run = await t.say("Halves.", id);
    await expect(t.send({ event_id: id, kind: "cancel", payload: {} })).rejects.toMatchObject({
      type: "BadRequest",
    });
    expect((await t.run(run)).cancel_requested_at).toBeNull();
    expect(t.store.inbox.map((r) => r.kind)).toEqual(["message"]);
    // The same kind resent still lands once.
    expect(await t.say("Halves.", id)).toBe(run);
  });

  it("opens a new run for the next turn once the last one ended", async () => {
    const t = await setup([{ text: "Hi." }, { text: "Again." }]);
    const first = await t.say("One.");
    await drain(t.deps);
    const second = await t.say("Two.");
    expect(second).not.toBe(first);
    await drain(t.deps);
    expect(t.muse.calls[1]?.input).toEqual([
      { type: "message", role: "user", text: "One." },
      { type: "message", role: "assistant", text: "Hi." },
      { type: "message", role: "user", text: "Two." },
    ]);
  });
});

describe("authorizeRun", () => {
  it("names the pod and the account from the run row, and NotFound for an unknown id", async () => {
    const t = await setup([]);
    const run = await t.say("Hello.");
    expect(await authorizeRun(t.store, run)).toMatchObject({
      pod: t.member.pod,
      created_by: t.member.account,
      run: { id: run },
    });
    const missing = idOf(ID_PREFIXES.run, crypto.randomUUID()) as RunId;
    await expect(authorizeRun(t.store, missing)).rejects.toMatchObject({ type: "NotFound" });
  });
});

describe("runStep and drain", () => {
  it("runs a turn: draft, then words; the log has the golden logs' order and gapless seq", async () => {
    const t = await setup([
      { calls: [{ verb: "lesson_draft" }], cost_usd: 0.02 },
      { text: "Ready." },
    ]);
    const run = await t.say("Halves.");
    const outputs = await drain(t.deps);

    expect(outputs.map((o) => o.outcome)).toEqual(["continue", "turn_complete"]);
    const events = await t.log(run);
    expect(types(events)).toEqual([
      "message",
      "status",
      "model_response",
      "usage",
      "tool_call",
      "tool_result",
      "lesson_revision",
      "model_response",
      "usage",
      "message",
      "status",
      "turn_complete",
    ]);
    expect(events.map((e) => e.seq)).toEqual(events.map((_, i) => i + 1));
    expect(await t.run(run)).toMatchObject({ status: "completed", spent_usd: 0.03 });
    expect(t.muse.calls.map((c) => c.call_no)).toEqual([1, 2]);
    expect(t.muse.calls[1]?.input.map((i) => i.type)).toEqual([
      "message",
      "function_call",
      "function_call_output",
    ]);
  });

  it("sends every call to the private tier, and each model_response records its model and tier", async () => {
    const t = await setup([{ calls: [{ verb: "lesson_draft" }] }, { text: "Ready." }]);
    const run = await t.say("Halves.");
    await drain(t.deps);
    expect(t.muse.calls.map((c) => c.tier)).toEqual(["private", "private"]);
    const recorded = (await t.log(run)).flatMap((e) =>
      e.type === "model_response" ? [[e.payload.model, e.payload.tier]] : [],
    );
    expect(recorded).toEqual([
      ["fake", "private"],
      ["fake", "private"],
    ]);
  });

  it("carries an approval's feedback and answers from the inbox into approval_resolved", async () => {
    const t = await setup([{ text: "Ready." }]);
    const run = await t.say("Halves.");
    await t.send({
      event_id: newEventId(),
      kind: "approval",
      payload: {
        call_id: "call_9",
        decision: "rejected",
        feedback: "Not that one.",
        answers: ["2"],
      },
    });
    await drain(t.deps);
    const resolved = (await t.log(run)).find((e) => e.type === "approval_resolved");
    expect(resolved?.payload).toEqual({
      call_id: "call_9",
      decision: "rejected",
      feedback: "Not that one.",
      answers: ["2"],
    });
  });

  it("builds VerbContext from the run row and hands the verb the latest lesson", async () => {
    const seen: VerbContext[] = [];
    const t = await setup(
      [
        { calls: [{ verb: "lesson_draft" }] },
        { calls: [{ verb: "lesson_edit", input: { pod: "evil" } }] },
        { text: "ok" },
      ],
      fakeVerbs({
        lesson_edit: async (context) => {
          seen.push(context);
          return { output: {}, lesson_file: { id: "made-up", parts: [1] } };
        },
      }),
    );
    const run = await t.say("Go.");
    await drain(t.deps);
    expect(seen[0]).toMatchObject({
      pod: t.member.pod,
      created_by: t.member.account,
      run_id: run,
      call_id: "call_2",
      lesson: { revision: 1, lesson_file: { id: "made-up", parts: [] } },
    });
    const revisions = (await t.log(run)).flatMap((e) =>
      e.type === "lesson_revision" ? [e.payload.revision] : [],
    );
    expect(revisions).toEqual([1, 2]);
  });

  it("copies a verb's view into its tool_result, as lesson_check's findings", async () => {
    // lesson_check names the run's draft, known once the parent has spoken.
    const check: Record<string, unknown> = { help: {}, names: [] };
    const t = await setup(
      [
        { calls: [{ verb: "lesson_draft", input: DRAFT_INPUT }] },
        { calls: [{ verb: "lesson_check", input: check }] },
        { text: "Ready." },
      ],
      createVerbs({ bank: fixtureBank() }),
    );
    const run = await t.say("Adding within 20, grade 1.");
    check["draft_id"] = run;
    await drain(t.deps);

    const results = (await t.log(run)).flatMap((e) =>
      e.type === "tool_result" ? [e.payload] : [],
    );
    // Every verb answers a typed view now (dl-z5ja.69): lesson_draft names the steps it wrote.
    expect(results.find((r) => r.verb === "lesson_draft")?.view).toMatchObject({
      kind: "lesson_draft",
      data: { changed_step_ids: expect.arrayContaining(["s01"]) },
    });
    const checked = results.find((r) => r.verb === "lesson_check");
    expect(checked?.error).toBeNull();
    expect(checked?.view).toEqual({
      kind: "lesson_check",
      data: { publishable: expect.any(Boolean), findings: expect.any(Array) },
    });
  });

  it("writes a VerbError as the tool's error for the model to read", async () => {
    const t = await setup(
      [{ calls: [{ verb: "lesson_edit" }] }, { text: "Sorry." }],
      fakeVerbs({
        lesson_edit: () => Promise.reject(new VerbError("NoSuchStep", "there is no step s9")),
      }),
    );
    const run = await t.say("Edit s9.");
    await drain(t.deps);
    const result = (await t.log(run)).find((e) => e.type === "tool_result");
    expect(result?.payload).toMatchObject({ output: null, error: { type: "NoSuchStep" } });
    expect(JSON.stringify(t.muse.calls[1]?.input)).toContain("there is no step s9");
  });

  it("fills the guard's names from the pod's learners, never from model input", async () => {
    const t = await setup([{ text: "Hello." }]);
    await t.store.putLearner(t.member.pod, { handle: "fox", first_name: "Fox" });
    await t.say("Hi.");
    await drain(t.deps);
    expect(t.muse.calls[0]?.names).toEqual(["Fox", "fox"]);
  });

  it("names only the run's own pod's learners, and another pod's never reach a MuseRequest", async () => {
    const OTHER = ["Wren", "wren", "Juniper", "juniper"];
    // The model asks lesson_show for pod B's draft, by its run id, once pod B exists.
    const show: Record<string, unknown> = {};
    // Pod B: another family with made-up learners, and a run whose lesson names one of them.
    const t = await setup(
      [
        { calls: [{ verb: "lesson_draft", input: DRAFT_INPUT }] },
        { calls: [{ verb: "lesson_show", input: show }] },
        { text: "Ready." },
      ],
      createVerbs({ bank: fixtureBank() }),
    );
    const other = await t.store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
    await t.store.putLearner(other.pod, { handle: "wren", first_name: "Wren" });
    await t.store.putLearner(other.pod, { handle: "juniper", first_name: "Juniper" });
    const theirs = await theirRun(t.store, other, "A lesson for Wren and Juniper");
    // Pod A, the run's own: 2 made-up learners.
    await t.store.putLearner(t.member.pod, { handle: "fox", first_name: "Fox" });
    await t.store.putLearner(t.member.pod, { handle: "ash", first_name: "Ash" });
    show["draft_id"] = theirs;

    const run = await t.say("Adding within 20 for Fox, grade 1.");
    await drain(t.deps);

    expect(t.muse.calls).toHaveLength(3);
    for (const call of t.muse.calls) {
      expect([...call.names].sort()).toEqual(["Ash", "Fox", "ash", "fox"]);
      const sent = JSON.stringify(call);
      for (const name of OTHER) expect(sent).not.toContain(name);
    }
    const shown = (await t.log(run)).find(
      (e) => e.type === "tool_result" && e.payload.verb === "lesson_show",
    );
    expect(shown?.payload).toMatchObject({ output: null, error: { type: "unknown-draft" } });
    expect((await t.run(run)).status).toBe("completed");
  });

  it("delivers a follow-up sent mid-call once, at the next step", async () => {
    const t = await setup(
      [{ calls: [{ verb: "lesson_draft" }] }, { text: "Done." }],
      fakeVerbs({
        lesson_draft: async () => {
          await t.say("Make it 5.");
          return undefined;
        },
      }),
    );
    const run = await t.say("Adding.");
    await drain(t.deps);
    const parent = (await t.log(run)).filter(
      (e) => e.type === "message" && e.payload.from === "parent",
    );
    expect(parent).toHaveLength(2);
    expect(JSON.stringify(t.muse.calls[0])).not.toContain("Make it 5.");
    expect(JSON.stringify(t.muse.calls[1])).toContain("Make it 5.");
  });

  it("keeps the turn open for a message that arrives during the final call", async () => {
    let t: Awaited<ReturnType<typeof setup>>;
    const muse: MuseClient = {
      respond: async (request) => {
        if (request.call_no === 1) await t.say("One more thing.");
        return {
          response_id: `resp_${request.call_no}`,
          model: "fake",
          // Words, not digits: no tool result gave a number for the answer check (dl-z5ja.26).
          text: request.call_no === 1 ? "First answer." : "Second answer.",
          tool_calls: [],
          usage: { input_tokens: 1, output_tokens: 1, cached_tokens: 0 },
          cost_usd: 0.01,
        };
      },
    };
    t = await setup([]);
    t.deps.muse = muse;
    const run = await t.say("Start.");
    await drain(t.deps);
    const texts = (await t.log(run)).flatMap((e) => (e.type === "message" ? [e.payload.text] : []));
    expect(texts).toEqual(["Start.", "First answer.", "One more thing.", "Second answer."]);
    expect((await t.run(run)).status).toBe("completed");
  });

  it("drops words beside tool calls that fail the answer check, and checks the last answer", async () => {
    const t = await setup([
      { text: "Drafting 12 questions now.", calls: [{ verb: "lesson_draft" }] },
      { text: "Ready." },
    ]);
    const run = await t.say("Halves.");
    await drain(t.deps);
    const agent = (await t.log(run)).flatMap((e) =>
      e.type === "message" && e.payload.from === "agent" ? [e.payload.text] : [],
    );
    expect(agent).toEqual(["Ready."]);
    expect(t.muse.calls).toHaveLength(2);
  });

  it("a redelivery after a refused answer still makes the one correction", async () => {
    const t = await setup([{ text: "All 9 done." }, { text: "Done." }, { text: "Done." }]);
    // The step after the refusal dies before its correction call is recorded.
    t.store.crashOn = (events) =>
      events.some((e) => e.type === "model_response" && e.payload.call_no === 2);
    const run = await t.say("Halves.");
    await drain(t.deps);
    t.tick(STEP_VISIBILITY_S * 1000 + 1000);
    await drain(t.deps);

    // Call 2 was paid before the crash and is asked again: the price of a crash mid-call, as before.
    expect(t.muse.calls.map((c) => c.call_no)).toEqual([1, 2, 2]);
    for (const call of t.muse.calls.slice(1)) expect(call.instructions).toContain('"9"');
    const events = await t.log(run);
    expect(events.filter((e) => e.type === "model_response").map((e) => e.payload.call_no)).toEqual(
      [1, 2],
    );
    const agent = events.flatMap((e) =>
      e.type === "message" && e.payload.from === "agent" ? [e.payload.text] : [],
    );
    expect(agent).toEqual(["Done."]);
    expect((await t.run(run)).status).toBe("completed");
  });

  it("reuses a recorded model_response after a crash and pays once", async () => {
    const t = await setup([
      { calls: [{ verb: "lesson_draft" }], cost_usd: 0.02 },
      { text: "Here." },
    ]);
    t.store.crashOn = (events) => events.some((e) => e.type === "tool_result");
    const run = await t.say("Counting.");
    await drain(t.deps);
    expect((await t.run(run)).status).toBe("in_progress");
    t.tick(STEP_VISIBILITY_S * 1000 + 1000);
    await drain(t.deps);

    const events = await t.log(run);
    expect(t.muse.calls.map((c) => c.call_no)).toEqual([1, 2]);
    expect(events.filter((e) => e.type === "model_response")).toHaveLength(2);
    expect(events.filter((e) => e.type === "tool_result")).toHaveLength(1);
    expect(events.find((e) => e.type === "error")?.payload).toMatchObject({
      error: { type: RUN_ERROR_TYPE.stepTimedOut },
      // Call 1 claimed attempt 2, which stalled; the redelivery took 3, and call 2 took 4.
      attempt: 2,
      retryable: true,
    });
    expect(await t.run(run)).toMatchObject({ status: "completed", attempt: 4, spent_usd: 0.03 });
  });

  it("2 runStep calls on one {run_id, attempt} at once call Muse once, with one turn_complete", async () => {
    const t = await setup([]);
    const muse = new ScriptedMuse([{ text: "Ready." }]);
    t.deps.muse = muse;
    const run = await t.say("Halves.");
    const step = { run_id: run, attempt: 1 };
    const outputs = await Promise.all([runStep(step, t.deps), runStep(step, t.deps)]);

    expect(muse.calls).toHaveLength(1);
    expect(outputs.map((o) => o.outcome).sort()).toEqual(["continue", "turn_complete"]);
    const events = await t.log(run);
    expect(events.filter((e) => e.type === "model_response")).toHaveLength(1);
    expect(events.filter((e) => e.type === "turn_complete")).toHaveLength(1);
    expect(events.filter((e) => e.type === "message").map((e) => e.payload.text)).toEqual([
      "Halves.",
      "Ready.",
    ]);
  });

  it("2 steps racing on a tool turn pay each call once, and the turn completes", async () => {
    const t = await setup([]);
    const muse = new ScriptedMuse([
      { tool_calls: [{ verb: "lesson_draft", input: {} }] },
      { text: "Ready." },
    ]);
    t.deps.muse = muse;
    const run = await t.say("Halves.");
    await Promise.all([
      runStep({ run_id: run, attempt: 1 }, t.deps),
      runStep({ run_id: run, attempt: 1 }, t.deps),
    ]);
    await drain(t.deps);

    expect(muse.calls.map((c) => c.call_no)).toEqual([1, 2]);
    const events = await t.log(run);
    expect(events.filter((e) => e.type === "tool_result")).toHaveLength(1);
    expect(events.filter((e) => e.type === "turn_complete")).toHaveLength(1);
    expect((await t.run(run)).status).toBe("completed");
  });

  it("a stalled attempt goes stale once a redelivery claims the run, and writes nothing", async () => {
    let release = () => {};
    let entered = () => {};
    const inDraft = new Promise<void>((r) => {
      entered = r;
    });
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let calls = 0;
    const t = await setup(
      [{ calls: [{ verb: "lesson_draft" }] }, { text: "Ready." }],
      fakeVerbs({
        lesson_draft: async () => {
          calls += 1;
          if (calls === 1) {
            entered();
            await gate;
          }
          return undefined;
        },
      }),
    );
    const run = await t.say("Odd and even.");
    const first = drain(t.deps);
    await inDraft;
    t.tick(STEP_VISIBILITY_S * 1000 + 1000);
    await drain(t.deps);
    const before = await t.log(run);
    release();
    expect((await first).map((o) => o.outcome)).toEqual(["continue"]);
    expect(await t.log(run)).toEqual(before);
    expect(calls).toBe(2);
    expect(t.muse.calls).toHaveLength(2);
  });

  it("a step for an ended run, or with a stale attempt, writes nothing", async () => {
    const t = await setup([{ text: "Tell me a topic." }]);
    const run = await t.say("Grade 1?");
    await drain(t.deps);
    const ended = await t.log(run);
    expect(await runStep({ run_id: run, attempt: 1 }, t.deps)).toEqual({
      outcome: "turn_complete",
      events: 0,
    });
    const open = await t.say("Another.");
    expect(await runStep({ run_id: open, attempt: 7 }, t.deps)).toEqual({
      outcome: "continue",
      events: 0,
    });
    expect(await t.log(run)).toEqual(ended);
    expect(await t.log(open)).toEqual([]);
    expect(t.muse.calls).toHaveLength(1);
  });

  it("steers at half the cap, then stops at 90% without buying another reply", async () => {
    const t = await setup(
      [
        { calls: [{ verb: "lesson_draft" }], cost_usd: 0.06 },
        { calls: [{ verb: "lesson_check" }], cost_usd: 0.035 },
        { text: "never bought" },
      ],
      fakeVerbs(),
      0.1,
    );
    const run = await t.say("Shapes.");
    await drain(t.deps);
    const events = await t.log(run);
    expect(types(events).slice(-5)).toEqual([
      "tool_result",
      "budget_steer",
      "message",
      "status",
      "turn_complete",
    ]);
    const steers = events.flatMap((e) => (e.type === "budget_steer" ? [e.payload.level] : []));
    expect(steers).toEqual(["steer", "stop"]);
    expect(t.muse.calls).toHaveLength(2);
    expect(t.muse.calls[1]?.instructions).toContain("half of this turn's budget");
    expect(t.muse.calls[0]?.instructions).not.toContain("half of this turn's budget");
    expect(await t.run(run)).toMatchObject({ status: "completed" });
    expect(events.at(-1)?.type).toBe("turn_complete");
  });

  it("checks cancel before each verb: the running one finishes, the next never starts", async () => {
    let checked = 0;
    const t = await setup(
      [{ calls: [{ verb: "lesson_draft" }, { verb: "lesson_check" }] }, { text: "never sent" }],
      fakeVerbs({
        lesson_draft: async () => {
          await t.send({ event_id: newEventId(), kind: "cancel", payload: {} });
          return undefined;
        },
        lesson_check: async () => {
          checked += 1;
          return undefined;
        },
      }),
    );
    const run = await t.say("Time.");
    const outputs = await drain(t.deps);
    expect(outputs.map((o) => o.outcome)).toEqual(["cancelled"]);
    expect(checked).toBe(0);
    const events = await t.log(run);
    expect(events.filter((e) => e.type === "tool_result")).toHaveLength(1);
    expect(types(events).slice(-2)).toEqual(["status", "turn_complete"]);
    expect((await t.run(run)).status).toBe("cancelled");
  });

  it("hands a step that throws to onError with its run, attempt and msg_id, and keeps it queued", async () => {
    const t = await setup([]);
    // The store throws on the step's first write, as a missing grant would.
    t.store.crashOn = () => true;
    const run = await t.say("Halves.");
    const seen: [unknown, unknown][] = [];
    const outputs = await drain(t.deps, { onError: (error, step) => seen.push([error, step]) });

    expect(outputs).toEqual([]);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.[0]).toMatchObject({ message: "the process died" });
    expect(seen[0]?.[1]).toEqual({ run_id: run, attempt: 1, msg_id: 1, read_ct: 1 });
    t.tick(STEP_VISIBILITY_S * 1000 + 1000);
    const [again] = await t.queue.read(STEP_VISIBILITY_S, 1);
    expect(again).toMatchObject({ msg_id: 1, read_ct: 2, message: { run_id: run } });
  });

  it("leaves a step that throws in the queue, and the dead letter takes it after MAX_READS", async () => {
    const t = await setup([]);
    await t.say("Muse is down.");
    for (let i = 0; i < 5; i++) {
      await drain(t.deps);
      t.tick(STEP_VISIBILITY_S * 1000 + 1000);
    }
    expect(await t.queue.deadLetters()).toHaveLength(1);
  });
});

describe("the run's own error types", () => {
  it("are the contract's constants, which the page draws its limit lines from", () => {
    expect(RUN_ERROR_TYPE).toEqual({
      stepTimedOut: "StepTimedOut",
      runTimedOut: "RunTimedOut",
      answerUnchecked: "AnswerUnchecked",
    });
  });
});

describe("sweep", () => {
  it("closes an idle run on its idle clock, with its waiting message kept", async () => {
    const t = await setup([]);
    const run = await t.say("Money.");
    t.tick(RUN_IDLE_MS - 1);
    expect(await sweep(t.deps, t.now())).toEqual({ idle: [], max: [] });
    t.tick(1);
    expect(await sweep(t.deps, t.now())).toEqual({ idle: [run], max: [] });
    expect(types(await t.log(run))).toEqual(["message", "status", "turn_complete"]);
    expect(await t.run(run)).toMatchObject({ status: "completed", attempt: 2 });
    expect(await sweep(t.deps, t.now())).toEqual({ idle: [], max: [] });
    // The step still in the queue finds an ended run and writes nothing.
    await drain(t.deps);
    expect(t.muse.calls).toHaveLength(0);
  });

  it("leaves a turn open while a verb runs past RUN_IDLE_MS, and the turn completes", async () => {
    const swept: Awaited<ReturnType<typeof sweep>>[] = [];
    let t: Awaited<ReturnType<typeof setup>>;
    t = await setup(
      [{ calls: [{ verb: "lesson_draft" }] }, { text: "Ready." }],
      fakeVerbs({
        lesson_draft: async () => {
          for (let i = 0; i < 3; i++) {
            t.tick(RUN_IDLE_MS / 2);
            swept.push(await sweep(t.deps, t.now()));
          }
          return undefined;
        },
      }),
    );
    const run = await t.say("A slow draft.");
    await drain(t.deps);

    expect(swept).toEqual([
      { idle: [], max: [] },
      { idle: [], max: [] },
      { idle: [], max: [] },
    ]);
    expect(types(await t.log(run)).slice(-2)).toEqual(["status", "turn_complete"]);
    expect(await t.run(run)).toMatchObject({ status: "completed" });
    expect(t.muse.calls).toHaveLength(2);
  });

  it("gives the idle clock back once the verbs are done", async () => {
    let t: Awaited<ReturnType<typeof setup>>;
    let held: string | null = null;
    t = await setup(
      [{ calls: [{ verb: "lesson_draft" }] }],
      fakeVerbs({
        lesson_draft: async (context) => {
          held = (await t.run(context.run_id)).idle_deadline_at;
          t.tick(RUN_IDLE_MS * 2);
          return undefined;
        },
      }),
    );
    const run = await t.say("Halves.");
    const [queued] = await t.queue.read(STEP_VISIBILITY_S, 1);
    if (!queued) throw new Error("no step queued");
    await runStep(queued.message, t.deps);

    const stored = await t.run(run);
    expect(held).toBe(stored.max_deadline_at);
    expect(stored.idle_deadline_at).toBe(new Date(t.now().getTime() + RUN_IDLE_MS).toISOString());
  });

  it("still fails a run on max_deadline_at while a verb runs", async () => {
    let t: Awaited<ReturnType<typeof setup>>;
    let swept: Awaited<ReturnType<typeof sweep>> | null = null;
    t = await setup(
      [{ calls: [{ verb: "lesson_draft" }] }, { text: "never sent" }],
      fakeVerbs({
        lesson_draft: async () => {
          t.tick(RUN_MAX_MS);
          swept = await sweep(t.deps, t.now());
          return undefined;
        },
      }),
    );
    const run = await t.say("Forever.");
    await drain(t.deps);

    expect(swept).toEqual({ idle: [], max: [run] });
    expect((await t.run(run)).status).toBe("failed");
    expect(t.muse.calls).toHaveLength(1);
  });

  it("takes back a verb hold left by a step that died", async () => {
    const t = await setup([{ text: "Back." }]);
    const run = await t.say("Halves.");
    const stored = await t.run(run);
    // The step before died inside a verb, holding the idle clock at the max deadline.
    await t.store.updateRun(t.member.pod, run, stored.attempt, {
      idle_deadline_at: stored.max_deadline_at,
    });
    let idle: string | null = null;
    const scripted = t.deps.muse;
    t.deps.muse = {
      respond: async (request) => {
        idle = (await t.run(run)).idle_deadline_at;
        return scripted.respond(request);
      },
    };
    await drain(t.deps);
    expect(idle).toBe(new Date(t.now().getTime() + RUN_IDLE_MS).toISOString());
    expect((await t.run(run)).status).toBe("completed");
  });

  it("fails a run past max_deadline_at even while activity keeps idle away", async () => {
    const t = await setup([]);
    const run = await t.say("Long.");
    await t.store.updateRun(t.member.pod, run, 1, {
      idle_deadline_at: new Date(t.now().getTime() + 2 * RUN_MAX_MS).toISOString(),
    });
    t.tick(RUN_MAX_MS);
    expect(await sweep(t.deps, t.now())).toEqual({ idle: [], max: [run] });
    const events = await t.log(run);
    expect(types(events)).toEqual(["message", "error", "status", "turn_complete"]);
    expect(events[1]?.payload).toMatchObject({
      error: { type: RUN_ERROR_TYPE.runTimedOut },
      retryable: false,
    });
    expect((await t.run(run)).status).toBe("failed");
  });
});
