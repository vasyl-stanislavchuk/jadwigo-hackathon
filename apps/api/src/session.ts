import { randomUUID } from "node:crypto";
import {
  type AttemptId,
  AttemptPatch,
  type AttemptResults,
  type AttemptSnapshot,
  ErrorType,
  type EventId,
  HelpRequest,
  type HelpResult,
  pageAttemptResult,
  pageEnded,
  verdictsHeld,
} from "@jadwigo/contracts";
import { gateOpen, HelpRung, helpLeft, rungFor } from "@jadwigo/core";
import type { Store } from "@jadwigo/store";
import { bodyHash, goOn, versionOf } from "./attempts.ts";
import { authorize } from "./authorize.ts";
import { lessonQuestion } from "./course.ts";
import { ApiError, badRequest } from "./errors.ts";
import { pageQuestion, releasedHelp, rungsWritten, snapshot } from "./page.ts";

/**
 * `POST /api/v1/attempts/{id}/questions/{seq}/help`: releases the next rung the author wrote,
 * when the `help_released` the page sends is still current (RULES.md rule 19). Rungs 3 and 4 wait
 * for one real try (`gateOpen`). A retried request finds its count stale and gets the rung it
 * released the first time, never a 2nd one.
 *
 * Rung 4 ends the question skipped (`help_twin`, a skip the server writes) and asks its twin
 * straight after, whatever `after_not_sure` says (`nextQuestion`). While verdicts are held a try
 * ends the question, so the ladder never gets past the gate.
 */
export async function help(
  store: Store,
  id: AttemptId,
  seq: number,
  raw: unknown,
): Promise<HelpResult> {
  const scope = await authorize(store, { attempt: id });
  const parsed = HelpRequest.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const seen = parsed.data.help_released;

  const { record } = scope;
  const version = await versionOf(store, scope.pod, record);
  const asked = record.questions.find((q) => q.seq === seq);
  if (asked === undefined)
    throw new ApiError(ErrorType.enum.NotFound, `no question asked at seq ${seq}`);
  const question = lessonQuestion(version, asked.lesson_question_id);
  const written = rungsWritten(question);
  const tries = record.answers.filter((a) => a.seq === seq && a.kind === "try").length;

  if (seen > asked.help_released)
    throw new ApiError(ErrorType.enum.BadRequest, "help_released is ahead of what was released");
  if (seen === asked.help_released) {
    // Every refusal comes before any write.
    if (record.attempt.status === "finished")
      throw new ApiError(ErrorType.enum.AttemptFinished, "this attempt has finished");
    if (record.attempt.status === "paused")
      throw new ApiError(ErrorType.enum.AttemptPaused, "this attempt is paused");
    if (asked.ended !== null)
      throw new ApiError(ErrorType.enum.QuestionNotOpen, "this question has ended");
    const rung = rungFor(question, written[seen - 1] ?? HelpRung.None, gateOpen(tries));
    if (rung === HelpRung.Twin) {
      // Rung 4 shows the worked answer, so the store releases it, appends the help_twin skip and
      // ends the question in one unit: no try can land on the question once the answer shows.
      const now = new Date().toISOString();
      await store.releaseHelp(scope.pod, id, seq, seen, {
        twin: {
          event_id: randomUUID() as EventId,
          latency_ms: Math.max(0, Date.parse(now) - Date.parse(asked.asked_at)),
          asked_at: asked.asked_at,
          answered_at: now,
          body_hash: bodyHash({ seq, skip_reason: "help_twin" }),
        },
      });
    } else if (rung !== null) {
      await store.releaseHelp(scope.pod, id, seq, seen);
    }
  }
  // Asks the twin once rung 4 ended the question, whichever request ended it, and while paused
  // too; it does nothing when the course has gone on already. Read after the release, which
  // may have lost a race.
  const after = await goOn(store, scope, version, await store.getAttempt(scope.pod, id), seq);
  const held = verdictsHeld(scope.assignment, after.attempt);
  const now = after.questions.find((q) => q.seq === seq) ?? asked;
  const answers = after.answers.filter((a) => a.seq === seq);
  // Rung 4 ended this question when its last answer is the server's help_twin skip.
  const twinHere = now.ended !== null && answers.at(-1)?.skip_reason === "help_twin";
  const next = twinHere ? after.questions.find((q) => q.seq === seq + 1) : undefined;
  return {
    seq,
    help_released: now.help_released,
    // The rung the request that saw `seen` released: this one, or the first time on a retry.
    released: releasedHelp(question, now, answers)[seen] ?? null,
    more: now.ended === null && helpLeft(question, written[now.help_released - 1] ?? HelpRung.None),
    ended: pageEnded(now.ended, held),
    next: next ? pageQuestion(version, next, after.answers, held) : null,
  };
}

/**
 * `PATCH /api/v1/attempts/{id}`: pause, with the open question to come back to, and resume. The
 * attempt keeps the version it started on, so a resume plays the same questions.
 */
export async function patchAttempt(
  store: Store,
  id: AttemptId,
  raw: unknown,
): Promise<AttemptSnapshot> {
  const scope = await authorize(store, { attempt: id });
  const parsed = AttemptPatch.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const { record } = scope;
  const open = record.questions.find((q) => q.ended === null);
  const attempt =
    parsed.data.status === "paused"
      ? await store.setAttemptStatus(scope.pod, id, "paused", open?.seq ?? null)
      : await store.setAttemptStatus(scope.pod, id, "in_progress");
  // The pause writes only the attempt row; the rest is what authorize() read under that row's lock.
  const after = { ...record, attempt };
  return snapshot(scope.assignment, await versionOf(store, scope.pod, after), after);
}

/**
 * `GET /api/v1/attempts/{id}/results`: the child's after-lesson list, readable mid-lesson: what
 * was asked, how it ended (`done` while verdicts are held) and the help used. Never the parent's
 * full `attempt_result` row (decision
 * 2026-10-27-the-child-s-after-lesson-list-shows-what-was-asked-how-it-ended).
 */
export async function getResults(store: Store, id: AttemptId): Promise<AttemptResults> {
  const scope = await authorize(store, { attempt: id });
  const { attempt } = scope.record;
  const held = verdictsHeld(scope.assignment, attempt);
  const rows = await store.getAttemptResult(scope.pod, id);
  return { attempt, results: rows.map((row) => pageAttemptResult(row, held)) };
}
