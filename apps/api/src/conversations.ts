import { createHash } from "node:crypto";
import {
  type Conversation,
  ConversationCreate,
  ConversationId,
  ConversationMessage,
  type ConversationRuns,
  ErrorType,
  type EventId,
  ID_PREFIXES,
  idOf,
  LIMITS,
  type PodId,
  type Run,
  type RunAccepted,
  RunCancel,
  type RunEvents,
  type RunId,
} from "@jadwigo/contracts";
import { acceptMessage, type EngineDeps, type RunQueue, type Verbs } from "@jadwigo/jadwigo-ai";
import type { Store, UsageSince } from "@jadwigo/store";
import type { Claims } from "./auth.ts";
import { authorizeMember } from "./authorize.ts";
import { ApiError, badRequest } from "./errors.ts";

/**
 * The AI engine's conversation routes (epic dl-z5ja, dl-z5ja.21). The API Lambda only writes: a
 * message or a Stop lands in the run inbox and a step is enqueued (`acceptMessage`), and the step
 * host runs it. A route never calls Muse or a verb, so the reply comes well inside the 10 s rule
 * (`docs/research/ai-chat-engine.md`, the Flow).
 *
 * The pod is the signed-in caller's (`authorizeMember`), and every read is scoped to it: another
 * pod's conversation or run is 404 `NotFound`, as row-level security answers it. No route looks a
 * run's pod up by its id (`findRunPod`); the API's role may not.
 */

/** What the message routes need besides the store. */
export interface EngineRouteDeps {
  /**
   * Where a new step goes. On Postgres, pgmq's `agent_step` joined to the request's unit, so the
   * step commits with its run row (dl-z5ja.67); on InMemoryStore, a queue the route sends to after
   * the unit.
   */
  readonly queue: RunQueue;
  /**
   * Holds the pod's lock until the unit ends, so 2 messages of one pod are counted one after the
   * other and cannot both pass a limit at 9. Postgres takes `pg_advisory_xact_lock`; in memory,
   * where nothing runs at once inside a unit, it does nothing.
   */
  readonly lockPod: (pod: PodId) => Promise<void>;
  readonly now: () => Date;
}

/** The windows the limits count over: the last 60 s, and the UTC day so far. */
function windows(now: Date): UsageSince {
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  return {
    minuteSince: new Date(now.getTime() - 60_000).toISOString(),
    daySince: day.toISOString(),
  };
}

function limited(message: string): ApiError {
  return new ApiError(ErrorType.enum.MessageLimit, message);
}

/** The API never runs a step, so its engine has no Muse and no verbs: `acceptMessage` reads neither. */
const NO_STEP: Pick<EngineDeps, "muse" | "verbs"> = {
  muse: { respond: () => Promise.reject(new Error("the API never runs a step")) },
  verbs: {} as Verbs,
};

function engine(store: Store, deps: EngineRouteDeps): EngineDeps {
  return { store, queue: deps.queue, now: deps.now, ...NO_STEP };
}

/**
 * A conversation's id, named by the page's `event_id` within the caller's pod: a resend finds the
 * conversation it made, and 2 pods never name the same one. A uuid of version 8 (RFC 9562's
 * custom layout), from SHA-256.
 */
function conversationIdFor(pod: PodId, event_id: EventId): ConversationId {
  const bytes = createHash("sha256").update(`conversation\u001f${pod}\u001f${event_id}`).digest();
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x80;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return ConversationId.parse(idOf(ID_PREFIXES.conversation, uuid));
}

function mismatch(): ApiError {
  return new ApiError(ErrorType.enum.EventIdMismatch, "this event id was sent with another body");
}

/** `POST /api/v1/conversations`: once by `event_id`. */
export async function createConversation(
  store: Store,
  claims: Claims,
  raw: unknown,
): Promise<Conversation> {
  const { pod, account } = await authorizeMember(store, claims);
  const parsed = ConversationCreate.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const title = parsed.data.title ?? null;
  const conversation = await store.createConversation(pod, {
    id: conversationIdFor(pod, parsed.data.event_id),
    created_by: account,
    title,
  });
  if (conversation.title !== title) throw mismatch();
  return conversation;
}

/**
 * `POST /api/v1/conversations/{id}/messages`: the message in the run inbox, on the open turn or a
 * new run, and a step enqueued when none is pending. `listRuns` inside `acceptMessage` refuses a
 * conversation outside the pod as `NotFound` before anything is written.
 */
export async function postMessage(
  store: Store,
  deps: EngineRouteDeps,
  claims: Claims,
  id: ConversationId,
  raw: unknown,
): Promise<RunAccepted> {
  const { pod, account } = await authorizeMember(store, claims);
  const parsed = ConversationMessage.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const { event_id, text } = parsed.data;
  // One unit: the reads below, the write and the refusal. A refused message throws after
  // acceptMessage wrote, so on Postgres the unit rolls the row back and its held send is
  // dropped; nothing of it is kept (dl-z5ja.62, the steward's review of #464).
  await deps.lockPod(pod);
  const since = windows(deps.now());
  const before = await store.messageUsage(pod, account, since);
  // NotFound for a conversation outside the pod, before anything is written.
  const runsBefore = await store.listRuns(pod, id);
  const { run, inbox } = await acceptMessage(engine(store, deps), {
    pod,
    created_by: account,
    conversation_id: id,
    entry: { kind: "message", event_id, payload: { text } },
  });
  // A resend lands once; the same id on another message, or in another conversation, is refused.
  if (inbox.kind !== "message" || inbox.payload.text !== text || run.conversation_id !== id)
    throw mismatch();
  // A new run is a new turn. Otherwise the count says whether this event_id is new: a resend of
  // a stored message counts nothing, and answers its run whatever the limits say now.
  const opened = !runsBefore.some((r) => r.id === run.id);
  const counted =
    opened || (await store.messageUsage(pod, account, since)).messages > before.messages;
  if (!counted) return { run };
  if (before.messages >= LIMITS.messagesPerMinute)
    throw limited("too many messages in a minute: wait a moment and send it again");
  // Only a message that opens a turn spends: one that joins the open turn always may, so a parent
  // can finish a running turn. The pod never passes its cap by a run.
  if (opened && before.cap_usd + run.cap_usd > LIMITS.podDailyCapUsd)
    throw limited("today's AI budget for this family is used up: try again tomorrow");
  return { run };
}

/** `GET /api/v1/conversations/{id}/runs`: `NotFound` for a conversation outside the pod. */
export async function listConversationRuns(
  store: Store,
  claims: Claims,
  id: ConversationId,
): Promise<ConversationRuns> {
  const { pod } = await authorizeMember(store, claims);
  return { runs: [...(await store.listRuns(pod, id))] };
}

/** `GET /api/v1/runs/{id}/events`: the run is read under the pod first, so another pod's is 404. */
export async function listRunEvents(
  store: Store,
  claims: Claims,
  id: RunId,
  after: number | undefined,
): Promise<RunEvents> {
  const { pod } = await authorizeMember(store, claims);
  await store.getRun(pod, id);
  return { events: [...(await store.listRunEvents(pod, id, after ?? 0))] };
}

function ended(run: Run): boolean {
  return run.status === "completed" || run.status === "failed" || run.status === "cancelled";
}

/**
 * `POST /api/v1/runs/{id}/cancellations`: a cancel in the inbox of the run's conversation, which
 * sets `cancel_requested_at`; the run stops at its next step. A run that has ended is answered as
 * it is, with nothing written.
 */
export async function cancelRun(
  store: Store,
  deps: EngineRouteDeps,
  claims: Claims,
  id: RunId,
  raw: unknown,
): Promise<RunAccepted> {
  const { pod, account } = await authorizeMember(store, claims);
  const parsed = RunCancel.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const run = await store.getRun(pod, id);
  if (ended(run)) return { run };
  if (run.conversation_id === null)
    throw new ApiError(ErrorType.enum.BadRequest, "this run belongs to no conversation");
  const accepted = await acceptMessage(engine(store, deps), {
    pod,
    created_by: account,
    conversation_id: run.conversation_id,
    entry: { kind: "cancel", event_id: parsed.data.event_id, payload: {} },
  });
  // The cancel landed on another run: its event_id already names another run's row.
  if (accepted.inbox.kind !== "cancel" || accepted.run.id !== id) throw mismatch();
  return { run: accepted.run };
}
