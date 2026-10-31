/**
 * The end list's cards (dl-uukj.30.6): once the review has loaded, each card draws the child's
 * answer, with the right answer beside it only where the answer was not right; before it has, the
 * card is as it was. Logic only: happy-dom does no layout (`dl-5ssh.73`).
 */

import type { AttemptReview, PageAttemptResult, ReviewQuestion } from "@jadwigo/contracts";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { reviewQuestion } from "./fixtures.ts";
import { ReviewList } from "./ReviewList.tsx";

afterEach(cleanup);

const rowOf = (q: ReviewQuestion): PageAttemptResult =>
  ({
    seq: q.seq,
    lesson_question_id: "lq_1",
    say: q.say,
    added: q.added,
    ended: q.ended,
    help_used: q.help_used,
  }) as PageAttemptResult;

const questions = [
  reviewQuestion(1, "correct"),
  reviewQuestion(2, "missed"),
  reviewQuestion(3, "skipped"),
];
const rows = questions.map(rowOf);
const review = { questions } as unknown as AttemptReview;

const card = (seq: number): Element => {
  const li = document.querySelector(`[data-review-list] li[data-seq="${seq}"]`);
  if (li === null) throw new Error(`no card ${seq}`);
  return li;
};

describe("ReviewList", () => {
  it("a right answer: the child's answer on the card, and no right answer beside it", () => {
    render(<ReviewList rows={rows} review={review} language="pl" linkOf={(s) => `/r/${s}`} />);
    const answer = card(1).querySelector("[data-card-answer]")?.textContent ?? "";
    expect(answer).toContain("10");
    expect(answer).not.toContain("Poprawna odpowiedź");
  });

  it("a missed one: the child's answer and the right answer, each once", () => {
    render(<ReviewList rows={rows} review={review} language="pl" linkOf={(s) => `/r/${s}`} />);
    const answer = card(2).querySelector("[data-card-answer]")?.textContent ?? "";
    expect(answer).toContain("7");
    expect(answer.split("Poprawna odpowiedź")).toHaveLength(2);
    expect(answer).toContain("10");
  });

  it("a skipped one: no answer this time, and the right answer", () => {
    render(<ReviewList rows={rows} review={review} language="pl" linkOf={(s) => `/r/${s}`} />);
    const answer = card(3).querySelector("[data-card-answer]");
    expect(answer?.querySelector("[data-card-no-answer]")).not.toBeNull();
    expect(answer?.textContent).toContain("10");
  });

  it("before the review has loaded, the cards carry no answers", () => {
    render(<ReviewList rows={rows} language="pl" linkOf={(s) => `/r/${s}`} />);
    expect(document.querySelector("[data-card-answer]")).toBeNull();
    expect(card(1).textContent).toContain("Udało się");
  });

  it("shows no score and no count", () => {
    render(<ReviewList rows={rows} review={review} language="pl" linkOf={(s) => `/r/${s}`} />);
    expect(document.body.textContent).not.toMatch(/\d+ ?\/ ?\d+|%/);
  });
});
