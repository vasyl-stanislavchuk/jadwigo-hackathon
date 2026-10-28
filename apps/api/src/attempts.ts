import { createHash } from "node:crypto";
import {
  type AssignmentId,
  type AttemptAnswer,
  AttemptAnswerRequest,
  type AttemptAnswerResult,
  type AttemptId,
  type AttemptSnapshot,
  AttemptStart,
  type Ended,
  ErrorType,
  type PodId,
  pageEnded,
  verdictsHeld,
} from "@jadwigo/contracts";
import { judge, pageMarks } from "@jadwigo/core";
import type { AttemptRecord, LessonVersionWithQuestions, NewAttempt, Store } from "@jadwigo/store";
import { authorize, type Scope } from "./authorize.ts";
import { lessonQuestion, nextQuestion } from "./course.ts";
import { ApiError, badRequest } from "./errors.ts";
import { pageQuestion, revealOf, snapshot, verdictOf } from "./page.ts";

/** Fields the server writes on an answer. The page sending one is `ServerFieldSupplied`. */
const SERVER_FIELDS = [
  "correct",
  "mistake_class",
  "parts",
  "help_used",
  "judged_by",
  "body_hash",
  "pod_id",
  "attempt_id",
];

/** `POST /api/v1/assignments/{id}/attempts`: the attempt, with the first question asked. */
export async function startAttempt(
  store: Store,
  id: AssignmentId,
  raw: unknown,
): Promise<AttemptSnapshot> {
  const parsed = AttemptStart.safeParse(raw ?? {});
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const body = parsed.data;
  const scope = await authorize(store, { assignment: id, learner: Boolean(body.learner_id) });
  const start: NewAttempt = {
    assignment_id: id,
    ...(body.learner_id !== undefined && { learner_id: body.learner_id }),
    ...(body.player_name !== undefined && { player_name: body.player_name }),
    ...(body.mode !== undefined && { mode: body.mode }),
  };
  const record = await store.startAttempt(scope.pod, start);
  return snapshot(scope.assignment, await versionOf(store, scope.pod, record), record);
}

/** `GET /api/v1/attempts/{id}`. */
export async function getAttempt(store: Store, id: AttemptId): Promise<AttemptSnapshot> {
  const scope = await authorize(store, { attempt: id });
  const record = await store.getAttempt(scope.pod, id);
  return snapshot(scope.assignment, await versionOf(store, scope.pod, record), record);
}

/**
 * `POST /api/v1/attempts/{id}/answers`: one try or a skip, judged by core and appended once.
 *
 * - A right try ends the question `correct`. A wrong one keeps it open for a retry and the help
 *   ladder, except while verdicts are held: then it ends `missed`, with no retry and no help
 *   (decision 2026-10-27-while-an-assignment-holds-verdicts-every-question-gets-one-try-a).
 * - A skip ends it `skipped`, and Not sure yet may owe its twin (`nextQuestion`).
 * - When a question ends, the next one is asked, or the attempt finishes.
 * - A replay (same `event_id`, same body) gets the stored result and changes nothing.
 */
export async function answer(
  store: Store,
  id: AttemptId,
  raw: unknown,
): Promise<AttemptAnswerResult> {
  const scope = await authorize(store, { attempt: id });
  const supplied = serverFieldIn(raw);
  if (supplied !== undefined)
    throw new ApiError(ErrorType.enum.ServerFieldSupplied, `${supplied} is the server's to write`);
  const parsed = AttemptAnswerRequest.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const body = parsed.data;

  const record = await store.getAttempt(scope.pod, id);
  const version = await versionOf(store, scope.pod, record);
  const asked = record.questions.find((q) => q.seq === body.seq);
  if (asked === undefined)
    throw new ApiError(ErrorType.enum.NotFound, `no question asked at seq ${body.seq}`);
  const question = lessonQuestion(version, asked.lesson_question_id);
  // Explain has no judge in v0 and is never asked; core's judge() throws on it by design.
  if (question.family === "explain")
    throw new ApiError(ErrorType.enum.BadRequest, "this question takes no answer in v0");

  const common = {
    event_id: body.event_id,
    attempt_id: id,
    seq: body.seq,
    try_no: body.try_no,
    latency_ms: body.latency_ms,
    asked_at: body.asked_at,
    answered_at: body.answered_at,
    body_hash: bodyHash(body),
  };
  const verdict = body.kind === "try" ? judge(question, body.value) : null;
  const held = verdictsHeld(scope.assignment, record.attempt);
  // How this answer ends its question, if it does. The store appends and ends in one unit, so of
  // 2 answers at once to one question the other is refused and writes nothing.
  const end: Ended | undefined =
    verdict === null ? "skipped" : verdict.correct ? "correct" : held ? "missed" : undefined;
  const { answer: stored, replayed } = await store.appendAttemptAnswer(
    scope.pod,
    body.kind === "try" && verdict
      ? {
          ...common,
          kind: "try",
          value: body.value,
          skip_reason: null,
          correct: verdict.correct,
          mistake_class: verdict.mistake_class,
          parts: verdict.parts,
          judged_by: "core",
        }
      : {
          ...common,
          kind: "skip",
          value: null,
          skip_reason: body.kind === "skip" ? body.skip_reason : null,
          correct: null,
          mistake_class: null,
          parts: null,
          judged_by: null,
        },
    end === undefined ? {} : { end },
  );

  if (!replayed && end !== undefined) await goOn(store, scope, version, id, stored.seq);
  const after = await store.getAttempt(scope.pod, id);
  return answerResult(scope, version, after, stored, replayed);
}

/** After the question at `seq` ended: asks the next one, or finishes the attempt. */
async function goOn(
  store: Store,
  scope: Scope,
  version: LessonVersionWithQuestions,
  id: AttemptId,
  seq: number,
): Promise<void> {
  const record = await store.getAttempt(scope.pod, id);
  const next = nextQuestion(scope.assignment, version, record, seq);
  if (next) await store.askQuestion(scope.pod, id, next);
  else await store.finishAttempt(scope.pod, id);
}

/**
 * The reply to an answer, built from what is stored, so a replay reads the same as the first
 * reply. Under an assignment that holds verdicts, every answer reply is neutral: `correct`,
 * `parts` and `reveal` are null and an ended question is `done`, the answer that finishes the
 * attempt included, since every answer was stored before the attempt finished. The verdicts reach
 * the page through the snapshot and the results once the attempt has finished (owner, 2026-10-28).
 */
function answerResult(
  scope: Scope,
  version: LessonVersionWithQuestions,
  record: AttemptRecord,
  stored: AttemptAnswer,
  replayed: boolean,
): AttemptAnswerResult {
  const held = scope.assignment.hold_verdicts;
  const asked = record.questions.find((q) => q.seq === stored.seq);
  if (asked === undefined) throw new Error(`answer ${stored.event_id} has no question`);
  const question = lessonQuestion(version, asked.lesson_question_id);
  // This answer ended its question when it is the question's last one and the question has ended.
  const last = record.answers.findLast((a) => a.seq === stored.seq);
  const endedHere = last?.event_id === stored.event_id ? asked.ended : null;
  const next = endedHere ? record.questions.find((q) => q.seq === stored.seq + 1) : undefined;
  const missed = stored.kind === "try" && stored.correct === false;
  return {
    event_id: stored.event_id,
    seq: stored.seq,
    try_no: stored.try_no,
    replayed,
    correct: held || stored.kind === "skip" ? null : stored.correct,
    parts: held || !missed ? null : pageMarks(question, stored.value, verdictOf(stored)),
    reveal: held || stored.correct !== true ? null : revealOf(question),
    ended: pageEnded(endedHere, held),
    next: next ? pageQuestion(version, next, record.answers, held) : null,
    attempt_status: record.attempt.status,
  };
}

async function versionOf(
  store: Store,
  pod: PodId,
  record: AttemptRecord,
): Promise<LessonVersionWithQuestions> {
  return store.getLessonVersion(pod, record.attempt.lesson_version_id);
}

function serverFieldIn(raw: unknown): string | undefined {
  if (raw === null || typeof raw !== "object") return undefined;
  const fields = Object.keys(raw);
  const found = SERVER_FIELDS.find((f) => fields.includes(f));
  if (found) return found;
  return (raw as { skip_reason?: unknown }).skip_reason === "help_twin"
    ? "skip_reason help_twin"
    : undefined;
}

/** The request body's hash, over its keys in sorted order: a replay is matched on it. */
function bodyHash(body: AttemptAnswerRequest): string {
  return createHash("sha256").update(canonical(body)).digest("hex");
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
