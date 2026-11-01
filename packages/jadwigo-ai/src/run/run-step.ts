import type { AccountId, PodId } from "@jadwigo/contracts";
import type {
  ConversationId,
  Run,
  RunId,
  RunInbox,
  RunStepInput,
  RunStepOutput,
} from "@jadwigo/contracts/run";
import type { NewRunInbox, Store } from "@jadwigo/store";
import type { MuseClient } from "../muse/client.ts";
import type { RunQueue } from "../queue/types.ts";
import type { Verbs } from "../verbs/types.ts";

/**
 * The engine's loop (Lead decisions 5-9, 13): a message lands in the run inbox, a step is one Muse
 * call and the verbs it asks for, every effect is a run event. Step 0 (dl-z5ja.12) fixes these
 * signatures; the runner lane (dl-z5ja.16) writes the bodies until `src/scenarios.test.ts` passes.
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

const WAITS = "waits on dl-z5ja.16 (the runner lane)";

/**
 * Takes what the parent sent, in one unit: the inbox row by its `event_id` (a resend lands once),
 * on the conversation's open run, or on a new run (one per turn) when none is open; and a step
 * enqueued when no step is pending. A message mid-turn waits for the next step and is never lost
 * (`07e5926b92a`, `84ebde9e18f`). A cancel sets `cancel_requested_at`.
 */
export function acceptMessage(
  _deps: EngineDeps,
  _message: AcceptMessage,
): Promise<{ run: Run; inbox: RunInbox }> {
  return Promise.reject(new Error(`acceptMessage ${WAITS}`));
}

/**
 * Who a run acts for, from its row: as `apps/api`'s `authorize()` does for attempts. `NotFound` when
 * no pod holds the id. Every `VerbContext` is built from this, never from the model's arguments.
 */
export function authorizeRun(
  _store: Store,
  _run: RunId,
): Promise<{ pod: PodId; created_by: AccountId; run: Run }> {
  return Promise.reject(new Error(`authorizeRun ${WAITS}`));
}

/**
 * One step: check cancel, status and deadlines; take the inbox in order; fold the log into the
 * Muse request; `budgetGuard` before the call (steer at half, stop at 90%); reuse a recorded
 * `model_response` for this `call_no` instead of paying again; run each tool call through its verb,
 * skipping one whose `tool_result` exists, checking cancel before each; append events with
 * deterministic `event_id`s; then enqueue the next step, wait for input, or end the turn. A step
 * holding a stale `attempt` writes nothing.
 */
export function runStep(_input: RunStepInput, _deps: EngineDeps): Promise<RunStepOutput> {
  return Promise.reject(new Error(`runStep ${WAITS}`));
}

/**
 * The consumer's loop, in-process: reads visible steps and runs each until none is visible. A step
 * that throws stays in the queue and comes back after its visibility timeout, as on pgmq; one that
 * returns is archived. Answers what each step returned. The dev page and the tests run it.
 */
export function drain(
  _deps: EngineDeps,
  _options?: { max_steps?: number },
): Promise<readonly RunStepOutput[]> {
  return Promise.reject(new Error(`drain ${WAITS}`));
}

/**
 * The deadline sweep (`pg_cron` in wave 2): every run `listRunsDue(now)` names is ended. Past
 * `max_deadline_at` it fails with an `error` event; past only `idle_deadline_at` its turn closes.
 * Either way the log ends with `turn_complete`. Answers the runs it ended, by clock.
 */
export function sweep(_deps: EngineDeps, _now: Date): Promise<{ idle: RunId[]; max: RunId[] }> {
  return Promise.reject(new Error(`sweep ${WAITS}`));
}
