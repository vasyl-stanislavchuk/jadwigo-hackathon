import { type AccountId, ErrorType, type PodId } from "@jadwigo/contracts";
import {
  type ConversationId,
  type NewRunEvent,
  RUN_IDLE_MS,
  RUN_IDLE_PUSH_MS,
  RUN_MAX_MS,
  type Run,
  type RunError,
  type RunEvent,
  type RunId,
  type RunInbox,
  type RunStatus,
  type RunStepInput,
  type RunStepOutcome,
  type RunStepOutput,
  type ToolCall,
} from "@jadwigo/contracts/run";
import { budgetGuard, deadlineDue } from "@jadwigo/core";
import { type NewRunInbox, type RunChange, type Store, StoreError } from "@jadwigo/store";
import type { MuseClient, MuseInput } from "../muse/client.ts";
import type { RunQueue } from "../queue/types.ts";
import { type QueuedStep, STEP_VISIBILITY_S } from "../queue/types.ts";
import type { Verbs } from "../verbs/types.ts";
import { type VerbContext, type VerbEffect, VerbError } from "../verbs/types.ts";
import { eventIdFor, runIdFor } from "./ids.ts";

/**
 * The engine's loop (Lead decisions 5-9, 13): a message lands in the run inbox, a step is one Muse
 * call and the verbs it asks for, every effect is a run event. Step 0 (dl-z5ja.12) fixed these
 * signatures; the runner lane (dl-z5ja.16) wrote the bodies.
 */

/** What a run needs from outside, each an adapter wave 2 swaps for a real one. */
export interface EngineDeps {
  store: Store;
  muse: MuseClient;
  verbs: Verbs;
  queue: RunQueue;
  /** The engine's only clock. */
  now: () => Date;
}

/** An inbox row as the caller gives it: the engine names the run. */
export type InboxEntry = NewRunInbox extends infer R
  ? R extends NewRunInbox
    ? Omit<R, "run_id">
    : never
  : never;

export interface AcceptMessage {
  pod: PodId;
  created_by: AccountId;
  conversation_id: ConversationId;
  entry: InboxEntry;
  /** The new run's budget; the runner's default when absent. */
  cap_usd?: number;
}

/** A turn's budget when the caller names none. */
const DEFAULT_CAP_USD = 1;

/**
 * The run's own error types, which never reach the API's `{error}` envelope, so they are not
 * `ErrorType`s. They belong beside `RunError` in `@jadwigo/contracts/run` (a note to the lead).
 */
const RUN_ERROR = {
  /** A step ran past its visibility timeout and was delivered again. */
  stepTimedOut: "StepTimedOut",
  /** The turn ran past `max_deadline_at`. */
  runTimedOut: "RunTimedOut",
} as const;

const WORKFLOW = "jadwigo-lesson-compose";
const TAG = "product:lesson-compose";
const INSTRUCTIONS = [
  "You help a parent make a short lesson for their child in the first school grades.",
  "Draft it with lesson_draft, read it with lesson_show, change a step with lesson_edit and check it with lesson_check.",
  "The draft you are working on has the id of this run. Answer the parent in their language, briefly.",
].join("\n");
const PROMPT_CACHE_KEY = `${WORKFLOW}:1`;
const STEER =
  "You have used half of this turn's budget. Finish the lesson with what you have, with no more searching.";
const STOP_TEXT = "I stopped here to stay within the budget. The lesson so far is on the right.";

const ENDED: ReadonlySet<RunStatus> = new Set(["completed", "failed", "cancelled"]);

function isEnded(status: RunStatus): boolean {
  return ENDED.has(status);
}

/** What a step answers for a run that has already ended. */
function endedOutcome(status: RunStatus): RunStepOutcome | null {
  if (status === "completed") return "turn_complete";
  if (status === "failed") return "failed";
  if (status === "cancelled") return "cancelled";
  return null;
}

function at(ms: number): string {
  return new Date(ms).toISOString();
}

/** The step's attempt moved on: another step holds the run, so this one writes nothing more. */
class StaleAttempt extends Error {}

/** Every write of one step, fenced on its attempt. Keeps the log it read, plus what it wrote. */
class Writer {
  appended = 0;

  constructor(
    readonly store: Store,
    readonly pod: PodId,
    readonly run: RunId,
    readonly attempt: number,
    readonly log: RunEvent[],
  ) {}

  async append(events: readonly NewRunEvent[]): Promise<void> {
    if (events.length === 0) return;
    const written = await this.store.appendRunEvents(this.pod, this.run, this.attempt, events);
    if (written.stale) throw new StaleAttempt();
    const known = new Set(this.log.map((e) => e.event_id));
    for (const event of written.value) {
      if (known.has(event.event_id)) continue;
      known.add(event.event_id);
      this.log.push(event);
      this.appended += 1;
    }
  }

  async update(change: RunChange): Promise<Run> {
    const updated = await this.store.updateRun(this.pod, this.run, this.attempt, change);
    if (updated.stale) throw new StaleAttempt();
    return updated.value;
  }

  /** The run as stored now, while this step still holds it. */
  async current(): Promise<Run> {
    const run = await this.store.getRun(this.pod, this.run);
    if (run.attempt !== this.attempt) throw new StaleAttempt();
    return run;
  }

  id(...parts: readonly (string | number)[]) {
    return eventIdFor(this.run, ...parts);
  }
}

/** A fenced write that re-reads and retries while the run's attempt moves under it. */
async function updateLatest(
  store: Store,
  pod: PodId,
  run: Run,
  change: (run: Run) => RunChange | null,
): Promise<{ run: Run; changed: boolean }> {
  let current = run;
  for (let tries = 0; tries < 5; tries++) {
    const wanted = change(current);
    if (!wanted) return { run: current, changed: false };
    const updated = await store.updateRun(pod, current.id, current.attempt, wanted);
    if (!updated.stale) return { run: updated.value, changed: true };
    current = updated.value;
  }
  throw new Error(`run ${run.id} kept changing while a message was accepted`);
}

/**
 * Takes what the parent sent, in one unit: the inbox row by its `event_id` (a resend lands once),
 * on the conversation's open run, or on a new run (one per turn) when none is open; and a step
 * enqueued when no step is pending. A message mid-turn waits for the next step and is never lost
 * (`07e5926b92a`, `84ebde9e18f`). A cancel sets `cancel_requested_at`.
 *
 * A run `queued` or `in_progress` has a step pending or running, which takes the inbox, so only a
 * new run or one `awaiting_input` gets a step here. A new run's id comes from the message's
 * `event_id`, so a resend of the message that opened a turn finds that turn.
 */
export function acceptMessage(
  deps: EngineDeps,
  message: AcceptMessage,
): Promise<{ run: Run; inbox: RunInbox }> {
  const { store, queue } = deps;
  const { pod, conversation_id, entry } = message;
  return store.unit(async () => {
    const runs = await store.listRuns(pod, conversation_id);
    const open = runs.findLast((r) => !isEnded(r.status));

    if (entry.kind !== "message" && !open) {
      // Nothing is running: a cancel, a steer or an approval lands on the last turn and changes nothing.
      const last = runs.at(-1);
      if (!last) {
        throw new StoreError(
          ErrorType.enum.BadRequest,
          `the conversation has no run for a ${entry.kind}`,
        );
      }
      return { run: last, inbox: await store.putRunInbox(pod, { ...entry, run_id: last.id }) };
    }

    if (open) {
      const inbox = await store.putRunInbox(pod, { ...entry, run_id: open.id });
      if (inbox.run_id !== open.id) {
        // A resend of a message an earlier turn already holds.
        return { run: await store.getRun(pod, inbox.run_id), inbox };
      }
      const now = deps.now().getTime();
      const cancel = entry.kind === "cancel";
      const woken = await updateLatest(store, pod, open, (run) => {
        const change: RunChange = {};
        if (cancel && run.cancel_requested_at === null) change.cancel_requested_at = at(now);
        if (run.status === "awaiting_input") {
          change.status = "queued";
          change.idle_deadline_at = at(now + RUN_IDLE_MS);
        }
        return Object.keys(change).length > 0 ? change : null;
      });
      if (woken.changed && open.status === "awaiting_input" && woken.run.status === "queued") {
        await queue.send({ run_id: woken.run.id, attempt: woken.run.attempt });
      }
      return { run: woken.run, inbox };
    }

    const id = await runIdFor(entry.event_id);
    const resent = runs.find((r) => r.id === id);
    if (resent)
      return { run: resent, inbox: await store.putRunInbox(pod, { ...entry, run_id: id }) };

    const now = deps.now().getTime();
    const run = await store.createRun(pod, {
      id,
      created_by: message.created_by,
      conversation_id,
      workflow: WORKFLOW,
      resumes_run_id: null,
      cap_usd: message.cap_usd ?? DEFAULT_CAP_USD,
      idle_deadline_at: at(now + RUN_IDLE_MS),
      max_deadline_at: at(now + RUN_MAX_MS),
    });
    const inbox = await store.putRunInbox(pod, { ...entry, run_id: run.id });
    if (inbox.run_id !== run.id) {
      // A resend of a mid-turn message whose turn has ended: the new run has nothing to do.
      const w = new Writer(store, pod, run.id, run.attempt, []);
      await endTurn(w, "completed", deps.now());
      return { run: await store.getRun(pod, inbox.run_id), inbox };
    }
    await queue.send({ run_id: run.id, attempt: run.attempt });
    return { run, inbox };
  });
}

/**
 * Who a run acts for, from its row: as `apps/api`'s `authorize()` does for attempts. `NotFound` when
 * no pod holds the id. Every `VerbContext` is built from this, never from the model's arguments.
 */
export async function authorizeRun(
  store: Store,
  run: RunId,
): Promise<{ pod: PodId; created_by: AccountId; run: Run }> {
  const pod = await store.findRunPod(run);
  if (!pod) throw new StoreError(ErrorType.enum.NotFound, "no run has that id");
  const row = await store.getRun(pod, run);
  return { pod, created_by: row.created_by, run: row };
}

/**
 * One step: check cancel, status and deadlines; take the inbox in order; fold the log into the
 * Muse request; `budgetGuard` before the call (steer at half, stop at 90%); reuse a recorded
 * `model_response` for this `call_no` instead of paying again; run each tool call through its verb,
 * skipping one whose `tool_result` exists, checking cancel before each; append events with
 * deterministic `event_id`s; then enqueue the next step, wait for input, or end the turn. A step
 * holding a stale `attempt` writes nothing.
 *
 * `RunStepOutcome` has no `stale`: a stale step answers `continue`, since the run goes on under the
 * attempt that took it, with the events it appended before it learned that.
 */
export async function runStep(input: RunStepInput, deps: EngineDeps): Promise<RunStepOutput> {
  let found: Awaited<ReturnType<typeof authorizeRun>>;
  try {
    found = await authorizeRun(deps.store, input.run_id);
  } catch (error) {
    if (error instanceof StoreError && error.type === "NotFound") {
      return { outcome: "failed", events: 0 };
    }
    throw error;
  }
  const ended = endedOutcome(found.run.status);
  if (ended) return { outcome: ended, events: 0 };
  if (found.run.attempt !== input.attempt) return { outcome: "continue", events: 0 };

  const log = [...(await deps.store.listRunEvents(found.pod, found.run.id, 0))];
  const w = new Writer(deps.store, found.pod, found.run.id, input.attempt, log);
  try {
    const outcome = await step(deps, w, found);
    return { outcome, events: w.appended };
  } catch (error) {
    if (error instanceof StaleAttempt) return { outcome: "continue", events: w.appended };
    throw error;
  }
}

interface Scope {
  pod: PodId;
  created_by: AccountId;
  run: Run;
}

async function step(deps: EngineDeps, w: Writer, scope: Scope): Promise<RunStepOutcome> {
  let run = scope.run;
  const { steers } = await takeInbox(deps.store, w);
  const now = deps.now();

  if (deadlineDue(run, now) === "max") {
    await endPastMax(w, run.attempt, now);
    return "failed";
  }

  const start: RunChange = {};
  if (run.status !== "in_progress") start.status = "in_progress";
  const idle = run.idle_deadline_at === null ? null : Date.parse(run.idle_deadline_at);
  if (idle === null || idle - now.getTime() < RUN_IDLE_MS - RUN_IDLE_PUSH_MS) {
    start.idle_deadline_at = at(now.getTime() + RUN_IDLE_MS);
  }
  if (start.status) {
    await w.append([
      {
        type: "status",
        run_id: run.id,
        event_id: await w.id("status", "in_progress", responsesOf(w.log).length),
        payload: { status: "in_progress" },
      },
    ]);
  }
  if (Object.keys(start).length > 0) run = await w.update(start);

  if (await cancelRequested(w)) return endCancelled(deps, w);

  const prior = await priorTurns(deps.store, scope);
  const last = responsesOf(w.log).at(-1);
  let pending = last ? unresolved(last, w.log) : [];

  if (pending.length === 0) {
    if (last && last.payload.tool_calls.length === 0 && !parentSpokeAfter(w.log, last.seq)) {
      // The answer is recorded and nothing came after it: a redelivery ends the turn on it.
      return endTurn(w, "completed", deps.now());
    }

    const spent = spentOf(w.log);
    const level = budgetGuard(spent, run.cap_usd);
    if (level === "stop") {
      await w.append([
        {
          type: "budget_steer",
          run_id: run.id,
          event_id: await w.id("budget", "stop"),
          payload: { level: "stop", spent_usd: spent, cap_usd: run.cap_usd },
        },
        {
          type: "message",
          run_id: run.id,
          event_id: await w.id("budget", "stop", "message"),
          payload: { from: "agent", text: STOP_TEXT },
        },
      ]);
      return endTurn(w, "completed", deps.now());
    }
    const instructions = [INSTRUCTIONS];
    if (level === "steer") {
      await w.append([
        {
          type: "budget_steer",
          run_id: run.id,
          event_id: await w.id("budget", "steer"),
          payload: { level: "steer", spent_usd: spent, cap_usd: run.cap_usd },
        },
      ]);
      instructions.push(STEER);
    }
    for (const text of steers) instructions.push(`The parent adds: ${text}`);

    const call_no = (last?.payload.call_no ?? 0) + 1;
    const response = await deps.muse.respond({
      run_id: run.id,
      call_no,
      tag: TAG,
      prompt_cache_key: PROMPT_CACHE_KEY,
      instructions: instructions.join("\n\n"),
      input: [...prior.input, ...museInput(w.log)],
      tools: Object.values(deps.verbs).map((verb) => verb.tool),
      names: await namesOf(deps.store, scope),
    });
    const total = spent + response.cost_usd;
    const recorded: NewRunEvent[] = [
      {
        type: "model_response",
        run_id: run.id,
        event_id: await w.id("call", call_no, "response"),
        payload: {
          response_id: response.response_id,
          call_no,
          text: response.text,
          tool_calls: [...response.tool_calls],
          usage: response.usage,
          cost_usd: response.cost_usd,
        },
      },
      {
        type: "usage",
        run_id: run.id,
        event_id: await w.id("call", call_no, "usage"),
        payload: { spent_usd: total, cap_usd: run.cap_usd },
      },
    ];
    if (response.text !== null) {
      recorded.push({
        type: "message",
        run_id: run.id,
        event_id: await w.id("call", call_no, "message"),
        payload: { from: "agent", text: response.text },
      });
    }
    for (const call of response.tool_calls) {
      recorded.push({
        type: "tool_call",
        run_id: run.id,
        event_id: await w.id("tool", call.call_id, "call"),
        payload: call,
      });
    }
    // Recorded before any verb runs, so a redelivery reuses it and never pays again.
    await w.append(recorded);
    run = await w.update({ spent_usd: total });

    if (response.tool_calls.length === 0) {
      // A message that came in during the call keeps the turn open for one more step.
      const late = await takeInbox(deps.store, w);
      if (late.messages > 0) {
        await deps.queue.send({ run_id: run.id, attempt: w.attempt });
        return "continue";
      }
      return endTurn(w, "completed", deps.now());
    }
    pending = [...response.tool_calls];
  }

  for (const call of pending) {
    if (await cancelRequested(w)) return endCancelled(deps, w);
    await runTool(deps, w, scope, call, lessonOf(w.log) ?? prior.lesson);
  }
  await deps.queue.send({ run_id: run.id, attempt: w.attempt });
  return "continue";
}

async function runTool(
  deps: EngineDeps,
  w: Writer,
  scope: Scope,
  call: ToolCall,
  lesson: VerbContext["lesson"],
): Promise<void> {
  const context: VerbContext = {
    pod: scope.pod,
    created_by: scope.created_by,
    run_id: scope.run.id,
    call_id: call.call_id,
    lesson,
  };
  let effect: VerbEffect | null = null;
  let error: RunError | null = null;
  try {
    effect = await deps.verbs[call.verb].run(context, call.input);
  } catch (thrown) {
    // A refusal is the model's to read; anything else is a fault, and the step is retried.
    if (!(thrown instanceof VerbError)) throw thrown;
    error = { type: thrown.type, message: thrown.message };
  }
  const events: NewRunEvent[] = [
    {
      type: "tool_result",
      run_id: scope.run.id,
      event_id: await w.id("tool", call.call_id, "result"),
      payload: { call_id: call.call_id, verb: call.verb, output: effect?.output ?? null, error },
    },
  ];
  if (effect?.lesson_file) {
    events.push({
      type: "lesson_revision",
      run_id: scope.run.id,
      event_id: await w.id("tool", call.call_id, "revision"),
      payload: {
        revision: (lesson?.revision ?? 0) + 1,
        call_id: call.call_id,
        lesson_file: effect.lesson_file,
      },
    });
  }
  await w.append(events);
}

/**
 * Takes the run's pending inbox and writes what the log keeps, in one unit, so a stale or failed
 * append gives the rows back on Postgres. A message's event keeps the inbox row's `event_id`, which
 * the page minted. A steer joins this step's instructions; a cancel is already on the run row.
 */
async function takeInbox(
  store: Store,
  w: Writer,
): Promise<{ messages: number; steers: readonly string[] }> {
  return store.unit(async () => {
    const rows = await store.takeRunInbox(w.pod, w.run);
    const events: NewRunEvent[] = [];
    const steers: string[] = [];
    let messages = 0;
    for (const row of rows) {
      if (row.kind === "message") {
        messages += 1;
        const { attachments } = row.payload;
        events.push({
          type: "message",
          run_id: w.run,
          event_id: row.event_id,
          payload: {
            from: "parent",
            text: row.payload.text,
            ...(attachments === undefined ? {} : { attachments }),
          },
        });
      } else if (row.kind === "approval") {
        events.push({
          type: "approval_resolved",
          run_id: w.run,
          event_id: row.event_id,
          payload: { call_id: row.payload.call_id, decision: row.payload.decision },
        });
      } else if (row.kind === "steer") {
        steers.push(row.payload.text);
      }
    }
    await w.append(events);
    return { messages, steers };
  });
}

async function cancelRequested(w: Writer): Promise<boolean> {
  return (await w.current()).cancel_requested_at !== null;
}

/** Ends the turn: its status, then `turn_complete`, then the row. Each write is idempotent. */
async function endTurn(
  w: Writer,
  status: "completed" | "failed" | "cancelled",
  now: Date,
): Promise<RunStepOutcome> {
  await w.append([
    {
      type: "status",
      run_id: w.run,
      event_id: await w.id("status", status),
      payload: { status },
    },
    { type: "turn_complete", run_id: w.run, event_id: await w.id("turn_complete"), payload: {} },
  ]);
  await w.update({ status, completed_at: now.toISOString(), idle_deadline_at: null });
  return endedOutcome(status) ?? "turn_complete";
}

async function endCancelled(deps: EngineDeps, w: Writer): Promise<RunStepOutcome> {
  await takeInbox(deps.store, w);
  return endTurn(w, "cancelled", deps.now());
}

async function endPastMax(w: Writer, attempt: number, now: Date): Promise<void> {
  await w.append([
    {
      type: "error",
      run_id: w.run,
      event_id: await w.id("error", "max"),
      payload: {
        error: { type: RUN_ERROR.runTimedOut, message: "the turn ran past its 30 minutes" },
        attempt,
        retryable: false,
      },
    },
  ]);
  await endTurn(w, "failed", now);
}

type ModelResponse = Extract<RunEvent, { type: "model_response" }>;

function responsesOf(log: readonly RunEvent[]): ModelResponse[] {
  return log
    .filter((e): e is ModelResponse => e.type === "model_response")
    .sort((a, b) => a.payload.call_no - b.payload.call_no);
}

/** The response's tool calls with no `tool_result` yet, in the order the model asked for them. */
function unresolved(response: ModelResponse, log: readonly RunEvent[]): ToolCall[] {
  const done = new Set(log.flatMap((e) => (e.type === "tool_result" ? [e.payload.call_id] : [])));
  return response.payload.tool_calls.filter((call) => !done.has(call.call_id));
}

function parentSpokeAfter(log: readonly RunEvent[], seq: number): boolean {
  return log.some((e) => e.seq > seq && e.type === "message" && e.payload.from === "parent");
}

/** What the run has paid, from the log: each `model_response` counted once. */
function spentOf(log: readonly RunEvent[]): number {
  return responsesOf(log).reduce((sum, e) => sum + e.payload.cost_usd, 0);
}

/** The highest `lesson_revision` in the log. */
function lessonOf(log: readonly RunEvent[]): VerbContext["lesson"] {
  let lesson: VerbContext["lesson"] = null;
  for (const e of log) {
    if (e.type !== "lesson_revision") continue;
    if (!lesson || e.payload.revision > lesson.revision) {
      lesson = { revision: e.payload.revision, lesson_file: e.payload.lesson_file };
    }
  }
  return lesson;
}

/** The run's log as the model reads it: the words, its function calls and their outputs. */
function museInput(log: readonly RunEvent[]): MuseInput[] {
  const input: MuseInput[] = [];
  for (const e of [...log].sort((a, b) => a.seq - b.seq)) {
    if (e.type === "message") {
      input.push({
        type: "message",
        role: e.payload.from === "parent" ? "user" : "assistant",
        text: e.payload.text,
      });
    } else if (e.type === "model_response") {
      for (const call of e.payload.tool_calls) {
        input.push({
          type: "function_call",
          call_id: call.call_id,
          verb: call.verb,
          arguments: call.input,
        });
      }
    } else if (e.type === "tool_result") {
      input.push({
        type: "function_call_output",
        call_id: e.payload.call_id,
        output: e.payload.output ?? { error: e.payload.error },
      });
    }
  }
  return input;
}

/**
 * The conversation's earlier turns: their words, and the lesson the last of them left, so a
 * follow-up turn edits the lesson the turn before drafted.
 */
async function priorTurns(
  store: Store,
  scope: Scope,
): Promise<{ input: MuseInput[]; lesson: VerbContext["lesson"] }> {
  const { pod, run } = scope;
  if (run.conversation_id === null) return { input: [], lesson: null };
  const runs = await store.listRuns(pod, run.conversation_id);
  const here = runs.findIndex((r) => r.id === run.id);
  const before = here < 0 ? runs : runs.slice(0, here);
  const input: MuseInput[] = [];
  let lesson: VerbContext["lesson"] = null;
  for (const earlier of before) {
    const log = await store.listRunEvents(pod, earlier.id, 0);
    input.push(...museInput(log.filter((e) => e.type === "message")));
    const left = lessonOf(log);
    if (left) lesson = left;
  }
  return { input, lesson };
}

/**
 * The names the prompt guard replaces: the pod's learners', read from the run's pod through the
 * Store and never from what the model sent (dl-z5ja.35).
 */
async function namesOf(store: Store, scope: Scope): Promise<string[]> {
  const me = await store.getMe(scope.pod, scope.created_by);
  const names = me.learners.flatMap(({ learner }) => [learner.first_name, learner.handle]);
  return [...new Set(names)];
}

/**
 * The consumer's loop, in-process: reads visible steps and runs each until none is visible. A step
 * that throws stays in the queue and comes back after its visibility timeout, as on pgmq; one that
 * returns is archived. Answers what each step returned. The dev page and the tests run it.
 *
 * A step read a 2nd time is a redelivery: before running it, `drain` claims the run by moving its
 * `attempt` on, so the step that stalled goes stale, and logs the retry as an `error` row naming the
 * attempt that stalled.
 */
export async function drain(
  deps: EngineDeps,
  options: { max_steps?: number } = {},
): Promise<readonly RunStepOutput[]> {
  const max = options.max_steps ?? 100;
  const outputs: RunStepOutput[] = [];
  for (let reads = 0; reads < max; reads++) {
    const [queued] = await deps.queue.read(STEP_VISIBILITY_S, 1);
    if (!queued) break;
    try {
      const input = queued.read_ct > 1 ? await claim(deps, queued) : queued.message;
      outputs.push(await runStep(input, deps));
      await deps.queue.archive(queued.msg_id);
    } catch {
      // The step stays in the queue, hidden until its visibility timeout, then delivered again.
    }
  }
  return outputs;
}

/**
 * Claims a redelivered step's run. Each earlier redelivery moved the attempt on by one, so read
 * `read_ct` expects the run at `attempt + read_ct - 2` and takes it to the next. A run at any other
 * attempt has moved on without this message, which then runs stale and writes nothing.
 */
async function claim(deps: EngineDeps, queued: QueuedStep): Promise<RunStepInput> {
  const { store } = deps;
  const { message } = queued;
  const pod = await store.findRunPod(message.run_id);
  if (!pod) return message;
  const run = await store.getRun(pod, message.run_id);
  const held = message.attempt + queued.read_ct - 2;
  if (isEnded(run.status) || run.attempt !== held) return message;
  const attempt = held + 1;
  const claimed = await store.updateRun(pod, run.id, held, { attempt });
  if (claimed.stale) return message;
  const w = new Writer(store, pod, run.id, attempt, []);
  await w.append([
    {
      type: "error",
      run_id: run.id,
      event_id: await w.id("retry", held),
      payload: {
        error: {
          type: RUN_ERROR.stepTimedOut,
          message: "the step ran past its visibility timeout and was retried",
        },
        attempt: held,
        retryable: true,
      },
    },
  ]);
  return { run_id: run.id, attempt };
}

/**
 * The deadline sweep (`pg_cron` in wave 2): every run `listRunsDue(now)` names is ended. Past
 * `max_deadline_at` it fails with an `error` event; past only `idle_deadline_at` its turn closes.
 * Either way the log ends with `turn_complete`. Answers the runs it ended, by clock.
 *
 * It claims each run first by moving its `attempt` on, so a step still running goes stale.
 */
export async function sweep(deps: EngineDeps, now: Date): Promise<{ idle: RunId[]; max: RunId[] }> {
  const { store } = deps;
  const ended: { idle: RunId[]; max: RunId[] } = { idle: [], max: [] };
  for (const { pod, run } of await store.listRunsDue(now.toISOString())) {
    const due = deadlineDue(run, now);
    if (!due) continue;
    const attempt = run.attempt + 1;
    const claimed = await store.updateRun(pod, run.id, run.attempt, { attempt });
    if (claimed.stale) continue;
    const log = [...(await store.listRunEvents(pod, run.id, 0))];
    const w = new Writer(store, pod, run.id, attempt, log);
    try {
      await takeInbox(store, w);
      if (due === "max") {
        await endPastMax(w, run.attempt, now);
      } else {
        await endTurn(w, "completed", now);
      }
    } catch (error) {
      if (error instanceof StaleAttempt) continue;
      throw error;
    }
    ended[due].push(run.id);
  }
  return ended;
}
