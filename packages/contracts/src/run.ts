import { z } from "zod";
import {
  AccountId,
  ConversationId,
  EventId,
  LearnerId,
  LessonId,
  PodId,
  RunId,
  RunRatingId,
} from "./ids.ts";
import { Citation } from "./records.ts";

/**
 * The Jadwigo AI engine's records (epic dl-z5ja, wave plan `docs/worklog/dl-z5ja/2026-10-31-wave-1.md`,
 * Lead decisions 3-9). A conversation holds runs, one run per turn; a run's effects are an
 * append-only log of run events, and what arrives while a run is busy waits in its run inbox.
 *
 * Their tables are `supabase/migrations/20261101120000_run.sql` (dl-z5ja.7), which joined these to
 * `index.ts`, `RECORDS` (`tables.ts`), `ID_SCHEMAS` and the snapshots: one one-way door together.
 * `@jadwigo/contracts/run` still exports them on their own.
 */

const At = z.iso.datetime();
/** A dense count from 1 (RULES.md rule 7). */
const Count = z.int().min(1);
const Usd = z.number().min(0);
/** JSON the contracts treat as opaque: a lesson file, a verb's input or output. */
const Json = z.record(z.string(), z.unknown());

export { ConversationId, RunId };

/** A run idles out after 10 minutes with no activity while its turn is open. */
export const RUN_IDLE_MS = 10 * 60 * 1000;
/** A run's hard wall clock from its creation: `max_deadline_at`, which activity never moves. */
export const RUN_MAX_MS = 30 * 60 * 1000;
/** Activity pushes `idle_deadline_at` at most this often, so a busy run writes its row rarely. */
export const RUN_IDLE_PUSH_MS = 30 * 1000;
/** `budgetGuard` steers at this share of `cap_usd` and stops at the next (Lead decision 9). */
export const BUDGET_STEER_SHARE = 0.5;
export const BUDGET_STOP_SHARE = 0.9;

/** The workflows a run may carry. Wave 1 has one: a parent's chat becomes a lesson. */
export const RunWorkflow = z.enum(["jadwigo-lesson-compose"]);
export type RunWorkflow = z.infer<typeof RunWorkflow>;

/**
 * The verbs the model calls as function tools. The lesson verbs are the set `jw mcp serve`
 * exposes; the learner verbs (dl-z5ja.25) read one learner of the run's pod and are the engine's
 * only, since jw holds no learner.
 */
export const VerbName = z.enum([
  "lesson_draft",
  "lesson_show",
  "lesson_edit",
  "lesson_check",
  "question_search",
  "learner_skills",
  "learner_week",
  "learner_mistakes",
  "curriculum_topics",
  "lesson_ideas",
]);
export type VerbName = z.infer<typeof VerbName>;

/**
 * Which model tier a call went to. `private` asks for a model that trains on nothing it is sent;
 * `contributor` may train on what it is sent. A learner's data, names included, may reach either
 * (decision `dl-uafq`, 2026-11-01, which supersedes `dl-2uq1`:
 * `jadwigo-hackathon/decisions/2026-11-01-a-learner-s-data-names-included-may-reach-any-meta-model-the-con`).
 */
export const ModelTier = z.enum(["private", "contributor"]);
export type ModelTier = z.infer<typeof ModelTier>;

/**
 * Which widget draws a verb's result (`docs/research/posthog-ai-ux-patterns.md`, seam 1). Closed,
 * one kind per verb for now; a kind the page has no widget for falls back to a plain card.
 */
export const ToolViewKind = z.enum(VerbName.options);
export type ToolViewKind = z.infer<typeof ToolViewKind>;

export const Conversation = z.object({
  id: ConversationId,
  pod_id: PodId,
  created_by: AccountId,
  title: z.string().nullable(),
  created_at: At,
  /**
   * When a parent archived it, null while it is live (dl-z5ja.104, decision dl-84wo). An archived
   * conversation is left out of the list and kept for the pod; it goes only with the pod. A reply
   * written before the column reads as null.
   */
  archived_at: At.nullable().default(null),
});
export type Conversation = z.infer<typeof Conversation>;

/** A parent's verdict on a turn (dl-z5ja.110). */
export const RunRatingVerdict = z.enum(["good", "bad"]);
export type RunRatingVerdict = z.infer<typeof RunRatingVerdict>;

/**
 * A parent's rating of one turn (wave 4 lead decision 37, dl-z5ja.110): Good or Bad, with an
 * optional note on Bad ("what was missing?"). One per run and account; a re-rate replaces the
 * verdict and the note, and `created_at` stays the first rating's. It lives in its own pod-scoped
 * table, never an analytics event, since a note may hold learner data.
 */
export const RunRating = z.object({
  id: RunRatingId,
  pod_id: PodId,
  run_id: RunId,
  account_id: AccountId,
  verdict: RunRatingVerdict,
  note: z.string().nullable(),
  created_at: At,
});
export type RunRating = z.infer<typeof RunRating>;

/**
 * `POST /api/v1/runs/{id}/ratings`: Good, or Bad with an optional note. The server fills the run,
 * the account and the time.
 */
export const RunRatingCreate = z.discriminatedUnion("verdict", [
  z.strictObject({ verdict: z.literal("good") }),
  z.strictObject({
    verdict: z.literal("bad"),
    note: z.string().trim().min(1).max(2000).optional(),
  }),
]);
export type RunRatingCreate = z.infer<typeof RunRatingCreate>;

export const RunStatus = z.enum([
  "queued",
  "in_progress",
  "awaiting_input",
  "completed",
  "failed",
  "cancelled",
]);
export type RunStatus = z.infer<typeof RunStatus>;

/**
 * One turn. `attempt` is the fence: `updateRun` compares and sets on it, so a step holding a
 * stale attempt writes nothing (PostHog's `generation`, `c54766909b8`). The 2 deadlines are never
 * one: activity pushes `idle_deadline_at` and never moves `max_deadline_at` (`4f9d39c016e`,
 * `57c128deeb7`).
 */
export const Run = z.object({
  id: RunId,
  pod_id: PodId,
  created_by: AccountId,
  /** Null for an unattended run, which no workflow in wave 1 is. */
  conversation_id: ConversationId.nullable(),
  workflow: RunWorkflow,
  /** The run this one continues, when a turn resumes an earlier one. */
  resumes: RunId.nullable(),
  status: RunStatus,
  attempt: Count,
  cancel_requested_at: At.nullable(),
  idle_deadline_at: At.nullable(),
  max_deadline_at: At,
  cap_usd: Usd,
  spent_usd: Usd,
  created_at: At,
  completed_at: At.nullable(),
});
export type Run = z.infer<typeof Run>;

/** A file the parent attached, as a storage reference. Never the bytes (homework epic dl-z5ja.11). */
export const Attachment = z.object({
  storage_path: z.string().min(1),
  media_type: z.string().min(1),
});
export type Attachment = z.infer<typeof Attachment>;

/**
 * The engine's own error types, beside a verb's refusals (`unknown-draft`, ...), which stay free
 * strings. They never reach the API's `{error}` envelope, so they are not `ErrorType`s. The page
 * draws its limit lines from them (dl-z5ja.83). Not a schema, so no snapshot holds it: `RunError.type`
 * stays a string, and the 3 event snapshots that embed it do not move.
 */
export const RUN_ERROR_TYPE = {
  /** A step ran past its visibility timeout and was delivered again (`retryable`). */
  stepTimedOut: "StepTimedOut",
  /**
   * The turn closed past `idle_deadline_at`: nothing happened for RUN_IDLE_MS (dl-z5ja.94).
   * `retryable`: the lesson so far stands, and the parent's next message opens a new turn.
   */
  runIdle: "RunIdle",
  /** The turn ran past `max_deadline_at` (not `retryable`). */
  runTimedOut: "RunTimedOut",
  /**
   * An agent answer failed the answer check twice, after its one correction (dl-z5ja.26): it named
   * a number, status or level no tool result gave. Not `retryable`; the turn ends completed.
   */
  answerUnchecked: "AnswerUnchecked",
  /**
   * A verb's lesson change was refused: the conversation's lesson moved after the verb read it,
   * by the parent's own edit or another turn (lead decision 48, dl-z5ja.76). Written as the
   * `tool_result`'s error, so the model reads the lesson again; the turn goes on.
   */
  lessonChanged: "LessonChanged",
} as const;
export type RunErrorType = (typeof RUN_ERROR_TYPE)[keyof typeof RUN_ERROR_TYPE];

export const RunError = z.object({
  /** A verb's refusal, or one of `RUN_ERROR_TYPE`. */
  type: z.string().min(1),
  message: z.string(),
});
export type RunError = z.infer<typeof RunError>;

export const ModelUsage = z.object({
  input_tokens: z.int().min(0),
  output_tokens: z.int().min(0),
  cached_tokens: z.int().min(0),
});
export type ModelUsage = z.infer<typeof ModelUsage>;

/** One function call the model asked for. `call_id` is Muse's. */
export const ToolCall = z.object({
  call_id: z.string().min(1),
  verb: VerbName,
  input: Json,
});
export type ToolCall = z.infer<typeof ToolCall>;

/** A verb's result typed for its widget, never text the page parses (seam 1). */
export const ToolView = z.object({ kind: ToolViewKind, data: Json });
export type ToolView = z.infer<typeof ToolView>;

/** One option of a question the agent asks. At most one is `recommended`, and it comes first. */
export const ChooseFormOption = z.object({
  label: z.string().min(1),
  recommended: z.boolean().optional(),
});
export type ChooseFormOption = z.infer<typeof ChooseFormOption>;

export const ChooseQuestion = z
  .object({
    text: z.string().min(1),
    options: z.array(ChooseFormOption).min(2).max(4),
    /** The parent may answer in their own words. */
    custom_allowed: z.boolean(),
    /** The parent may leave it unanswered. */
    skippable: z.boolean(),
  })
  .refine((q) => q.options.every((o, i) => o.recommended !== true || i === 0), {
    message: "the recommended option comes first, and only one is recommended",
    path: ["options"],
  });
export type ChooseQuestion = z.infer<typeof ChooseQuestion>;

/** The form an approval asks the parent to fill (seam 3): 1 question by default, at most 2. */
export const ChooseForm = z.object({ questions: z.array(ChooseQuestion).min(1).max(2) });
export type ChooseForm = z.infer<typeof ChooseForm>;

export const PlanStatus = z.enum(["pending", "in_progress", "done", "failed"]);
export type PlanStatus = z.infer<typeof PlanStatus>;
/** One line of the agent's checklist. */
export const PlanEntry = z.object({ text: z.string().min(1), status: PlanStatus });
export type PlanEntry = z.infer<typeof PlanEntry>;

/**
 * Where a parent's steer came from: words typed in the chat while the turn ran, or an edit the
 * parent made in the lesson pane (dl-z5ja.30). Not exported on its own, so it adds no snapshot:
 * `run-event.json` and `run-inbox.json` carry it.
 */
const SteerSource = z.enum(["chat", "lesson_edit"]);
/**
 * The lesson file's questions a `lesson_edit` steer names, by each question's `id` in the file
 * (the id `lesson_edit` and `lesson_check` call `step_id`). Never empty when present.
 */
const SteerQuestionIds = z.array(z.string().min(1)).min(1);
/**
 * A parent's own edit of the lesson file, as a JSON merge patch (RFC 7386): a key set to `null` is
 * removed, an object merges, any other value replaces (Lead decision 41, dl-z5ja.76). The runner
 * applies it as a `lesson_revision` with no model call, so the parent's edit wins by construction,
 * and the pane's Cofnij is one more patch the same way.
 */
export const LessonPatch = z.record(z.string(), z.unknown());
export type LessonPatch = z.infer<typeof LessonPatch>;
/**
 * The lesson revision a parent's patch was made on. The runner applies the patch only while that
 * is still the latest: a merge patch replaces arrays whole, so on a newer revision it would undo
 * what changed since (dl-z5ja.76). Not exported on its own: the steer snapshots carry it.
 */
const PatchBase = Count;

const Base = {
  run_id: RunId,
  /** Per run, gapless, `max + 1`, assigned by the store. The cursor. */
  seq: Count,
  /** Deterministic, so a replayed write is a no-op. The dedupe key, never merged with `seq`. */
  event_id: EventId,
  created_at: At,
};

function event<T extends string, P extends z.ZodType>(type: T, payload: P) {
  return z.object({ ...Base, type: z.literal(type), payload });
}

/**
 * The page a parent's message was sent from (Lead decision 36, dl-z5ja.107): the learner page
 * names its learner, the lesson screen its lesson. The runner reads it from the run's pod and
 * refuses an id the pod does not hold before any model call. Absent: the chat's own page.
 */
export const MessageContext = z.union([
  z.strictObject({ learner_id: LearnerId }),
  z.strictObject({ lesson_id: LessonId }),
]);
export type MessageContext = z.infer<typeof MessageContext>;

export const MessageEvent = event(
  "message",
  z.object({
    from: z.enum(["parent", "agent"]),
    text: z.string(),
    attachments: z.array(Attachment).optional(),
    /** A parent's message only: the page it was sent from. */
    context: MessageContext.optional(),
    /** What an agent's claim about a learner rests on (seam 2). */
    citations: z.array(Citation).optional(),
  }),
);
/**
 * What Muse answered for one call: kept whole, so a redelivered step reuses it instead of paying
 * again (Lead decision 6).
 */
export const ModelResponseEvent = event(
  "model_response",
  z.object({
    response_id: z.string().min(1),
    call_no: Count,
    text: z.string().nullable(),
    tool_calls: z.array(ToolCall),
    usage: ModelUsage,
    cost_usd: Usd,
    /** The model that answered, as its provider names it. */
    model: z.string().min(1),
    /** Required: the log proves which tier saw what the call carried. */
    tier: ModelTier,
  }),
);
export const ToolCallEvent = event("tool_call", ToolCall);
export const ToolResultEvent = event(
  "tool_result",
  z.object({
    call_id: z.string().min(1),
    verb: VerbName,
    output: Json.nullable(),
    error: RunError.nullable(),
    view: ToolView.optional(),
  }),
);
/** The whole lesson file after an edit, not a patch: the fold keeps the highest `revision`. */
/**
 * The lesson file after a change. `call_id` names what made it: the verb's tool call, or, for a
 * parent's `patch` (dl-z5ja.76), the `event_id` of the steer that carried it.
 */
export const LessonRevisionEvent = event(
  "lesson_revision",
  z.object({ revision: Count, call_id: z.string().min(1), lesson_file: Json }),
);
export const ApprovalRequestEvent = event(
  "approval_request",
  z.object({
    call_id: z.string().min(1),
    verb: VerbName,
    summary: z.string(),
    choose: ChooseForm.optional(),
  }),
);
/** `answers` follow the `choose` form's questions in order; `feedback` is the parent's own words. */
export const ApprovalResolvedEvent = event(
  "approval_resolved",
  z.object({
    call_id: z.string().min(1),
    decision: z.enum(["approved", "rejected"]),
    feedback: z.string().optional(),
    answers: z.array(z.string()).optional(),
  }),
);
/**
 * A parent's steer, logged when the runner takes it off the inbox (wave 2 Lead decision 21,
 * dl-z5ja.51): the next call's instructions are built from the turn's logged steers, so a
 * redelivered step keeps them (dl-z5ja.42). `source` is the inbox row's, `chat` when it named none.
 * Not exported on its own, so `run-event.json` is the one snapshot that holds it; a consumer names
 * it as `Extract<RunEvent, { type: "steer" }>`.
 */
const SteerEvent = event(
  "steer",
  z.object({
    text: z.string(),
    source: SteerSource,
    question_ids: SteerQuestionIds.optional(),
    /** A `lesson_edit` steer's change, applied as the `lesson_revision` that names this event. */
    patch: LessonPatch.optional(),
    base_revision: PatchBase.optional(),
  }),
);
/**
 * What became of a parent's patch (lead decision 49, dl-z5ja.130): `applied` with the revision it
 * made, or not, and why. Its own event, since run_event is append-only and the steer is logged
 * before the patch is resolved. `steer_event_id` names the steer that carried the patch. Not
 * exported on its own, like the steer: `run-event.json` holds it.
 */
const PatchResolvedEvent = event(
  "patch_resolved",
  z.object({
    steer_event_id: EventId,
    applied: z.boolean(),
    revision: Count.optional(),
    reason: z.enum(["stale_base", "invalid_file", "no_lesson"]).optional(),
  }),
);
/** The agent's checklist for a long turn (seam 4). Each one replaces the last whole. */
export const PlanEvent = event("plan", z.object({ entries: z.array(PlanEntry) }));
export const StatusEvent = event("status", z.object({ status: RunStatus }));
/** The run's total so far, after a model call. */
export const UsageEvent = event("usage", z.object({ spent_usd: Usd, cap_usd: Usd }));
/** The page shows the steer; PostHog never did. */
export const BudgetSteerEvent = event(
  "budget_steer",
  z.object({ level: z.enum(["steer", "stop"]), spent_usd: Usd, cap_usd: Usd }),
);
/** The turn has ended. A later event never reopens it (`fb0435a3341`). */
export const TurnCompleteEvent = event("turn_complete", z.object({}));
/** `attempt` rides along so the page's Copy details names the run and the attempt. */
export const ErrorEvent = event(
  "error",
  z.object({ error: RunError, attempt: Count, retryable: z.boolean() }),
);

export const RunEvent = z.discriminatedUnion("type", [
  MessageEvent,
  ModelResponseEvent,
  ToolCallEvent,
  ToolResultEvent,
  LessonRevisionEvent,
  ApprovalRequestEvent,
  ApprovalResolvedEvent,
  SteerEvent,
  PatchResolvedEvent,
  PlanEvent,
  StatusEvent,
  UsageEvent,
  BudgetSteerEvent,
  TurnCompleteEvent,
  ErrorEvent,
]);
export type RunEvent = z.infer<typeof RunEvent>;
export type RunEventType = RunEvent["type"];
/** An event before the store numbers it: `appendRunEvents` assigns `seq` and `created_at`. */
export type NewRunEvent = RunEvent extends infer E
  ? E extends RunEvent
    ? Omit<E, "seq" | "created_at">
    : never
  : never;

export const RunInboxKind = z.enum(["message", "steer", "approval", "cancel"]);
export type RunInboxKind = z.infer<typeof RunInboxKind>;
export const RunInboxStatus = z.enum(["pending", "delivered"]);
export type RunInboxStatus = z.infer<typeof RunInboxStatus>;

const InboxBase = {
  run_id: RunId,
  pod_id: PodId,
  /** Unique: the page mints it, so a resent message lands once. */
  event_id: EventId,
  status: RunInboxStatus,
  created_at: At,
};

/**
 * What arrives while a run is busy. Delivered in order at the next step and never lost
 * (`07e5926b92a`, `84ebde9e18f`); a steer joins the next step's context.
 */
export const RunInbox = z.discriminatedUnion("kind", [
  z.object({
    ...InboxBase,
    kind: z.literal("message"),
    payload: z.object({
      text: z.string(),
      attachments: z.array(Attachment).optional(),
      context: MessageContext.optional(),
    }),
  }),
  z.object({
    ...InboxBase,
    kind: z.literal("steer"),
    payload: z.object({
      text: z.string(),
      /** `chat` when absent: a steer from before dl-z5ja.51 named none. */
      source: SteerSource.optional(),
      question_ids: SteerQuestionIds.optional(),
      patch: LessonPatch.optional(),
      base_revision: PatchBase.optional(),
    }),
  }),
  z.object({
    ...InboxBase,
    kind: z.literal("approval"),
    payload: z.object({
      call_id: z.string().min(1),
      decision: z.enum(["approved", "rejected"]),
      /** Carried into `approval_resolved` as they came. */
      feedback: z.string().optional(),
      answers: z.array(z.string()).optional(),
    }),
  }),
  z.object({ ...InboxBase, kind: z.literal("cancel"), payload: z.object({}) }),
]);
export type RunInbox = z.infer<typeof RunInbox>;

/** One step of a run: one Muse call and the verbs it asks for. */
export const RunStepInput = z.object({ run_id: RunId, attempt: Count });
export type RunStepInput = z.infer<typeof RunStepInput>;

export const RunStepOutcome = z.enum([
  "continue",
  "awaiting_input",
  "turn_complete",
  "cancelled",
  "failed",
]);
export type RunStepOutcome = z.infer<typeof RunStepOutcome>;

/** `events` counts the events this step appended. */
export const RunStepOutput = z.object({ outcome: RunStepOutcome, events: z.int().min(0) });
export type RunStepOutput = z.infer<typeof RunStepOutput>;
