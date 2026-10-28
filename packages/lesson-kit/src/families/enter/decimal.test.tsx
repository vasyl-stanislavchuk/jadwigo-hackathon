/**
 * A decimal answer (dl-w3.70.7): the key is written with a point and read as a scaled integer, with
 * a comma or a point, a leading separator and trailing zeros; the keypad has a comma key (owner,
 * 2026-10-25) and a hardware `.` types itself. The judge is `packages/core`'s. Invented numbers only.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { parseDecimal } from "../../parts/exact.ts";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { answerWords } from "../answer.ts";
import { Family, QuestionType } from "../names.ts";
import { SlotsView } from "../slots/SlotsView.tsx";
import { pageSpec, type SpecOf } from "../types.ts";
import { validate } from "../validate.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
import { EnterView } from "./EnterView.tsx";

// A step test is written for a phone window, 390 x 844: the lesson picks its frame from the window
// (parts/frame.ts), and happy-dom opens at 1024 x 768.
beforeAll(() => {
  (
    window as unknown as {
      happyDOM: { setViewport(size: { width: number; height: number }): void };
    }
  ).happyDOM.setViewport({ width: 390, height: 844 });
});

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-25T00:00:00.000Z" }) };
const common = { language: "en" as const, category: "child" as const, clock };

const tenths: SpecOf<typeof Family.Enter> = {
  id: "d1",
  question_type: QuestionType.Production,
  say: "Write the shaded part as a decimal.",
  family: Family.Enter,
  data: { input: "number", entry: "keypad", decimal: true },
  key: { accept: ["0.6"] },
};
const errors = (spec: SpecOf<typeof Family.Enter> | SpecOf<typeof Family.Slots>) =>
  validate(spec)
    .filter((p) => p.level === "error")
    .map((p) => p.rule);

describe("exact decimals", () => {
  it("reads a comma or a point, a leading separator and trailing zeros as one number", () => {
    for (const t of ["0,5", "0.5", ",5", ".5", "0,50", " 0.500 "])
      expect(parseDecimal(t), t).toEqual({ n: 1, d: 2 });
    expect(parseDecimal("12,37")).toEqual({ n: 1237, d: 100 });
    expect(parseDecimal("7")).toEqual({ n: 7, d: 1 });
    expect(parseDecimal("-1,25")).toEqual({ n: -5, d: 4 });
  });

  it("is no number with a separator and nothing after it, two separators, or letters", () => {
    for (const t of ["5,", ",", "", "1,2,3", "1.2.3", "0,5a", "1 5"])
      expect(parseDecimal(t), t).toBeNull();
  });
});

describe("validate and help for a decimal", () => {
  it("asks for a key written with digits and one point, and the comma key on a number only", () => {
    expect(errors(tenths)).toEqual([]);
    expect(errors({ ...tenths, key: { accept: ["0,6"] } })).toEqual(["not_a_decimal"]);
    expect(errors({ ...tenths, data: { input: "number", entry: "keypad" } })).toEqual([
      "not_a_number",
    ]);
    expect(
      errors({
        ...tenths,
        data: { input: "text", entry: "keyboard", decimal: true },
        key: { accept: ["zero"] },
      }),
    ).toEqual(["decimal_on_text"]);
  });

  it("finds the answer said with a comma", () => {
    expect(errors({ ...tenths, say: "Is it 0,6?" })).toEqual(["key_in_say"]);
    expect(answerWords(tenths)).toEqual(["0.6", "0,6"]);
  });
});

describe("the decimal view", () => {
  const View = EnterView as ComponentType<object>;
  function play(onCommit = vi.fn()) {
    const props = {
      ...common,
      mode: ViewMode.Play,
      spec: pageSpec(tenths),
      live: true,
      attemptNo: 1,
      feedback: null,
      solution: null,
      onCommit,
    } as object;
    render(
      <StepFrame stepId="d1">
        <View {...props} />
      </StepFrame>,
    );
    return { onCommit };
  }

  it("writes 0,6 with the comma key and commits it as typed; a second comma is not typed", () => {
    const { onCommit } = play();
    fireEvent.pointerDown(screen.getByRole("button", { name: "0" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Comma" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Comma" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "6" }));
    expect(screen.getByRole("textbox").textContent).toBe("0,6");
    fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ entered: "0,6" });
  });

  it("takes a point from a hardware keyboard, kept as typed", () => {
    const { onCommit } = play();
    for (const key of ["1", ".", "2", "5", "Enter"]) fireEvent.keyDown(window, { key });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ entered: "1.25" });
  });

  it("says a number ending in its comma is still to finish instead of judging it", () => {
    const { onCommit } = play();
    fireEvent.pointerDown(screen.getByRole("button", { name: "5" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Comma" }));
    act(() => {
      fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Write a digit after the comma.");
  });

  it("shows the key with the language’s separator, and a child’s 0.60 as the same answer", () => {
    const page = pageSpec(tenths) as PageSpecOf<typeof Family.Enter>;
    render(
      <EnterView
        {...common}
        language="pl"
        mode={ViewMode.Preview}
        spec={page}
        answerKey={tenths.key}
        showKey
      />,
    );
    expect(screen.getByText("0,6")).toBeTruthy();
    cleanup();
    render(
      <EnterView
        {...common}
        mode={ViewMode.Review}
        spec={page}
        value={{ entered: "0.60" }}
        answerKey={tenths.key}
        verdict={{ correct: true, mistake_class: null, parts: [] }}
      />,
    );
    expect(screen.getAllByText(/0\.6/).length).toBe(1);
  });
});

const gaps: SpecOf<typeof Family.Slots> = {
  id: "d2",
  question_type: QuestionType.FillGaps,
  say: "Fill in the gaps.",
  family: Family.Slots,
  data: {
    template: "{g1} tenths is {g2}",
    gaps: [
      { id: "g1", kind: Family.Enter, input: "number" },
      { id: "g2", kind: Family.Enter, input: "number", decimal: true },
    ],
  },
  key: {
    gaps: {
      g1: { kind: Family.Enter, accept: ["3"] },
      g2: { kind: Family.Enter, accept: ["0.3"] },
    },
  },
};

describe("a decimal gap", () => {
  it("validates the decimal beside a whole number", () => {
    expect(errors(gaps)).toEqual([]);
    expect(
      errors({
        ...gaps,
        key: { gaps: { ...gaps.key.gaps, g2: { kind: Family.Enter, accept: ["3/10"] } } },
      }),
    ).toEqual(["not_a_decimal"]);
  });

  it("types the comma only into the decimal gap", () => {
    const View = SlotsView as ComponentType<object>;
    const onCommit = vi.fn();
    const props = {
      ...common,
      mode: ViewMode.Play,
      spec: pageSpec(gaps),
      live: true,
      attemptNo: 1,
      feedback: null,
      solution: null,
      onCommit,
    } as object;
    render(
      <StepFrame stepId="d2">
        <View {...props} />
      </StepFrame>,
    );
    fireEvent.pointerDown(screen.getByRole("button", { name: "3" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Comma" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Gap 2" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Comma" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "3" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { g1: "3", g2: ",3" } });
  });
});
