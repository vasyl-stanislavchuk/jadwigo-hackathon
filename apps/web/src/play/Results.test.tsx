/**
 * The lesson's end (dl-uukj.30.6): the fixed congratulation first, then a kind line picked by how
 * it went, with no number, and a button that opens the first question's review step.
 */

import type { AttemptResults, PageAttemptResult } from "@jadwigo/contracts";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Results } from "./Results.tsx";

afterEach(cleanup);

const row = (seq: number, ended: PageAttemptResult["ended"]): PageAttemptResult =>
  ({
    seq,
    lesson_question_id: "lq_1",
    say: `Pytanie ${seq}`,
    added: "planned",
    ended,
    help_used: 0,
  }) as PageAttemptResult;

const resultsOf = (...rows: PageAttemptResult[]): AttemptResults =>
  ({ attempt: { mode: "preview", learner_id: null }, results: rows }) as unknown as AttemptResults;

const text = (selector: string): string | undefined =>
  document.querySelector(selector)?.textContent ?? undefined;

describe("Results", () => {
  it("all right: the congratulation, then the all-right line, then the walk from the first question", () => {
    render(
      <Results
        results={resultsOf(row(4, "correct"), row(5, "correct"))}
        language="pl"
        linkOf={(s) => `/r/${s}`}
      />,
    );
    const page = document.querySelector("[data-results]");
    expect(page?.firstElementChild?.hasAttribute("data-congrats")).toBe(true);
    expect(text("[data-results-summary]")).toBe("Wszystko się udało! Zobacz swoje odpowiedzi.");
    const walk = document.querySelector("[data-review-walk]");
    expect(walk?.textContent).toBe("Obejrzyj odpowiedzi");
    expect(walk?.getAttribute("href")).toBe("/r/4");
  });

  it("one missed: the line about practising some again, with no number", () => {
    render(
      <Results
        results={resultsOf(row(1, "correct"), row(2, "missed"))}
        language="pl"
        linkOf={(s) => `/r/${s}`}
      />,
    );
    expect(text("[data-results-summary]")).toContain("jeszcze poćwiczymy");
    expect(document.body.textContent).not.toMatch(/\d+ ?\/ ?\d+|%/);
  });

  it("no questions: no line and no walk", () => {
    render(<Results results={resultsOf()} language="pl" linkOf={(s) => `/r/${s}`} />);
    expect(document.querySelector("[data-results-summary]")).toBeNull();
    expect(document.querySelector("[data-review-walk]")).toBeNull();
  });
});
