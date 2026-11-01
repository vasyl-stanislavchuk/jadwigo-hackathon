import type { AccountId, EventId, PodId } from "@jadwigo/contracts";
import type {
  Conversation,
  ConversationId,
  NewRunEvent,
  Run,
  RunEvent,
  RunId,
  RunInbox,
  RunRating,
  RunRatingVerdict,
  RunWorkflow,
} from "@jadwigo/contracts/run";

/**
 * The engine's records in the store (epic dl-z5ja, wave plan
 * `docs/worklog/dl-z5ja/2026-10-31-wave-1.md`, Lead decisions 3, 5 and 6). Step 0 (dl-z5ja.12)
 * fixes these signatures and `run.contract.ts`; the store lane (dl-z5ja.14) fills
 * `InMemoryStore`, and the Postgres methods wait on the dl-z5ja.7 migration (dl-z5ja.19).
 *
 * The store keeps the database's rules: ids written once, `seq` gapless per run, an `event_id`
 * stored once, the `attempt` fence. What a run does next is the engine's (`packages/jadwigo-ai`).
 */

export interface NewConversation {
  id: ConversationId;
  created_by: AccountId;
  title: string | null;
}

/** A parent's rating as `rateRun` takes it: a note only with `bad` (dl-z5ja.110). */
export interface NewRunRating {
  verdict: RunRatingVerdict;
  note: string | null;
}

/** A `lesson_revision` event as `appendLessonRevision` takes it. */
export type NewLessonRevision = Extract<NewRunEvent, { type: "lesson_revision" }>;

/**
 * What `appendLessonRevision` answers (dl-z5ja.134): the revision appended, or why not. `stale`
 * when the conversation's latest revision is no longer `expected` (another run or the parent wrote
 * first; `latest` is the one to read), or when the run's attempt had moved on, as `updateRun`'s
 * fence answers (`attempt`).
 */
export type LessonRevisionAppend =
  | { readonly ok: true; readonly revision: number; readonly event: RunEvent }
  | { readonly ok: false; readonly stale: "revision" | "attempt"; readonly latest: number };

/** A run starts `queued` at attempt 1, nothing spent, not cancelled, not completed. */
export interface NewRun {
  id: RunId;
  created_by: AccountId;
  conversation_id: ConversationId | null;
  workflow: RunWorkflow;
  resumes: RunId | null;
  cap_usd: number;
  idle_deadline_at: string | null;
  max_deadline_at: string;
}

/** What `updateRun` may change. Identity, `max_deadline_at` and `created_at` never change. */
export type RunChange = Partial<
  Pick<
    Run,
    | "status"
    | "attempt"
    | "cancel_requested_at"
    | "idle_deadline_at"
    | "cap_usd"
    | "spent_usd"
    | "completed_at"
  >
>;

/** A write fenced on `attempt`: `stale` when the run's attempt had moved on, and nothing changed. */
export interface Fenced<T> {
  stale: boolean;
  value: T;
}

/** A row for the run inbox: the store sets `pod_id`, `status` (`pending`) and `created_at`. */
export type NewRunInbox = RunInbox extends infer R
  ? R extends RunInbox
    ? Omit<R, "pod_id" | "status" | "created_at">
    : never
  : never;

/** The windows `messageUsage` counts over, as sent times (ISO, UTC). */
export interface UsageSince {
  /** Count a parent's messages and steers put at or after this time. */
  minuteSince: string;
  /** Sum the caps of the pod's runs created at or after this time. */
  daySince: string;
}

/** What the api's message throttle and daily cap read (dl-z5ja.62). */
export interface MessageUsage {
  /**
   * Inbox rows of kind `message` or `steer` on runs `account` created, put since `minuteSince`. A
   * steer opens no run, so the day cap never sees it: the minute count is its only limit
   * (dl-z5ja.97).
   */
  messages: number;
  /** The sum of `cap_usd` over the pod's runs created since `daySince`, whoever created them. */
  cap_usd: number;
}

export interface RunStore {
  /** The pod behind a run id, for `authorizeRun`. Not scoped: it is how the scope is found. */
  findRunPod(id: RunId): Promise<PodId | undefined>;

  /**
   * The sweep's read: every run in any pod that has not ended (queued, in progress or awaiting
   * input) whose `idle_deadline_at` or `max_deadline_at` is at or before `now`, with its pod.
   * Not scoped, like `findRunPod`: on Postgres it is the `pg_cron` sweep's query (dl-z5ja.7).
   */
  listRunsDue(now: string): Promise<readonly { pod: PodId; run: Run }[]>;
  /**
   * The Muse spend of a lane (dl-z5ja.89): the `cost_usd` of every `model_response` event of the
   * runs of `workflows`, in any pod, logged at or after `since`, and of their failed calls
   * (`recordFailedMuseCall`, dl-z5ja.123). Not scoped, like `listRunsDue`: on
   * Postgres it is `muse_ledger.spent_usd`, which only `jadwigo_runner` may call.
   */
  spentUsd(workflows: readonly RunWorkflow[], since: string): Promise<number>;
  /**
   * Records a Muse call of `run` that failed after it spent `cost_usd` (dl-z5ja.123): it logs no
   * `model_response`, so `spentUsd` would miss it. The pod is the run's. Not scoped, like
   * `spentUsd`: on Postgres it is `muse_ledger.record_failed_call`, which only `jadwigo_runner` may
   * call. An unknown run records nothing; a cost of 0 or less is `BadRequest`.
   */
  recordFailedMuseCall(run: RunId, call_no: number, cost_usd: number): Promise<void>;

  /** Written once: the same id again returns the stored row. */
  createConversation(pod: PodId, conversation: NewConversation): Promise<Conversation>;
  /** `NotFound` outside `pod`, archived or not. */
  getConversation(pod: PodId, conversation: ConversationId): Promise<Conversation>;
  /**
   * The pod's conversations, newest first (`created_at`, then id), the archived left out unless
   * `includeArchived` (dl-z5ja.104, decision dl-84wo).
   */
  listConversations(
    pod: PodId,
    options?: { readonly includeArchived?: boolean },
  ): Promise<readonly Conversation[]>;
  /**
   * Archives a conversation of `pod` at `at` (ISO, UTC) and returns it. Idempotent: archiving one
   * that is archived already keeps its first `archived_at`. Nothing is deleted: an archived
   * conversation is kept for the pod and goes only with it. `NotFound` outside `pod`.
   */
  archiveConversation(pod: PodId, conversation: ConversationId, at: string): Promise<Conversation>;
  /** Written once: the same id again returns the stored row. A conversation outside `pod` is `NotFound`. */
  createRun(pod: PodId, run: NewRun): Promise<Run>;
  /** A conversation's runs, oldest first (one per turn). `NotFound` for a conversation outside `pod`. */
  listRuns(pod: PodId, conversation: ConversationId): Promise<readonly Run[]>;
  /** `NotFound` outside `pod`. */
  getRun(pod: PodId, run: RunId): Promise<Run>;
  /**
   * Compare and set on `attempt` (PostHog's `generation` fence, `c54766909b8`): applies `change`
   * only while the run's attempt is `attempt`, else changes nothing and answers `stale` with the
   * stored run. A step claims a redelivery by changing `attempt` to `attempt + 1`.
   */
  updateRun(pod: PodId, run: RunId, attempt: number, change: RunChange): Promise<Fenced<Run>>;
  /**
   * Appends in order, fenced on `attempt` like `updateRun`: a stale step appends nothing. Each new
   * event gets `seq` = the run's max + 1, gapless, and `created_at` now. An `event_id` the run
   * already holds is not appended again: its stored row is answered in its place, so a replayed
   * write is a no-op. An event whose `run_id` is not `run` is `BadRequest`.
   */
  appendRunEvents(
    pod: PodId,
    run: RunId,
    attempt: number,
    events: readonly NewRunEvent[],
  ): Promise<Fenced<readonly RunEvent[]>>;
  /**
   * Every lesson revision's one write path (lead decision 48, dl-z5ja.134): appends `event` to
   * `run`, fenced on `attempt` like `appendRunEvents`, only while the latest `revision` across all
   * the runs of the run's conversation is `expected` (0 before the first), and the event's own
   * `revision` is `expected + 1`. On Postgres the check and the append hold a per-conversation
   * lock in the unit's transaction, so 2 writers at the same `expected` get exactly 1 `ok`. A
   * replayed `event_id` the run holds answers `ok` with the stored event. A run outside `pod` is
   * `NotFound`; a run with no conversation, or an event of another run or revision, `BadRequest`.
   */
  appendLessonRevision(
    pod: PodId,
    run: RunId,
    attempt: number,
    expected: number,
    event: NewLessonRevision,
  ): Promise<LessonRevisionAppend>;
  /** The run's events with `seq` greater than `afterSeq`, in `seq` order. */
  listRunEvents(pod: PodId, run: RunId, afterSeq: number): Promise<readonly RunEvent[]>;
  /** Written once by `event_id`: the same `event_id` again returns the stored row. */
  putRunInbox(pod: PodId, entry: NewRunInbox): Promise<RunInbox>;
  /**
   * The inbox row `pod` holds under `event_id`, pending or delivered, or undefined (dl-z5ja.131):
   * how a resend is known before anything is written. Another pod's row is undefined: an
   * `event_id` is unique per pod (dl-z5ja.86).
   */
  findRunInbox(pod: PodId, event_id: EventId): Promise<RunInbox | undefined>;
  /** Marks the run's pending rows delivered and answers them, oldest first. Each is taken once. */
  takeRunInbox(pod: PodId, run: RunId): Promise<readonly RunInbox[]>;
  /**
   * A parent's recent messages and the pod's spend allowance, for the message throttle and the
   * daily cap (dl-z5ja.72). Scoped to `pod`; `NotFound` for an unknown pod. A bounds is inclusive.
   */
  messageUsage(pod: PodId, account: AccountId, since: UsageSince): Promise<MessageUsage>;
  /**
   * A parent's rating of a run of `pod` (dl-z5ja.110): one per run and account, so a re-rate
   * replaces the verdict and the note and keeps the row's id and `created_at`. A note with `good`
   * is `BadRequest`. `NotFound` for a run outside `pod`.
   */
  rateRun(pod: PodId, run: RunId, account: AccountId, rating: NewRunRating): Promise<RunRating>;
  /** The ratings of a run of `pod`, oldest first. `NotFound` for a run outside `pod`. */
  listRunRatings(pod: PodId, run: RunId): Promise<readonly RunRating[]>;
}
