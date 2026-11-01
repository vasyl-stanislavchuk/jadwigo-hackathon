import { type AccountId, ErrorType, type EventId, type PodId } from "@jadwigo/contracts";
import {
  type ConversationId,
  type MessageContext,
  type ModelTier,
  type NewRunEvent,
  RUN_ERROR_TYPE,
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
import { type AnswerMiss, budgetGuard, checkAnswer, deadlineDue } from "@jadwigo/core";
import { parseLessonFileLenient } from "@jadwigo/lesson-import/file";
import { type NewRunInbox, type RunChange, type Store, StoreError } from "@jadwigo/store";
import { FENCE_RULE, fence, neutralise } from "../fence/index.ts";
import { type MuseClient, MuseFailed, type MuseInput, type MuseResponse } from "../muse/client.ts";
import type { RunQueue } from "../queue/types.ts";
import { type QueuedStep, STEP_VISIBILITY_S } from "../queue/types.ts";
import { mergePatch } from "../verbs/input.ts";
import type { Verbs } from "../verbs/types.ts";
import { type VerbContext, type VerbEffect, VerbError } from "../verbs/types.ts";
import { eventIdFor, turnRunIdFor } from "./ids.ts";

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
  /**
   * The tier every call of a run asks for: the host sets it from `JADWIGO_MUSE_TIER`. Absent, the
   * runner asks for `contributor` (decision `dl-uafq`). A `model_response` records the tier that
   * answered, which the client may name.
   */
  tier?: ModelTier;
  /**
   * Told when something the run should not stay silent about happened; the host logs it with the
   * run id. Today: a client answered on a less private tier than the run asked for (dl-z5ja.91).
   */
  onWarning?: (warning: EngineWarning) => void;
}

/** What `onWarning` is told. */
export interface EngineWarning {
  kind: "tier_downgraded";
  run_id: RunId;
  call_no: number;
  requested: ModelTier;
  answered: ModelTier;
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

const WORKFLOW = "jadwigo-lesson-compose";
const TAG = "product:lesson-compose";
const INSTRUCTIONS = [
  "You help a parent make a short lesson for their child in the first school grades.",
  "Draft it with lesson_draft, read it with lesson_show, change a step with lesson_edit and check it with lesson_check.",
  "The draft you are working on has the id of this run. Answer the parent in their language, briefly.",
  FENCE_RULE,
].join("\n");
/** Moves on with `INSTRUCTIONS`: 2 since the fence rule (dl-z5ja.47). */
const PROMPT_CACHE_KEY = `${WORKFLOW}:2`;
/**
 * The tier a run's calls go to when the host names none: the owner's decision `dl-uafq` runs the
 * engine on `contributor` until a private tier is named (`JADWIGO_MUSE_TIER`, dl-z5ja.91).
 */
const DEFAULT_TIER: ModelTier = "contributor";
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
    public attempt: number,
    readonly log: RunEvent[],
  ) {}

  /**
   * Claims the run for one paid call (dl-z5ja.41): moves `attempt` on, a compare and set only one
   * caller holding this attempt wins, then reads the log back as stored, so the call is built from
   * what every caller wrote before it. The loser goes stale and pays nothing.
   */
  async claim(): Promise<Run> {
    const next = this.attempt + 1;
    const claimed = await this.store.updateRun(this.pod, this.run, this.attempt, { attempt: next });
    if (claimed.stale) throw new StaleAttempt();
    this.attempt = next;
    const stored = await this.store.listRunEvents(this.pod, this.run, 0);
    this.log.splice(0, this.log.length, ...stored);
    return claimed.value;
  }

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

  /**
   * Writes a lesson revision through the conversation's compare-and-set (lead decision 48,
   * dl-z5ja.134): only while the conversation's latest revision is `expected`. False when another
   * writer moved it first; a stale attempt throws, as every write of a stale step does.
   */
  async revise(
    expected: number,
    event: Extract<NewRunEvent, { type: "lesson_revision" }>,
  ): Promise<boolean> {
    const written = await this.store.appendLessonRevision(
      this.pod,
      this.run,
      this.attempt,
      expected,
      event,
    );
    if (!written.ok) {
      if (written.stale === "attempt") throw new StaleAttempt();
      return false;
    }
    if (!this.log.some((e) => e.event_id === written.event.event_id)) {
      this.log.push(written.event);
      this.appended += 1;
    }
    return true;
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
  const context = entry.kind === "message" ? entry.payload.context : undefined;
  // Each resend answers the stored row, and the engine acts on that row's kind, never the resend's
  // (dl-z5ja.73): an event_id kept as a message and resent as a cancel is refused, not obeyed.
  const put = async (run_id: RunId): Promise<RunInbox> => {
    const inbox = await store.putRunInbox(pod, { ...entry, run_id });
    if (inbox.kind !== entry.kind) {
      throw new StoreError(
        ErrorType.enum.BadRequest,
        `event ${entry.event_id} is a ${inbox.kind}, not a ${entry.kind}`,
      );
    }
    return inbox;
  };
  return store.unit(async () => {
    // A page the pod does not hold is refused before anything is written or asked (dl-z5ja.107).
    // A resend answers its stored row, pending or taken, even when its page has gone since
    // (dl-z5ja.117, dl-z5ja.132): it was checked when it first came.
    if (
      context &&
      (await pageLine(store, pod, message.created_by, context)) === null &&
      (await store.findRunInbox(pod, entry.event_id)) === undefined
    ) {
      throw new StoreError(ErrorType.enum.NotFound, "the page the message names is not in the pod");
    }
    for (let tries = 0; tries < 5; tries++) {
      const runs = await store.listRuns(pod, conversation_id);
      let open = runs.findLast((r) => !isEnded(r.status));

      if (entry.kind !== "message" && !open) {
        // Nothing is running: a cancel, a steer or an approval lands on the last turn and changes nothing.
        const last = runs.at(-1);
        if (!last) {
          throw new StoreError(
            ErrorType.enum.BadRequest,
            `the conversation has no run for a ${entry.kind}`,
          );
        }
        const inbox = await put(last.id);
        // A parent's patch is applied on the last turn by a step of its own, with no model call
        // (dl-z5ja.76): the lesson pane's edit and its Cofnij land when nothing is running.
        if (inbox.kind === "steer" && inbox.payload.patch !== undefined) {
          await queue.send({ run_id: last.id, attempt: last.attempt });
        }
        return { run: last, inbox };
      }

      // No open run: the next turn's, named by its number in the conversation (dl-z5ja.85). The store
      // writes a run once, so 2 first messages racing open one run and both land in its inbox.
      let opened = false;
      if (!open) {
        const now = deps.now().getTime();
        const run = await store.createRun(pod, {
          id: await turnRunIdFor(conversation_id, runs.length),
          created_by: message.created_by,
          conversation_id,
          workflow: WORKFLOW,
          resumes: null,
          cap_usd: message.cap_usd ?? DEFAULT_CAP_USD,
          idle_deadline_at: at(now + RUN_IDLE_MS),
          max_deadline_at: at(now + RUN_MAX_MS),
        });
        // A racing message's turn that has already ended: this one opens the turn after it.
        if (isEnded(run.status)) continue;
        open = run;
        opened = run.status === "queued";
      }

      const inbox = await put(open.id);
      if (inbox.run_id !== open.id) {
        // A resend of a message an earlier turn already holds. A run this call opened gets its step
        // all the same: it ends the turn without a model call unless a racing message joined it.
        if (opened) await queue.send({ run_id: open.id, attempt: open.attempt });
        return { run: await store.getRun(pod, inbox.run_id), inbox };
      }
      const now = deps.now().getTime();
      const cancel = entry.kind === "cancel";
      const waiting = open.status === "awaiting_input";
      const woken = await updateLatest(store, pod, open, (run) => {
        const change: RunChange = {};
        if (cancel && run.cancel_requested_at === null) change.cancel_requested_at = at(now);
        if (run.status === "awaiting_input") {
          change.status = "queued";
          change.idle_deadline_at = at(now + RUN_IDLE_MS);
        }
        return Object.keys(change).length > 0 ? change : null;
      });
      // A step for a run this call opened (a racing caller's too: one of the 2 steps runs stale or
      // claims nothing to pay for, dl-z5ja.41), or for one it woke from awaiting_input.
      const woke = woken.changed && waiting && woken.run.status === "queued";
      // A parent's patch always gets a step of its own (#575's review): a step that is ending the
      // turn may have taken its inbox already, and a patch must never be stranded behind it. The
      // extra step takes it, or finds the turn ended and applies it there; racing steps pay once.
      const patched = inbox.kind === "steer" && inbox.payload.patch !== undefined;
      if (opened || woke || patched) {
        await queue.send({ run_id: woken.run.id, attempt: woken.run.attempt });
      }
      return { run: woken.run, inbox };
    }
    throw new Error(
      `conversation ${conversation_id} kept opening turns while a message was accepted`,
    );
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
  if (found.run.attempt !== input.attempt && !ended) return { outcome: "continue", events: 0 };
  if (ended) {
    // An ended turn changes only by a parent's patch; everything else in its inbox changes nothing.
    // A step queued before an ender moved the attempt (the sweep's close, a redelivery's claim)
    // still lands its patch, under the attempt the run holds now, so no inbox row waits forever
    // (#575's review): the ender itself never reads the inbox.
    try {
      return { outcome: ended, events: await patchEnded(deps, found, found.run.attempt) };
    } catch (error) {
      if (error instanceof StaleAttempt) return { outcome: ended, events: 0 };
      throw error;
    }
  }

  // A due run takes the sweep's path before any model call: the pg_cron sweep enqueues a step for
  // every run past a deadline (`app.enqueue_runs_due`), and that step only closes it (dl-z5ja.60).
  const due = deadlineDue(found.run, deps.now());
  if (due) {
    const closed = await closeDue(deps.store, found.pod, found.run, due, deps.now());
    if (!closed) return { outcome: "continue", events: 0 };
    return { outcome: due === "max" ? "failed" : "turn_complete", events: closed.events };
  }

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
  await takeInbox(deps.store, w);
  const now = deps.now();

  const start: RunChange = {};
  if (run.status !== "in_progress") start.status = "in_progress";
  const idle = run.idle_deadline_at === null ? null : Date.parse(run.idle_deadline_at);
  const ahead = idle === null ? null : idle - now.getTime();
  // Pushed at most every RUN_IDLE_PUSH_MS; a verb hold left by a step that died is taken back.
  if (ahead === null || ahead < RUN_IDLE_MS - RUN_IDLE_PUSH_MS || ahead > RUN_IDLE_MS) {
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

  // The parent's own edits land first, before a cancel ends the turn or a call reads the lesson.
  const prior = await priorTurns(deps.store, scope);
  await applyPatches(w);

  if (await cancelRequested(w)) return endCancelled(deps, w);

  const last = responsesOf(w.log).at(-1);
  let pending = last ? unresolved(last, w.log) : [];

  if (pending.length === 0) {
    // The answer check reads the turn and the parent's words of the turns before it (dl-z5ja.26).
    const check = (text: string) => refusalOf(text, [...prior.said, ...w.log]);
    let correction: { call_no: number; text: string; refusal: Refusal } | null = null;
    const refused = last ? await refusedText(w, last) : null;
    if (last && refused !== null) {
      // The last answer failed the answer check, so it was never written. Its one correction comes
      // first, even when the parent spoke since: the call reads the parent's new words as well.
      // A redelivery checks it again against what the model had read, the log up to its call:
      // words the parent wrote after it give nothing the answer could have read (dl-z5ja.102).
      const until = await callEndSeq(w, last);
      const refusal = refusalOf(refused, [...prior.said, ...w.log.filter((e) => e.seq <= until)]);
      if (refusal === null) {
        await w.append([
          agentMessage(w, refused, await w.id("call", last.payload.call_no, "message")),
        ]);
        if (!parentSpokeAfter(w.log, last.seq)) return finish(deps, w);
      } else if (await corrected(w, last)) {
        return endUnchecked(deps, w, last, refusal);
      } else {
        correction = { call_no: last.payload.call_no, text: refused, refusal };
      }
    } else if (last && last.payload.tool_calls.length === 0 && !parentSpokeAfter(w.log, last.seq)) {
      // The answer is recorded and nothing came after it: a redelivery ends the turn on it.
      return finish(deps, w);
    }

    // Nothing from the parent: a turn a resend opened and no message joined (dl-z5ja.85).
    if (!parentSpokeAfter(w.log, 0)) return finish(deps, w);

    const spent = spentOf(w.log);
    const level = budgetGuard(spent, run.cap_usd);
    if (level === "stop") {
      // A refused answer the budget leaves no correction for still ends with its error.
      // One append: a crash between the error and the stop message can't leave a refused answer
      // that a redelivery then closes with neither.
      await w.append([
        ...(correction
          ? [
              await uncheckedEvent(
                w,
                correction.call_no,
                correction.refusal,
                "before its correction",
              ),
            ]
          : []),
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
      return finish(deps, w);
    }
    const instructions = [INSTRUCTIONS];
    if (correction) instructions.push(correctionNote(correction.text, correction.refusal));
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
    instructions.push(...prior.edits);
    for (const steer of steersOf(w.log)) instructions.push(steerLine(steer, w.log));
    const page = pageOf(w.log);
    const where = page ? await pageLine(deps.store, scope.pod, scope.created_by, page) : null;
    if (where) instructions.push(where);

    const call_no = (last?.payload.call_no ?? 0) + 1;
    run = await w.claim();
    if (responsesOf(w.log).some((e) => e.payload.call_no >= call_no)) {
      // Another caller recorded this call first: the next step reuses its answer.
      await deps.queue.send({ run_id: run.id, attempt: w.attempt });
      return "continue";
    }
    const asked = deps.tier ?? DEFAULT_TIER;
    const downgraded = (answered: ModelTier) => {
      if (asked === "private" && answered !== "private") {
        deps.onWarning?.({
          kind: "tier_downgraded",
          run_id: run.id,
          call_no,
          requested: asked,
          answered,
        });
      }
    };
    let response: MuseResponse;
    try {
      response = await deps.muse.respond({
        run_id: run.id,
        call_no,
        tag: TAG,
        prompt_cache_key: PROMPT_CACHE_KEY,
        tier: asked,
        instructions: instructions.join("\n\n"),
        input: [...prior.input, ...museInput(w.log)],
        tools: Object.values(deps.verbs).map((verb) => verb.tool),
        names: await namesOf(deps.store, scope),
      });
    } catch (error) {
      // A failed call writes no model_response, so the tier it went to is told here (dl-z5ja.103).
      if (error instanceof MuseFailed && error.tier !== null) downgraded(error.tier);
      throw error;
    }
    const answered = response.tier ?? asked;
    // Recorded as it answered, and never silently: the host logs it (dl-z5ja.91).
    downgraded(answered);
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
          model: response.model,
          tier: answered,
        },
      },
      {
        type: "usage",
        run_id: run.id,
        event_id: await w.id("call", call_no, "usage"),
        payload: { spent_usd: total, cap_usd: run.cap_usd },
      },
    ];
    // The answer check before an agent message (wave 2 Lead decision 23): code gave every number,
    // status and level, or the message is not written. A text-only answer that fails is corrected
    // once at the next step; text beside tool calls is dropped, and the turn's last answer is checked.
    // A text-only answer with no words at all (HttpMuse answers "" as null) is a blank answer.
    const words = wordsOf(response.text, response.tool_calls.length);
    const checked = words === null ? null : check(words);
    if (words !== null && checked === null) {
      recorded.push(agentMessage(w, words, await w.id("call", call_no, "message")));
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
    if (response.tool_calls.length === 0 && checked !== null) {
      await deps.queue.send({ run_id: run.id, attempt: w.attempt });
      return "continue";
    }

    if (response.tool_calls.length === 0) {
      // A message that came in during the call keeps the turn open for one more step.
      // So does a steer: it is logged, and the next call is built with it (Lead decision 22).
      const late = await takeInbox(deps.store, w);
      if (late.messages + late.steers - late.patches > 0) {
        await deps.queue.send({ run_id: run.id, attempt: w.attempt });
        return "continue";
      }
      return finish(deps, w);
    }
    pending = [...response.tool_calls];
  }

  if (pending.length > 0) await holdIdle(w, run);
  for (const call of pending) {
    if (await cancelRequested(w)) return endCancelled(deps, w);
    // The conversation's latest lesson, read again before each verb: a parent's patch or another
    // turn may have moved it since the call was made (lead decision 48).
    await runTool(deps, w, scope, call, await conversationLesson(deps.store, scope.pod, run.id));
  }
  await w.update({ idle_deadline_at: at(deps.now().getTime() + RUN_IDLE_MS) });
  await deps.queue.send({ run_id: run.id, attempt: w.attempt });
  return "continue";
}

/** An agent `message` the answer check passed. */
function agentMessage(w: Writer, text: string, event_id: EventId): NewRunEvent {
  return { type: "message", run_id: w.run, event_id, payload: { from: "agent", text } };
}

/**
 * A text-only answer's words when the answer check refused them: no `message` and no `error` for
 * its call is in the log. Null for an answer that was written, or had no words.
 */
async function refusedText(w: Writer, response: ModelResponse): Promise<string | null> {
  const { text, tool_calls, call_no } = response.payload;
  if (tool_calls.length > 0) return null;
  const words = wordsOf(text, 0) ?? "";
  const written = new Set([
    await w.id("call", call_no, "message"),
    await w.id("call", call_no, "unchecked"),
  ]);
  return w.log.some((e) => written.has(e.event_id)) ? null : words;
}

/**
 * The last `seq` the call `response` recorded: its `model_response`, its `usage` and its
 * `tool_call`s, appended together. Events after it came in once the model had answered.
 */
async function callEndSeq(w: Writer, response: ModelResponse): Promise<number> {
  const { call_no, tool_calls } = response.payload;
  const own = new Set([
    await w.id("call", call_no, "response"),
    await w.id("call", call_no, "usage"),
    ...(await Promise.all(tool_calls.map((call) => w.id("tool", call.call_id, "call")))),
  ]);
  return w.log.reduce((end, e) => (own.has(e.event_id) ? Math.max(end, e.seq) : end), response.seq);
}

/**
 * An answer's words for the answer check: a text-only answer always has some, "" when the model
 * gave none, so the blank rule refuses it. Beside tool calls, no words means no message.
 */
function wordsOf(text: string | null, tool_calls: number): string | null {
  if (tool_calls > 0) return text;
  return text ?? "";
}

/**
 * Whether the answer `response` belongs to has had its one correction, counted from the log: every
 * refused answer is followed by its correction call, whatever that call answers (tool calls
 * included), so an earlier refused answer means the correction was made. The count is per answer:
 * it starts again after the last answer that ended, a text-only answer written or one refused as
 * `AnswerUnchecked`, when the turn goes on to answer what the parent sent meanwhile. Words beside
 * tool calls end no answer, and a parent's message alone does not restart it either, so neither
 * grants a second correction.
 */
async function corrected(w: Writer, response: ModelResponse): Promise<boolean> {
  const since = await answerEndedAt(w);
  for (const earlier of responsesOf(w.log)) {
    if (earlier.payload.call_no >= response.payload.call_no) break;
    if (earlier.seq <= since) continue;
    if ((await refusedText(w, earlier)) !== null) return true;
  }
  return false;
}

/**
 * Where the count of corrections starts again: after the last text-only answer that was written
 * and after the last `AnswerUnchecked`. Words written beside tool calls end no answer.
 */
async function answerEndedAt(w: Writer): Promise<number> {
  let since = 0;
  for (const e of w.log) {
    if (e.type === "error" && e.payload.error.type === RUN_ERROR_TYPE.answerUnchecked) {
      since = Math.max(since, e.seq);
    }
  }
  const written = new Map(
    w.log.flatMap((e) => (e.type === "message" ? [[e.event_id, e.seq]] : [])),
  );
  for (const response of responsesOf(w.log)) {
    if (response.payload.tool_calls.length > 0 || response.payload.text === null) continue;
    const seq = written.get(await w.id("call", response.payload.call_no, "message"));
    if (seq !== undefined) since = Math.max(since, seq);
  }
  return since;
}

/** Why an answer's words may not be written: they say nothing, or they fail the answer check. */
interface Refusal {
  blank: boolean;
  misses: AnswerMiss[];
}

/** The answer check on `text` against `given`, with blank words refused as well. Null to write it. */
function refusalOf(text: string, given: readonly RunEvent[]): Refusal | null {
  if (text.trim() === "") return { blank: true, misses: [] };
  const misses = checkAnswer(text, given);
  return misses.length === 0 ? null : { blank: false, misses };
}

/** What a refusal names, for the correction note and the error. */
function refusedFor({ blank, misses }: Refusal): string {
  if (blank) return "said nothing";
  return `named ${[...new Set(misses.map((m) => `"${m.said}"`))].join(", ")}, which no tool result of this turn gave`;
}

/**
 * What the correction call is told: what failed, and its own words to write again. The words are
 * the model's, which may quote what a child wrote, so they go inside the fence as a child's: DATA,
 * markup neutralised, closing no fence and naming no link (dl-z5ja.47).
 */
function correctionNote(text: string, refusal: Refusal): string {
  return [
    `Your last answer was not sent to the parent: it ${refusedFor(refusal)}.`,
    "Code computes every number, status and level; you only word them, and you never name a mastery level.",
    "Write the answer again with only what the tool results say. Your answer was:",
    fence(text, "child"),
  ].join("\n");
}

/** The `error` event that stands in place of a refused answer's message. */
async function uncheckedEvent(
  w: Writer,
  call_no: number,
  refusal: Refusal,
  when: string,
): Promise<NewRunEvent> {
  return {
    type: "error",
    run_id: w.run,
    event_id: await w.id("call", call_no, "unchecked"),
    payload: {
      error: {
        type: RUN_ERROR_TYPE.answerUnchecked,
        message: `the answer ${refusedFor(refusal)}, ${when}`,
      },
      attempt: w.attempt,
      retryable: false,
    },
  };
}

/**
 * The correction failed the check too: an `error` event in place of the message. The turn ends,
 * unless the parent sent a message or a steer after the last answer.
 */
async function endUnchecked(
  deps: EngineDeps,
  w: Writer,
  last: ModelResponse,
  refusal: Refusal,
): Promise<RunStepOutcome> {
  await w.append([
    await uncheckedEvent(w, last.payload.call_no, refusal, "after its one correction"),
  ]);
  // A message or steer the parent sent meanwhile is still answered: the next step does, and that
  // answer gets its own one correction (wave 2 Lead decision 22).
  if (parentSpokeAfter(w.log, last.seq)) {
    await deps.queue.send({ run_id: w.run, attempt: w.attempt });
    return "continue";
  }
  return finish(deps, w);
}

/**
 * Stops the idle clock while the step's verbs run (dl-z5ja.43): `idle_deadline_at` moves to
 * `max_deadline_at`, so the sweep (`listRunsDue`, `app.runs_due` on Postgres) closes the run only on
 * its 30 minutes, however long a verb takes. The step sets it back to now + RUN_IDLE_MS once the
 * verbs are done, and a step that died holding it has it taken back by the next step's start.
 */
async function holdIdle(w: Writer, run: Run): Promise<void> {
  if (run.idle_deadline_at === run.max_deadline_at) return;
  await w.update({ idle_deadline_at: run.max_deadline_at });
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
  const expected = lesson?.revision ?? 0;
  const revision: Extract<NewRunEvent, { type: "lesson_revision" }> | null = effect?.lesson_file
    ? {
        type: "lesson_revision",
        run_id: scope.run.id,
        event_id: await w.id("tool", call.call_id, "revision"),
        payload: { revision: expected + 1, call_id: call.call_id, lesson_file: effect.lesson_file },
      }
    : null;
  // Every revision through the conversation's compare-and-set (lead decision 48): a change made on
  // a lesson that moved since the verb read it is refused, never laid over the newer one, and the
  // model is told to read it again. Checked first, so the log keeps its order (the tool_result,
  // then its revision); a writer that wins in between fails the unit, which a redelivery redoes.
  const replayed = revision !== null && w.log.some((e) => e.event_id === revision.event_id);
  if (revision && !replayed && (await latestRevision(w)) !== expected) {
    effect = null;
    error = {
      type: RUN_ERROR_TYPE.lessonChanged,
      message:
        "the lesson changed after you read it (the parent's own edit, or another turn): read it again with lesson_show, then make your change on it",
    };
  }
  const result: NewRunEvent = {
    type: "tool_result",
    run_id: scope.run.id,
    event_id: await w.id("tool", call.call_id, "result"),
    payload: {
      call_id: call.call_id,
      verb: call.verb,
      output: effect?.output ?? null,
      error,
      // The verb's result typed for its widget, which the fold draws (dl-z5ja.70).
      ...(effect?.view === undefined ? {} : { view: effect.view }),
    },
  };
  await deps.store.unit(async () => {
    await w.append([result]);
    if (effect === null || revision === null) return;
    if (!(await w.revise(expected, revision))) {
      throw new Error(`lesson revision ${expected + 1} lost its race: the step is redone`);
    }
  });
}

/** A steer row as its event: `chat` when it names no source, its patch kept as it came. */
function steerEvent(run: RunId, row: Extract<RunInbox, { kind: "steer" }>): NewRunEvent {
  const { text, source, question_ids, patch, base_revision } = row.payload;
  return {
    type: "steer",
    run_id: run,
    event_id: row.event_id,
    payload: {
      text,
      source: source ?? "chat",
      ...(question_ids === undefined ? {} : { question_ids }),
      ...(patch === undefined ? {} : { patch }),
      ...(base_revision === undefined ? {} : { base_revision }),
    },
  };
}

/**
 * Takes the run's pending inbox and writes what the log keeps, in one unit, so a stale or failed
 * append gives the rows back on Postgres. A message's or a steer's event keeps the inbox row's
 * `event_id`, which the page minted. A steer is logged (Lead decision 21), and every later call of
 * the turn is built from the logged steers, so a redelivered step keeps them (dl-z5ja.42). A cancel
 * is already on the run row.
 */
async function takeInbox(
  store: Store,
  w: Writer,
): Promise<{ messages: number; steers: number; patches: number }> {
  return store.unit(async () => {
    const rows = await store.takeRunInbox(w.pod, w.run);
    const events: NewRunEvent[] = [];
    let messages = 0;
    let steers = 0;
    let patches = 0;
    for (const row of rows) {
      if (row.kind === "message") {
        messages += 1;
        const { attachments, context } = row.payload;
        events.push({
          type: "message",
          run_id: w.run,
          event_id: row.event_id,
          payload: {
            from: "parent",
            text: row.payload.text,
            ...(attachments === undefined ? {} : { attachments }),
            ...(context === undefined ? {} : { context }),
          },
        });
      } else if (row.kind === "approval") {
        const { call_id, decision, feedback, answers } = row.payload;
        events.push({
          type: "approval_resolved",
          run_id: w.run,
          event_id: row.event_id,
          payload: {
            call_id,
            decision,
            ...(feedback === undefined ? {} : { feedback }),
            ...(answers === undefined ? {} : { answers }),
          },
        });
      } else if (row.kind === "steer") {
        steers += 1;
        if (row.payload.patch !== undefined) patches += 1;
        events.push(steerEvent(w.run, row));
      }
    }
    await w.append(events);
    return { messages, steers, patches };
  });
}

async function cancelRequested(w: Writer): Promise<boolean> {
  return (await w.current()).cancel_requested_at !== null;
}

/** Ends the turn: its status, then `turn_complete`, then the row. Each write is idempotent. */
/**
 * Completes the turn, in one unit with a last take of its inbox (dl-z5ja.130 review): a parent's
 * patch that came after the step's last take is applied now, with no model call, instead of being
 * stranded on an ended turn. A message or a chat steer that came then keeps the turn going for one
 * more step, as the late take before the end already does.
 */
async function finish(deps: EngineDeps, w: Writer): Promise<RunStepOutcome> {
  return deps.store.unit(async () => {
    const late = await takeInbox(deps.store, w);
    await applyPatches(w);
    if (late.messages + late.steers - late.patches > 0) {
      await deps.queue.send({ run_id: w.run, attempt: w.attempt });
      return "continue";
    }
    return endTurn(w, "completed", deps.now());
  });
}

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
  // A parent's patch taken on the way out still lands: the cancel stops the AI, not the parent.
  await applyPatches(w);
  return endTurn(w, "cancelled", deps.now());
}

async function endPastMax(w: Writer, attempt: number, now: Date): Promise<void> {
  await w.append([
    {
      type: "error",
      run_id: w.run,
      event_id: await w.id("error", "max"),
      payload: {
        error: {
          type: RUN_ERROR_TYPE.runTimedOut,
          message: `the turn ran past its ${minutes(RUN_MAX_MS)} minutes`,
        },
        attempt,
        retryable: false,
      },
    },
  ]);
  await endTurn(w, "failed", now);
}

/**
 * Closes a turn past its idle deadline (dl-z5ja.94): an `error` event the page's idle limit line
 * reads, then the turn completes. Retryable: the lesson so far stands.
 */
async function endPastIdle(w: Writer, attempt: number, now: Date): Promise<void> {
  await w.append([
    {
      type: "error",
      run_id: w.run,
      event_id: await w.id("error", "idle"),
      payload: {
        error: {
          type: RUN_ERROR_TYPE.runIdle,
          message: `nothing happened in the turn for ${minutes(RUN_IDLE_MS)} minutes, so it closed`,
        },
        attempt,
        retryable: true,
      },
    },
  ]);
  await endTurn(w, "completed", now);
}

/** A deadline in whole minutes, for the words of its error. */
function minutes(ms: number): number {
  return Math.round(ms / 60_000);
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

/**
 * A parent's message or steer logged after `seq`: the turn has more to answer. A steer carrying a
 * patch is not: the runner applies it with no model call (dl-z5ja.76), and the next call that is
 * made for something else is told of it.
 */
function parentSpokeAfter(log: readonly RunEvent[], seq: number): boolean {
  return log.some(
    (e) =>
      e.seq > seq &&
      ((e.type === "steer" && e.payload.patch === undefined) ||
        (e.type === "message" && e.payload.from === "parent")),
  );
}

type SteerEvent = Extract<RunEvent, { type: "steer" }>;

/** The turn's logged steers, oldest first. */
function steersOf(log: readonly RunEvent[]): SteerEvent[] {
  return log.filter((e): e is SteerEvent => e.type === "steer").sort((a, b) => a.seq - b.seq);
}

/**
 * A steer as a line of the call's instructions: the parent's words go inside the fence. A patch
 * the runner applied is named with its revision, so the model keeps it and never makes it again.
 */
function steerLine(steer: SteerEvent, log: readonly RunEvent[]): string {
  const { payload } = steer;
  const words = fence(payload.text, "parent");
  if (payload.source === "chat") return `The parent adds:\n${words}`;
  const ids = payload.question_ids?.map(neutralise).join(", ");
  const named = ids ? ` (questions ${ids})` : "";
  const line = `The parent edited the lesson themselves${named}:\n${words}`;
  if (payload.patch === undefined) return line;
  const resolved = resolutionOf(log, steer);
  if (resolved?.applied && resolved.revision !== undefined) {
    return `${line}\nTheir change is already in the lesson, as revision ${resolved.revision}: keep it, and do not make it again.`;
  }
  // Logged and not resolved yet: pending, never refused (a step that threw after its take).
  if (!resolved) {
    return `${line}\nTheir change is not applied yet: the runner applies it, so do not make it yourself.`;
  }
  const why = resolved.reason ? NOT_APPLIED[resolved.reason] : NOT_APPLIED.stale_base;
  return `${line}\nTheir change was not applied: ${why}. Make it with lesson_edit if it still fits.`;
}

type PatchResolved = Extract<RunEvent, { type: "patch_resolved" }>["payload"];
type PatchRefusal = NonNullable<PatchResolved["reason"]>;

/** Why a patch was not applied, as the model is told it. */
const NOT_APPLIED: Record<PatchRefusal, string> = {
  stale_base: "the lesson changed after they made it",
  invalid_file: "it would not read as a lesson",
  no_lesson: "there was no lesson yet to change",
};

/**
 * The `patch_resolved` event a steer's patch got (dl-z5ja.130), or null while it is pending. An
 * "applied" whose revision is not in the log is pending too: its unit died between the 2 writes
 * (Postgres rolls both back; a store that cannot is redone here).
 */
function resolutionOf(log: readonly RunEvent[], steer: SteerEvent): PatchResolved | null {
  const found = log.find(
    (e) => e.type === "patch_resolved" && e.payload.steer_event_id === steer.event_id,
  );
  if (found?.type !== "patch_resolved") return null;
  if (found.payload.applied && revisionOf(log, steer) === null) return null;
  return found.payload;
}

/** The revision a steer's patch was applied as, or null when it was not. */
function revisionOf(log: readonly RunEvent[], steer: SteerEvent): number | null {
  const revision = log.find(
    (e) => e.type === "lesson_revision" && e.payload.call_id === steer.event_id,
  );
  return revision?.type === "lesson_revision" ? revision.payload.revision : null;
}

/**
 * Applies each logged steer's patch not yet applied, oldest first, as a `lesson_revision`, with no
 * model call. It runs in its own unit after the take (lead decision 48), so a throw between the 2
 * is redone on redelivery and the parent's edit is never lost; the revision's `event_id` comes from
 * its steer, so it is never applied twice.
 *
 * A patch lands only on the revision it was made on, checked against the conversation's latest
 * across every turn and written through its compare-and-set: a merge patch replaces arrays whole,
 * so on a newer revision it would undo what changed since. And only when the page's lenient parse
 * reads every step of the result, as a verb's change must (`writable` in `verbs/lesson.ts`). Each
 * patch gets one `patch_resolved` event (dl-z5ja.130, Lead decision 49): applied with its revision,
 * or not, with why (`stale_base`, `invalid_file`, `no_lesson`), so the pane reads the outcome
 * instead of re-deriving the rule. A patch not applied stays words for the model, told why.
 */
async function applyPatches(w: Writer): Promise<number> {
  let applied = 0;
  for (const steer of steersOf(w.log)) {
    const { patch, base_revision } = steer.payload;
    if (patch === undefined || resolutionOf(w.log, steer) !== null) continue;
    const resolve = async (resolution: Omit<PatchResolved, "steer_event_id">) =>
      w.append([
        {
          type: "patch_resolved",
          run_id: w.run,
          event_id: await w.id("steer", steer.event_id, "resolved"),
          payload: { steer_event_id: steer.event_id, ...resolution },
        },
      ]);
    await w.store.unit(async () => {
      // A revision written before a throw is found again by its event_id: it was applied.
      const done = revisionOf(w.log, steer);
      if (done !== null) return resolve({ applied: true, revision: done });
      // The conversation's latest, across every turn: what the compare-and-set checks too.
      const lesson = await conversationLesson(w.store, w.pod, w.run);
      if (!lesson) return resolve({ applied: false, reason: "no_lesson" });
      if (base_revision === undefined || lesson.revision !== base_revision) {
        return resolve({ applied: false, reason: "stale_base" });
      }
      const lesson_file = mergePatch(lesson.lesson_file, patch);
      if (!readable(lesson_file)) return resolve({ applied: false, reason: "invalid_file" });
      // The resolution, then its revision, as the golden order keeps a tool_result before its
      // revision. A writer that wins between the check above and this fails the unit, and a
      // redelivery redoes it, now as stale_base.
      await resolve({ applied: true, revision: base_revision + 1 });
      const written = await w.revise(base_revision, {
        type: "lesson_revision",
        run_id: w.run,
        event_id: await w.id("steer", steer.event_id, "revision"),
        payload: { revision: base_revision + 1, call_id: steer.event_id, lesson_file },
      });
      if (!written) {
        throw new Error(`lesson revision ${base_revision + 1} lost its race: the step is redone`);
      }
      applied += 1;
    });
  }
  return applied;
}

/** The conversation's latest lesson revision across every turn, 0 before the first. */
async function latestRevision(w: Writer): Promise<number> {
  return (await conversationLesson(w.store, w.pod, w.run))?.revision ?? 0;
}

/** The higher revision of 2 lessons, either of which may be missing. */
function newer(a: VerbContext["lesson"], b: VerbContext["lesson"]): VerbContext["lesson"] {
  if (!a) return b;
  if (!b) return a;
  return b.revision > a.revision ? b : a;
}

/**
 * The conversation's latest lesson, read across all its turns, later ones included: what a patch
 * applied outside a running turn's step must still be made on (dl-z5ja.76, review round 2).
 */
async function conversationLesson(
  store: Store,
  pod: PodId,
  run: RunId,
): Promise<VerbContext["lesson"]> {
  const row = await store.getRun(pod, run);
  if (row.conversation_id === null) return null;
  let lesson: VerbContext["lesson"] = null;
  for (const turn of await store.listRuns(pod, row.conversation_id)) {
    lesson = newer(lesson, lessonOf(await store.listRunEvents(pod, turn.id, 0)));
  }
  return lesson;
}

/** Whether `file` is a lesson file the page's lenient parse reads whole, every step of it. */
function readable(file: unknown): file is Record<string, unknown> {
  try {
    return parseLessonFileLenient(file).skipped.length === 0;
  } catch {
    return false;
  }
}

/**
 * A step for an ended turn: the parent's patches in its inbox land as revisions, with no model call
 * and no status change (dl-z5ja.76). Any other row there changes nothing, as before, and is not
 * logged. A stray step finds the inbox empty and writes nothing.
 */
async function patchEnded(
  deps: EngineDeps,
  found: Awaited<ReturnType<typeof authorizeRun>>,
  attempt: number,
): Promise<number> {
  const log = [...(await deps.store.listRunEvents(found.pod, found.run.id, 0))];
  const w = new Writer(deps.store, found.pod, found.run.id, attempt, log);
  await deps.store.unit(async () => {
    const rows = await deps.store.takeRunInbox(w.pod, w.run);
    const steers: NewRunEvent[] = [];
    for (const row of rows) {
      if (row.kind !== "steer" || row.payload.patch === undefined) continue;
      steers.push(steerEvent(w.run, row));
    }
    await w.append(steers);
  });
  // A later unit applies every logged patch not yet resolved, this take's and any a step that
  // threw after its take left behind (lead decision 48): a redelivery redoes it, never loses it.
  await applyPatches(w);
  return w.appended;
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

/**
 * The run's log as the model reads it: the words, its function calls and their outputs. A parent's
 * message goes inside the fence (dl-z5ja.47): the contract marks no text as a child's, and a parent
 * may paste what a child wrote, so the parent's whole message is fenced as the parent's.
 */
function museInput(log: readonly RunEvent[]): MuseInput[] {
  const input: MuseInput[] = [];
  for (const e of [...log].sort((a, b) => a.seq - b.seq)) {
    if (e.type === "message") {
      const parent = e.payload.from === "parent";
      input.push({
        type: "message",
        role: parent ? "user" : "assistant",
        text: parent ? fence(e.payload.text, "parent") : e.payload.text,
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
 * follow-up turn edits the lesson the turn before drafted. `said` is their parent messages, which
 * the answer check reads too: a number the parent gave in turn 1 is no invention in turn 2.
 */
async function priorTurns(
  store: Store,
  scope: Scope,
): Promise<{
  input: MuseInput[];
  said: RunEvent[];
  lesson: VerbContext["lesson"];
  edits: string[];
}> {
  const { pod, run } = scope;
  if (run.conversation_id === null) return { input: [], said: [], lesson: null, edits: [] };
  const runs = await store.listRuns(pod, run.conversation_id);
  const here = runs.findIndex((r) => r.id === run.id);
  const before = here < 0 ? runs : runs.slice(0, here);
  const input: MuseInput[] = [];
  const said: RunEvent[] = [];
  const edits: string[] = [];
  let lesson: VerbContext["lesson"] = null;
  for (const earlier of before) {
    const log = await store.listRunEvents(pod, earlier.id, 0);
    input.push(...museInput(log.filter((e) => e.type === "message")));
    said.push(...log.filter((e) => e.type === "message" && e.payload.from === "parent"));
    const left = lessonOf(log);
    if (left) lesson = left;
    // A patch applied after that turn's last call: no call has been told of it yet (dl-z5ja.76).
    const told = responsesOf(log).at(-1)?.seq ?? 0;
    for (const steer of steersOf(log)) {
      if (steer.seq > told && steer.payload.patch !== undefined) edits.push(steerLine(steer, log));
    }
  }
  return { input, said, lesson, edits };
}

/**
 * The page the turn's last parent message was sent from, when it names one: the parent who moved
 * to the chat's own page since is no longer on it.
 */
function pageOf(log: readonly RunEvent[]): MessageContext | null {
  const said = log.findLast((e) => e.type === "message" && e.payload.from === "parent");
  return said?.type === "message" ? (said.payload.context ?? null) : null;
}

/**
 * A message's page as a fact for the call's instructions, read from the run's pod only (Lead
 * decision 36): a learner of the pod, or a lesson of the pod, its draft included (Lead decision
 * 42). Null when the pod holds no such id: nothing of it is read, and `acceptMessage` refuses it.
 * The learner's name and the lesson's title are the parent's own words, so they go inside the
 * fence as data (dl-z5ja.47, dl-z5ja.117, dl-z5ja.121).
 */
async function pageLine(
  store: Store,
  pod: PodId,
  account: AccountId,
  context: MessageContext,
): Promise<string | null> {
  if ("learner_id" in context) {
    const me = await store.getMe(pod, account);
    const found = me.learners.find(({ learner }) => learner.id === context.learner_id);
    if (!found) return null;
    // The name is the parent's words, so it goes inside the fence as data, never on the line itself.
    return [
      `The parent is writing from the learner page of learner ${context.learner_id}: questions about "the child" or "this learner" are about that learner, whose first name is:`,
      fence(found.learner.first_name, "parent"),
    ].join("\n");
  }
  // The pod's own lesson, its draft included (Lead decision 42): another pod's id reads as none.
  const lesson = await store.getLesson(pod, context.lesson_id);
  if (!lesson) return null;
  return [
    `The parent is writing from the screen of lesson ${context.lesson_id} (${lesson.status}): questions about "this lesson" are about it, whose title is:`,
    fence(lesson.title, "parent"),
  ].join("\n");
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

/** A step that threw in `drain`: the run and attempt it carried, and its place in the queue. */
export interface FailedStep extends RunStepInput {
  msg_id: number;
  read_ct: number;
}

/**
 * The consumer's loop, in-process: reads visible steps and runs each until none is visible. A step
 * that throws stays in the queue and comes back after its visibility timeout, as on pgmq; one that
 * returns is archived. Answers what each step returned. The dev page and the tests run it.
 *
 * A step read a 2nd time is a redelivery: before running it, `drain` claims the run by moving its
 * `attempt` on, so the step that stalled goes stale, and logs the retry as an `error` row naming the
 * attempt that stalled.
 *
 * A step that throws is handed to `onError` with what it carried and its `msg_id`, so the host can
 * log it by run id (dl-z5ja.82); it stays in the queue either way.
 */
export async function drain(
  deps: EngineDeps,
  options: { max_steps?: number; onError?: (error: unknown, step: FailedStep) => void } = {},
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
    } catch (error) {
      // The step stays in the queue, hidden until its visibility timeout, then delivered again.
      options.onError?.(error, {
        ...queued.message,
        msg_id: queued.msg_id,
        read_ct: queued.read_ct,
      });
    }
  }
  return outputs;
}

/**
 * Claims a redelivered step's run from whatever attempt holds it now, since each paid call and each
 * earlier redelivery moved the attempt on (dl-z5ja.41). The step that stalled holding it goes stale.
 * An ended run is left alone, and the message then runs stale and writes nothing.
 */
async function claim(deps: EngineDeps, queued: QueuedStep): Promise<RunStepInput> {
  const { store } = deps;
  const { message } = queued;
  const pod = await store.findRunPod(message.run_id);
  if (!pod) return message;
  const run = await store.getRun(pod, message.run_id);
  if (isEnded(run.status) || run.attempt < message.attempt) return message;
  const held = run.attempt;
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
          type: RUN_ERROR_TYPE.stepTimedOut,
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
    if (await closeDue(store, pod, run, due, now)) ended[due].push(run.id);
  }
  return ended;
}

/**
 * Closes one due run, as the sweep does and as a step for a due run does: claims it by moving its
 * `attempt` on, so a step still running goes stale, takes the inbox, then fails it past
 * `max_deadline_at` with an `error` event, or closes its turn past only `idle_deadline_at`. No
 * model call. Answers the events it wrote, or null when another claim won the run.
 */
async function closeDue(
  store: Store,
  pod: PodId,
  run: Run,
  due: "idle" | "max",
  now: Date,
): Promise<{ events: number } | null> {
  const attempt = run.attempt + 1;
  const claimed = await store.updateRun(pod, run.id, run.attempt, { attempt });
  if (claimed.stale) return null;
  const log = [...(await store.listRunEvents(pod, run.id, 0))];
  const w = new Writer(store, pod, run.id, attempt, log);
  try {
    await takeInbox(store, w);
    await applyPatches(w);
    if (due === "max") {
      await endPastMax(w, run.attempt, now);
    } else {
      await endPastIdle(w, run.attempt, now);
    }
  } catch (error) {
    if (error instanceof StaleAttempt) return null;
    throw error;
  }
  return { events: w.appended };
}
