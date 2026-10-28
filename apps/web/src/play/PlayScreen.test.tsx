/**
 * The player against a double of the API (no network): a new tab starts an attempt and keeps its
 * id for a reload, a paused attempt waits on the paused screen and resumes on the same question, a
 * finished one shows the congratulation and the list, and an id the server forgot starts afresh.
 */

import { ApiError, type AttemptClient } from "@jadwigo/api-client";
import {
  AssignmentId,
  AttemptId,
  type AttemptResults,
  AttemptSnapshot,
  LessonQuestionId,
  type PageAttemptQuestion,
} from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayScreen } from "./PlayScreen.tsx";
import { storedAttempt } from "./storedAttempt.ts";

const ASSIGNMENT = AssignmentId.parse("asg_0ectzj2evqb95a3v1v6wewjzy3");
const ATTEMPT = AttemptId.parse("att_43007b83dp9w2tnfjxhha74cyq");
const FRESH = AttemptId.parse("att_2h4m8gyw0fb1cvz2nkqw0px8fq");
const AT = "2026-10-28T14:02:06.274Z";
const LQ = LessonQuestionId.parse("lq_2h4m8gyw0fb1cvz2nkqw0px8fq");

const question = (seq: number, ended: PageAttemptQuestion["ended"] = null): unknown => ({
  seq,
  lesson_question_id: "lq_2h4m8gyw0fb1cvz2nkqw0px8fq",
  question_type: "production",
  say: `Ile to jest dwa razy pięć? (${seq})`,
  question: {
    family: "enter",
    data: { input: "number", entry: "keypad", figure: { kind: "expression", text: "2 × 5 = ?" } },
  },
  added: "planned",
  placed: null,
  added_for: null,
  help_released: 0,
  help: [],
  tries: 0,
  ended,
  asked_at: AT,
});

function snapshot(
  id: AttemptId,
  status: "in_progress" | "paused" | "finished",
  questions: unknown[],
): AttemptSnapshot {
  return AttemptSnapshot.parse({
    attempt: {
      id,
      pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
      assignment_id: ASSIGNMENT,
      lesson_version_id: "lesv_7qre3atahx8cpak6xbjtz73var",
      learner_id: null,
      player_name: null,
      mode: "real",
      status,
      resume_at: null,
      started_at: AT,
      finished_at: status === "finished" ? AT : null,
    },
    questions,
    open_seq: status === "finished" ? null : questions.length,
    last_event_id: null,
  });
}

const refused = (): never => {
  throw new Error("not called in this test");
};

function client(changes: Partial<AttemptClient>): AttemptClient {
  return {
    featuredLessons: refused,
    startAttempt: refused,
    getAttempt: refused,
    answer: refused,
    help: refused,
    patchAttempt: refused,
    getResults: refused,
    ...changes,
  };
}

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

describe("PlayScreen", () => {
  it("starts an attempt in a new tab and keeps its id for a reload", async () => {
    const startAttempt = vi.fn(async () => snapshot(FRESH, "in_progress", [question(1)]));
    render(
      <PlayScreen assignmentId={ASSIGNMENT} language="pl" client={client({ startAttempt })} />,
    );
    expect(await screen.findAllByText("Ile to jest dwa razy pięć? (1)")).not.toHaveLength(0);
    expect(startAttempt).toHaveBeenCalledTimes(1);
    expect(storedAttempt.get(ASSIGNMENT)).toBe(FRESH);
  });

  it("waits on the paused screen after a reload, and resumes on the same question", async () => {
    storedAttempt.set(ASSIGNMENT, ATTEMPT);
    const patchAttempt = vi.fn(async () =>
      snapshot(ATTEMPT, "in_progress", [question(1, "correct"), question(2)]),
    );
    render(
      <PlayScreen
        assignmentId={ASSIGNMENT}
        language="pl"
        client={client({
          getAttempt: async () =>
            snapshot(ATTEMPT, "paused", [question(1, "correct"), question(2)]),
          patchAttempt,
        })}
      />,
    );
    const back = await screen.findByText("Wracam do lekcji");
    expect(screen.getByText("Lekcja czeka na ciebie.")).toBeTruthy();
    await act(async () => fireEvent.click(back));
    expect(patchAttempt).toHaveBeenCalledWith(ATTEMPT, { status: "in_progress" });
    expect(await screen.findAllByText("Ile to jest dwa razy pięć? (2)")).not.toHaveLength(0);
  });

  it("shows the congratulation and the questions asked once the attempt is finished", async () => {
    storedAttempt.set(ASSIGNMENT, ATTEMPT);
    const finished = snapshot(ATTEMPT, "finished", [
      question(1, "correct"),
      question(2, "skipped"),
    ]);
    const results: AttemptResults = {
      attempt: finished.attempt,
      results: [
        {
          seq: 1,
          lesson_question_id: LQ,
          say: "Pierwsze",
          added: "planned",
          ended: "correct",
          help_used: 0,
        },
        {
          seq: 2,
          lesson_question_id: LQ,
          say: "Drugie",
          added: "twin",
          ended: "skipped",
          help_used: 2,
        },
      ],
    };
    render(
      <PlayScreen
        assignmentId={ASSIGNMENT}
        language="pl"
        client={client({ getAttempt: async () => finished, getResults: async () => results })}
      />,
    );
    expect(await screen.findByText("Brawo! To już wszystko na dziś.")).toBeTruthy();
    expect(await screen.findByText("Pierwsze")).toBeTruthy();
    expect(screen.getByText("Udało się")).toBeTruthy();
    expect(screen.getByText("Wrócimy do tego")).toBeTruthy();
    expect(screen.getByText("podobne pytanie")).toBeTruthy();
    expect(screen.getByText("Pomoc: 2")).toBeTruthy();
    expect(screen.queryByText(/\d+ ?\/ ?\d+|%/)).toBeNull();
  });

  it("forgets an attempt the server does not know and starts a new one", async () => {
    storedAttempt.set(ASSIGNMENT, ATTEMPT);
    const startAttempt = vi.fn(async () => snapshot(FRESH, "in_progress", [question(1)]));
    render(
      <PlayScreen
        assignmentId={ASSIGNMENT}
        language="pl"
        client={client({
          getAttempt: async () => {
            throw new ApiError("no such attempt", 404, "NotFound");
          },
          startAttempt,
        })}
      />,
    );
    expect(await screen.findAllByText("Ile to jest dwa razy pięć? (1)")).not.toHaveLength(0);
    expect(storedAttempt.get(ASSIGNMENT)).toBe(FRESH);
  });
});
