/**
 * A text option with inline TeX stays one sentence (dl-a38n.27): the option's host stacks its
 * content and note in a column, so the sentence's runs (text, a `$2$` formula, text) must reach it
 * as one element, never as flex items of their own, each of which would draw on its own line.
 * happy-dom does no layout, so the test holds the structure that makes the line.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { ViewMode, type ViewProps } from "../view.ts";
import { ChooseView } from "./ChooseView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-30T00:00:00.000Z" }) };

const story: SpecOf<typeof Family.Choose> = {
  id: "q1",
  question_type: QuestionType.Recognition,
  say: "Które zadanie pasuje do 2 × 3?",
  family: Family.Choose,
  data: {
    options: [
      {
        id: "o1",
        content: {
          kind: "text",
          text: "Na stole są $2$ talerze. Na każdym talerzu są $3$ jabłka. Ile jest jabłek?",
        },
      },
      { id: "o2", content: { kind: "text", text: "W koszyku są $4$ gruszki i $2$ śliwki." } },
    ],
    select: "one",
    layout: "list",
  },
  key: { correct: ["o1"] },
};

describe("a text option with inline TeX", () => {
  it("reaches the option's column host as one element, so it draws as one sentence", () => {
    const props = {
      mode: ViewMode.Play,
      spec: pageSpec(story),
      language: "pl",
      category: "child",
      clock,
      live: true,
      attemptNo: 1,
      feedback: null,
      onCommit: () => {},
      around: { checking: false, moveOn: null, ladder: { help: null, ask: null, refused: false } },
    };
    render(
      <StepFrame stepId="q1">
        <ChooseView {...(props as unknown as ViewProps<typeof Family.Choose>)} />
      </StepFrame>,
    );
    const formulas = document.querySelectorAll("[data-formula]");
    expect(formulas.length).toBe(4);
    for (const formula of formulas) {
      // The column host is the nearest `flex-col` around the formula; the sentence is one child.
      const host = formula.parentElement?.closest(".flex-col");
      expect(host, formula.textContent ?? "").not.toBeNull();
      expect(formula.parentElement).not.toBe(host);
      const sentence = [...(host?.childNodes ?? [])];
      expect(sentence).toHaveLength(1);
      expect(sentence[0]?.textContent).toMatch(/^(Na stole są 2 talerze\.|W koszyku są 4)/);
    }
    expect(screen.getByText(/Na stole są/).textContent).toBe(
      "Na stole są 2 talerze. Na każdym talerzu są 3 jabłka. Ile jest jabłek?",
    );
  });
});
