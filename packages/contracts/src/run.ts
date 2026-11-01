import { z } from "zod";
import { AccountId, EventId, ID_PREFIXES, PodId, prefixedId } from "./ids.ts";

/**
 * The Jadwigo AI engine's records (epic dl-z5ja, wave plan `docs/worklog/dl-z5ja/2026-10-31-wave-1.md`,
 * Lead decisions 3-9). A conversation holds runs, one run per turn; a run's effects are an
 * append-only log of run events, and what arrives while a run is busy waits in its run inbox.
 *
 * Exported as `@jadwigo/contracts/run`, not from `index.ts`: everything `index.ts` exports gets a
 * JSON Schema snapshot, and `RECORDS` must match a migration. These join `index.ts`, `RECORDS`,
 * `ID_SCHEMAS` and the snapshots in the dl-z5ja.7 migration PR, one one-way door together.
 */

const At = z.iso.datetime();
/** A dense count from 1 (RULES.md rule 7). */
const Count = z.int().min(1);
const Usd = z.number().min(0);
/** JSON the contracts treat as opaque: a lesson file, a verb's input or output. */
const Json = z.record(z.string(), z.unknown());

export const ConversationId = prefixedId<"ConversationId">(
  ID_PREFIXES.conversation,
  "a conversation",
);
export type ConversationId = z.infer<typeof ConversationId>;
export const RunId = prefixedId<"RunId">(ID_PREFIXES.run, "a run");
export type RunId = z.infer<typeof RunId>;

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

/** The verbs the model calls as function tools, the same set `jw mcp serve` exposes. */
export const VerbName = z.enum([
  "lesson_draft",
  "lesson_show",
  "lesson_edit",
  "lesson_check",
  "question_search",
]);
export type VerbName = z.infer<typeof VerbName>;

export const Conversation = z.object({
  id: ConversationId,
  pod_id: PodId,
  created_by: AccountId,
  title: z.string().nullable(),
  created_at: At,
});
export type Conversation = z.infer<typeof Conversation>;

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
  resumes_run_id: RunId.nullable(),
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

export const RunError = z.object({
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

export const MessageEvent = event(
  "message",
  z.object({
    from: z.enum(["parent", "agent"]),
    text: z.string(),
    attachments: z.array(Attachment).optional(),
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
  }),
);
/** The whole lesson file after an edit, not a patch: the fold keeps the highest `revision`. */
export const LessonRevisionEvent = event(
  "lesson_revision",
  z.object({ revision: Count, call_id: z.string().min(1), lesson_file: Json }),
);
export const ApprovalRequestEvent = event(
  "approval_request",
  z.object({ call_id: z.string().min(1), verb: VerbName, summary: z.string() }),
);
export const ApprovalResolvedEvent = event(
  "approval_resolved",
  z.object({ call_id: z.string().min(1), decision: z.enum(["approved", "rejected"]) }),
);
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
    payload: z.object({ text: z.string(), attachments: z.array(Attachment).optional() }),
  }),
  z.object({ ...InboxBase, kind: z.literal("steer"), payload: z.object({ text: z.string() }) }),
  z.object({
    ...InboxBase,
    kind: z.literal("approval"),
    payload: z.object({
      call_id: z.string().min(1),
      decision: z.enum(["approved", "rejected"]),
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
