/**
 * The screens' words inside the question keep the screens' lang (dl-uukj.41): with a Polish lesson
 * on English screens the prompt stays pl, while the answer field's name, "Choose all" and "Your
 * answer" carry en. A text field holds a word in the lesson's language, so it stays pl. With no
 * lesson language no lang is added.
 */

import { copy } from "@jadwigo/copy";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { must } from "../parts/must.ts";
import type { Clock, Instant } from "../stage/clock.ts";
import { StepFrame } from "../stage/StepFrame.tsx";
import type { Language } from "../stage/types.ts";
import { ChooseView } from "./choose/ChooseView.tsx";
import { EnterView } from "./enter/EnterView.tsx";
import { Family, QuestionType } from "./names.ts";
import { pageSpec, type SpecOf } from "./types.ts";
import { type PageSpecOf, ViewMode } from "./view.ts";

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-12T00:00:00.000Z" }) };
const common = { language: "en" as const, category: "child" as const, clock };
const base = { id: "s1", say: "Ile to jest 7 + 5?" };

const keypad: SpecOf<typeof Family.Enter> = {
  ...base,
  question_type: QuestionType.ShortText,
  family: Family.Enter,
  data: { input: "number", entry: "keypad" },
  key: { accept: ["12"] },
};
const word: SpecOf<typeof Family.Enter> = {
  ...base,
  question_type: QuestionType.ShortText,
  family: Family.Enter,
  data: { input: "text", entry: "keyboard" },
  key: { accept: ["dwanaście"] },
};
const many: SpecOf<typeof Family.Choose> = {
  ...base,
  question_type: QuestionType.MultiSelect,
  family: Family.Choose,
  data: {
    options: [12, 7, 18].map((n, i) => ({
      id: `o${i + 1}`,
      content: { kind: "number", number: n },
    })),
    select: "many",
    layout: "list",
  },
  key: { correct: ["o1", "o3"] },
};

const playing = { mode: ViewMode.Play, live: true, attemptNo: 1, feedback: null, solution: null };

function framed(node: JSX.Element, lessonLanguage?: Language) {
  return render(
    <StepFrame stepId="s1" {...(lessonLanguage === undefined ? {} : { lessonLanguage })}>
      {node}
    </StepFrame>,
  );
}

const langOf = (el: Element | null): string | null | undefined =>
  must(el).closest("[lang]")?.getAttribute("lang");
const prompt = () => screen.getAllByText("Ile to jest 7 + 5?")[0] ?? null;

beforeEach(() => {
  document.documentElement.lang = "en";
});
afterEach(cleanup);

describe("the screens' words under a lesson's lang", () => {
  it("names a keypad field in the screens' lang, the prompt in the lesson's", () => {
    framed(
      <EnterView
        {...common}
        {...playing}
        spec={pageSpec(keypad) as PageSpecOf<typeof Family.Enter>}
        onCommit={vi.fn()}
      />,
      "pl",
    );
    expect(langOf(prompt())).toBe("pl");
    const field = must(document.querySelector(`[aria-label="${copy("en", "answer_field")}"]`));
    expect(langOf(field)).toBe("en");
  });

  it("keeps a text field in the lesson's lang: the child types a word in it", () => {
    framed(
      <EnterView
        {...common}
        {...playing}
        spec={pageSpec(word) as PageSpecOf<typeof Family.Enter>}
        onCommit={vi.fn()}
      />,
      "pl",
    );
    expect(langOf(document.querySelector('input[data-entry="text"]'))).toBe("pl");
  });

  it("says Choose all in the screens' lang, over options in the lesson's", () => {
    framed(
      <ChooseView
        {...common}
        {...playing}
        spec={pageSpec(many) as PageSpecOf<typeof Family.Choose>}
        onCommit={vi.fn()}
      />,
      "pl",
    );
    expect(langOf(screen.getByText(copy("en", "choose_all")))).toBe("en");
    expect(langOf(prompt())).toBe("pl");
  });

  it("labels the learner's answer in the screens' lang on a review", () => {
    framed(
      <EnterView
        {...common}
        mode={ViewMode.Review}
        spec={pageSpec(keypad) as PageSpecOf<typeof Family.Enter>}
        value={{ entered: "11" }}
        answerKey={keypad.key}
        verdict={{ correct: false, mistake_class: "other_wrong", parts: [] }}
      />,
      "pl",
    );
    expect(langOf(screen.getByText(copy("en", "answer_yours")))).toBe("en");
  });

  it("adds no lang when the frame has no lesson language", () => {
    const { container } = framed(
      <ChooseView
        {...common}
        {...playing}
        spec={pageSpec(many) as PageSpecOf<typeof Family.Choose>}
        onCommit={vi.fn()}
      />,
    );
    expect(container.querySelector("[lang]")).toBeNull();
  });
});
