/**
 * The parent's attempt page against a double of the API (no network): the header counts, the grid
 * coloured by how each question ended, and a tile opening the review step with its tries (a right
 * one, a miss with 2 tries, a skip). Happy-dom does no layout, so this checks the logic only.
 */

import { ApiError, type ParentClient } from "@jadwigo/api-client";
import {
  AttemptId,
  LearnerId,
  type ParentAttemptReview,
  type ParentReviewQuestion,
  type ReviewTry,
} from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttemptReview } from "./AttemptReview.tsx";

const AT = "2026-10-28T14:02:06.274Z";
const POD = "pod_6et2fhbnwvb45aw9atcfzs33za";
const ATTEMPT = AttemptId.parse("att_43007b83dp9w2tnfjxhha74cyq");
const LEARNER = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
const OTHER = LearnerId.parse("lrn_7qre3atahx8cpak6xbjtz73var");

/** 3 times 4, picked from 3 numbers. */
const choose = {
  family: "choose",
  data: {
    options: [
      { id: "o1", content: { kind: "text", text: "12" } },
      { id: "o2", content: { kind: "text", text: "7" } },
      { id: "o3", content: { kind: "text", text: "16" } },
    ],
    select: "one",
    layout: "list",
  },
};

const attempt = (overrides: Partial<ReviewTry>): ReviewTry => ({
  try_no: 1,
  kind: "try",
  value: { chosen: ["o1"] },
  correct: true,
  parts: null,
  mistake_class: null,
  latency_ms: 4200,
  help_used: 0,
  skip_reason: null,
  ...overrides,
});

function question(
  seq: number,
  ended: ParentReviewQuestion["ended"],
  tries: ReviewTry[],
  timeMs: number,
): ParentReviewQuestion {
  return {
    seq,
    added: "planned",
    ended,
    help_used: 0,
    question_type: "recognition",
    say: `Ile to 3 razy 4? (${seq})`,
    question: choose,
    answer: tries.at(-1)?.value ?? null,
    parts: null,
    solution: { chosen: ["o1"] },
    reveal: null,
    tries,
    result: {
      pod_id: POD,
      attempt_id: ATTEMPT,
      seq,
      lesson_question_id: "lq_0ectzj2evqb95a3v1v6wewjzy3",
      added: "planned",
      placed: null,
      added_for: null,
      say: `Ile to 3 razy 4? (${seq})`,
      family: "choose",
      question_type: "recognition",
      tries: tries.length,
      first_try_correct: tries[0]?.correct === true,
      correct: ended === "correct",
      mistake_classes: [],
      help_used: 0,
      skip_reason: null,
      time_ms: timeMs,
      ended,
    },
  } as unknown as ParentReviewQuestion;
}

const REVIEW = {
  attempt: {
    id: ATTEMPT,
    pod_id: POD,
    assignment_id: "asg_0ectzj2evqb95a3v1v6wewjzy3",
    lesson_version_id: "lv_0ectzj2evqb95a3v1v6wewjzy3",
    learner_id: LEARNER,
    player_name: null,
    mode: "real",
    status: "finished",
    resume_at: null,
    started_at: AT,
    finished_at: AT,
  },
  title: "Równe grupy",
  language: "pl",
  questions: [
    question(1, "correct", [attempt({})], 30_000),
    question(
      2,
      "missed",
      [
        attempt({
          try_no: 1,
          value: { chosen: ["o2"] },
          correct: false,
          mistake_class: "add_for_multiply",
          latency_ms: 9_600,
        }),
        attempt({
          try_no: 2,
          value: { chosen: ["o3"] },
          correct: false,
          mistake_class: "some_class_with_no_line",
          latency_ms: 12_400,
          help_used: 1,
        }),
      ],
      75_000,
    ),
    question(
      3,
      "skipped",
      [
        attempt({
          kind: "skip",
          value: null,
          correct: null,
          latency_ms: 20_000,
          skip_reason: "dont_know",
        }),
      ],
      20_000,
    ),
  ],
} as unknown as ParentAttemptReview;

const refused = (): never => {
  throw new Error("not called in this test");
};

function client(changes: Partial<ParentClient>): ParentClient {
  return {
    getMe: refused,
    createAccount: refused,
    createLearner: refused,
    claimAttempt: refused,
    getLearnerAttempts: refused,
    getParentReview: async () => REVIEW,
    ...changes,
  };
}

async function draw(api: ParentClient, learner: LearnerId | null = LEARNER): Promise<void> {
  await act(async () => {
    render(<AttemptReview api={api} attempt={ATTEMPT} learner={learner} language="pl" />);
  });
}

const press = async (selector: string): Promise<void> => {
  const target = document.querySelector(selector);
  if (target === null) throw new Error(`no ${selector}`);
  await act(async () => fireEvent.click(target));
};

const tiles = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>("[data-tile]")];
const tries = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>("[data-try]")];

beforeEach(() => {
  window.history.replaceState(null, "", `/parent/attempts/${ATTEMPT}`);
});
afterEach(cleanup);

describe("AttemptReview", () => {
  it("asks for the attempt under its learner", async () => {
    const getParentReview = vi.fn(async () => REVIEW);
    await draw(client({ getParentReview }));
    expect(getParentReview).toHaveBeenCalledWith(LEARNER, ATTEMPT);
  });

  it("heads the page with the title, the day, the time in minutes and seconds, and counts", async () => {
    await draw(client({}));
    expect(screen.getByRole("heading", { level: 1, name: "Równe grupy" })).toBeTruthy();
    expect(document.querySelector("[data-day]")?.textContent).toBe("28 października 2026");
    // 30 s + 75 s + 20 s.
    expect(document.querySelector("[data-total-time]")?.textContent).toBe("2 min 5 s");
    expect(document.querySelector("[data-asked]")?.getAttribute("data-asked")).toBe("3");
    expect(document.querySelector("[data-first-try]")?.getAttribute("data-first-try")).toBe("1");
    expect(document.querySelector("[data-review-header]")?.textContent).not.toContain("%");
  });

  it("draws a tile per question with its seq and say, coloured by how it ended", async () => {
    await draw(client({}));
    expect(tiles().map((t) => t.dataset["ended"])).toEqual(["correct", "missed", "skipped"]);
    expect(tiles().map((t) => t.dataset["tile"])).toEqual(["1", "2", "3"]);
    expect(tiles()[1]?.textContent).toContain("Ile to 3 razy 4? (2)");
    expect(tiles()[0]?.className).toContain("bg-kid-correct-soft");
    expect(tiles()[1]?.className).toContain("bg-kid-try-again-soft");
    expect(tiles()[2]?.className).not.toMatch(/kid-(correct|try-again)/);
  });

  it("opens a right question's step with its one try", async () => {
    await draw(client({}));
    await press('[data-tile="1"]');
    expect(document.querySelector("[data-tiles]")).toBeNull();
    expect(document.querySelector("[data-review-step]")?.getAttribute("data-review-step")).toBe(
      "1",
    );
    expect(tries()).toHaveLength(1);
    expect(tries()[0]?.querySelector("[data-try-view]")).not.toBeNull();
    expect(tries()[0]?.textContent).toContain("Czas: 4 s");
    expect(tries()[0]?.querySelector("[data-said]")?.textContent).toBe("Dobrze");
  });

  it("opens a missed question's step with 2 tries, their times, help and mistakes in plain words", async () => {
    await draw(client({}));
    await press('[data-tile="2"]');
    expect(tries()).toHaveLength(2);
    expect(tries().map((t) => t.querySelector("[data-try-view]") !== null)).toEqual([true, true]);
    expect(tries()[0]?.textContent).toContain("Czas: 10 s");
    expect(tries()[0]?.textContent).toContain("Pomoc: 0");
    expect(tries()[0]?.querySelector("[data-said]")?.textContent).toBe(
      "Dodawanie zamiast mnożenia",
    );
    expect(tries()[1]?.textContent).toContain("Czas: 12 s");
    expect(tries()[1]?.textContent).toContain("Pomoc: 1");
    // A class with no line of its own never shows its raw id.
    expect(tries()[1]?.querySelector("[data-said]")?.textContent).toBe(
      "Inna odpowiedź niż ta, której szukaliśmy",
    );
  });

  it("opens a skipped question's step with the skip's reason and no answer drawn", async () => {
    await draw(client({}));
    await press('[data-tile="3"]');
    expect(tries()).toHaveLength(1);
    expect(tries()[0]?.dataset["kind"]).toBe("skip");
    expect(tries()[0]?.querySelector("[data-try-view]")).toBeNull();
    expect(tries()[0]?.querySelector("[data-said]")?.textContent).toBe("Jeszcze nie wie");
    expect(tries()[0]?.textContent).not.toContain("dont_know");
  });

  it("moves between questions and back to the grid", async () => {
    await draw(client({}));
    await press('[data-tile="1"]');
    expect(document.querySelector("[data-review-prev]")).toBeNull();
    await press("[data-review-next]");
    expect(document.querySelector("[data-review-step]")?.getAttribute("data-review-step")).toBe(
      "2",
    );
    await press("[data-review-next]");
    expect(document.querySelector("[data-review-next]")).toBeNull();
    await press("[data-review-prev]");
    expect(document.querySelector("[data-review-step]")?.getAttribute("data-review-step")).toBe(
      "2",
    );
    await press("[data-review-all]");
    expect(tiles()).toHaveLength(3);
  });

  it("with no learner named, finds the adult's learner whose attempt it is", async () => {
    const me = {
      account: null,
      member: null,
      pod: null,
      learners: [{ learner: { id: OTHER } }, { learner: { id: LEARNER } }],
    };
    const getParentReview = vi.fn(async (learner: LearnerId) => {
      if (learner === OTHER) throw new ApiError("not found", 404, "NotFound");
      return REVIEW;
    });
    await draw(client({ getMe: async () => me as never, getParentReview }), null);
    expect(getParentReview.mock.calls.map(([learner]) => learner)).toEqual([OTHER, LEARNER]);
    expect(tiles()).toHaveLength(3);
  });

  it("says it could not load an attempt that is not there or not finished", async () => {
    await draw(
      client({
        getParentReview: async () => {
          throw new ApiError("not finished", 409, "AttemptNotFinished");
        },
      }),
    );
    expect(document.querySelector("[data-failed]")).not.toBeNull();
    expect(document.querySelector("[data-parent-home]")).not.toBeNull();
  });
});
