/**
 * The player's side effects (dl-5ssh.3.1), around the pure runner (runner.ts). Ported from david-learns
 * frontend/src/runner/useRunner.ts and playground/db/DbLesson.tsx (dl-e8ov.2.32.7):
 *
 * - Load: the tab's stored attempt is read again, so a reload resumes it; a paused one waits on the
 *   paused screen, a finished one shows its results, and an id the server does not know (a 404,
 *   the database rebuilt) is forgotten and a new attempt starts.
 * - Send until stored: a try or a skip is sent again with the same body, the same event id, while
 *   the failure is transient. A refusal that says the page is behind re-reads the snapshot.
 * - The beat: a moved-on line stays for BEAT_MS, then the next question shows.
 * - Pause and resume are the attempt's own status (PATCH), so a reload keeps the pause.
 */

import {
  type ApiError,
  type AttemptClient,
  createClient,
  TransientError,
} from "@jadwigo/api-client";
import {
  type AssignmentId,
  type AttemptAnswerRequest,
  type AttemptId,
  type AttemptResults,
  type AttemptSnapshot,
  ErrorType,
  EventId,
} from "@jadwigo/contracts";
import type { Instant } from "@jadwigo/lesson-kit";
import { browserClock } from "@jadwigo/lesson-kit";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { BEAT_MS, currentOf, initialRunner, type RunnerState, runner } from "./runner.ts";
import { storedAttempt } from "./storedAttempt.ts";
import { uuid } from "./uuid.ts";

/** How long to wait before sending again after a transient failure. */
const RETRY_MS = 1000;

type Stage =
  | { kind: "loading" }
  | { kind: "playing" }
  | { kind: "paused" }
  | { kind: "finished"; results: AttemptResults | null }
  | { kind: "not_found" }
  | { kind: "failed" };

export interface Player {
  stage: Stage;
  state: RunnerState;
  commit(value: unknown, t1: Instant): void;
  skip(at: Instant): void;
  askHelp(): void;
  next(): void;
  pause(): void;
  resume(): void;
}

const isApiError = (error: unknown): error is ApiError =>
  error instanceof Error && error.name === "ApiError";

/** Refusals that mean the page's view of the attempt is behind the server's. */
const BEHIND: readonly ErrorType[] = [
  ErrorType.enum.AnswerConflict,
  ErrorType.enum.TryOutOfOrder,
  ErrorType.enum.QuestionNotOpen,
  ErrorType.enum.EventIdMismatch,
];

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Call `run` until it answers, waiting between transient failures; any other failure is thrown. */
async function untilAnswered<T>(run: () => Promise<T>, alive: () => boolean): Promise<T> {
  for (;;) {
    try {
      return await run();
    } catch (error) {
      if (!(error instanceof TransientError) || !alive()) throw error;
      await wait(RETRY_MS);
    }
  }
}

/** One start per assignment at a time, so React's double effect in development starts one attempt. */
const starting = new Map<AssignmentId, Promise<AttemptSnapshot>>();

function startOnce(client: AttemptClient, assignmentId: AssignmentId): Promise<AttemptSnapshot> {
  const pending = starting.get(assignmentId);
  if (pending !== undefined) return pending;
  const started = client.startAttempt(assignmentId).then((snapshot) => {
    storedAttempt.set(assignmentId, snapshot.attempt.id);
    return snapshot;
  });
  starting.set(assignmentId, started);
  void started.finally(() => starting.delete(assignmentId)).catch(() => undefined);
  return started;
}

export function usePlayer(assignmentId: AssignmentId, client?: AttemptClient): Player {
  const api = useMemo(() => client ?? createClient({ base: "" }), [client]);
  const [state, dispatch] = useReducer(runner, initialRunner);
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const attempt = useRef<AttemptId | null>(null);
  const alive = useRef(true);
  /** When the question on screen was shown: asked_at and the latency are measured from it. */
  const shown = useRef<Instant>(browserClock.now());

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const finish = useCallback(
    (id: AttemptId) => {
      setStage({ kind: "finished", results: null });
      untilAnswered(
        () => api.getResults(id),
        () => alive.current,
      )
        .then((results) => {
          if (alive.current) setStage({ kind: "finished", results });
        })
        .catch(() => {
          if (alive.current) setStage({ kind: "failed" });
        });
    },
    [api],
  );

  /** Take a snapshot in: play it, wait on it while paused, or show its results once finished. */
  const take = useCallback(
    (snapshot: AttemptSnapshot) => {
      attempt.current = snapshot.attempt.id;
      dispatch({ type: "loaded", snapshot });
      if (snapshot.attempt.status === "finished") finish(snapshot.attempt.id);
      else setStage({ kind: snapshot.attempt.status === "paused" ? "paused" : "playing" });
    },
    [finish],
  );

  // Load: resume the tab's attempt, or start one.
  useEffect(() => {
    let live = true;
    const isLive = (): boolean => live;
    const start = (): Promise<AttemptSnapshot> =>
      untilAnswered(() => startOnce(api, assignmentId), isLive);
    const stored = storedAttempt.get(assignmentId);
    const load =
      stored === null
        ? start()
        : untilAnswered(() => api.getAttempt(stored), isLive).catch((error: unknown) => {
            if (isApiError(error) && error.status === 404) {
              storedAttempt.clear(assignmentId);
              return start();
            }
            throw error;
          });
    load
      .then((snapshot) => {
        if (live) take(snapshot);
      })
      .catch((error: unknown) => {
        if (!live) return;
        const missing = isApiError(error) && error.status === 404;
        setStage({ kind: missing ? "not_found" : "failed" });
      });
    return () => {
      live = false;
    };
  }, [api, assignmentId, take]);

  // A new question on screen: its clock starts now. A miss keeps the question, and its clock.
  useEffect(() => {
    if (state.seq !== null) shown.current = browserClock.now();
  }, [state.seq]);

  // The beat after a moved-on line.
  useEffect(() => {
    if (state.phase !== "beat") return;
    const timer = setTimeout(() => dispatch({ type: "advance" }), BEAT_MS);
    return () => clearTimeout(timer);
  }, [state.phase]);

  // Re-read the snapshot when the page is behind.
  useEffect(() => {
    const id = attempt.current;
    if (state.phase !== "resyncing" || stage.kind !== "playing" || id === null) return;
    let live = true;
    untilAnswered(
      () => api.getAttempt(id),
      () => live,
    )
      .then((snapshot) => {
        if (live) take(snapshot);
      })
      .catch(() => {
        if (live) setStage({ kind: "failed" });
      });
    return () => {
      live = false;
    };
  }, [api, state.phase, stage.kind, take]);

  // The last question ended: the results.
  useEffect(() => {
    const id = attempt.current;
    if (state.phase === "finished" && stage.kind === "playing" && id !== null) finish(id);
  }, [state.phase, stage.kind, finish]);

  const send = useCallback(
    (body: AttemptAnswerRequest) => {
      const id = attempt.current;
      if (id === null) return;
      dispatch({ type: "sending" });
      untilAnswered(
        () => api.answer(id, body),
        () => alive.current,
      )
        .then((result) => dispatch({ type: "answered", result }))
        .catch((error: unknown) => {
          if (!isApiError(error)) return dispatch({ type: "reopen" });
          if (error.type === ErrorType.enum.AttemptPaused) return setStage({ kind: "paused" });
          if (error.type === ErrorType.enum.AttemptFinished) return finish(id);
          if (error.type !== null && BEHIND.includes(error.type))
            return dispatch({ type: "resync" });
          dispatch({ type: "reopen" });
        });
    },
    [api, finish],
  );

  const common = (seq: number, tryNo: number, at: Instant) => ({
    event_id: EventId.parse(uuid()),
    seq,
    try_no: tryNo,
    latency_ms: Math.max(0, Math.round(at.perf - shown.current.perf)),
    asked_at: shown.current.wall,
    answered_at: at.wall,
  });

  const commit = (value: unknown, t1: Instant): void => {
    if (state.phase !== "live" || state.seq === null) return;
    send({ ...common(state.seq, state.attemptNo, t1), kind: "try", value } as AttemptAnswerRequest);
  };

  const skip = (at: Instant): void => {
    if (state.phase !== "live" || state.seq === null) return;
    send({ ...common(state.seq, state.attemptNo, at), kind: "skip", skip_reason: "dont_know" });
  };

  const askHelp = (): void => {
    const id = attempt.current;
    const question = currentOf(state);
    if (id === null || question === null || state.phase !== "live") return;
    api
      .help(id, question.seq, { help_released: question.help_released })
      .then((result) => dispatch({ type: "help", result }))
      .catch((error: unknown) => {
        if (isApiError(error) && error.type !== null && BEHIND.includes(error.type)) {
          dispatch({ type: "resync" });
        }
      });
  };

  const pause = (): void => {
    const id = attempt.current;
    if (id === null) return;
    api
      .patchAttempt(id, { status: "paused" })
      .then(() => setStage({ kind: "paused" }))
      .catch(() => setStage({ kind: "failed" }));
  };

  const resume = (): void => {
    const id = attempt.current;
    if (id === null) return;
    api
      .patchAttempt(id, { status: "in_progress" })
      .then(take)
      .catch(() => setStage({ kind: "failed" }));
  };

  return {
    stage,
    state,
    commit,
    skip,
    askHelp,
    next: () => dispatch({ type: "advance" }),
    pause,
    resume,
  };
}
