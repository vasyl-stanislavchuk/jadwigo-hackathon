/**
 * A fraction answer (dl-w3.70.16): typed into stacked boxes, the numerator over a bar over the
 * denominator with a whole-number box in front for a mixed number (owner, 2026-10-25). Where lowest
 * terms are required the judge (`packages/core`) goes first, and only a right fraction not in them
 * gets a nudge, with the step left open, never a miss (Enter addendum 3.4). Invented numbers only.
 */

import type { CopyKey } from "@jadwigo/copy";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { parseFraction } from "../../parts/exact.ts";
import { boxesOf, halfFraction, textOf, typeInto } from "../../parts/fractionEntry.ts";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { answerWords } from "../answer.ts";
import { missingFraction, missingGaps } from "../complete.ts";
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

const shaded: SpecOf<typeof Family.Enter> = {
  id: "f1",
  question_type: QuestionType.Production,
  say: "What fraction of the bar is shaded?",
  family: Family.Enter,
  data: { input: "fraction", entry: "keypad", simplify: "required" },
  key: { accept: ["2/5"] },
};
const mixed: SpecOf<typeof Family.Enter> = {
  ...shaded,
  id: "f2",
  say: "Write the improper fraction as a mixed number.",
  data: { input: "fraction", entry: "keypad", whole: true, simplify: "required" },
  key: { accept: ["3 1/3"], forms: ["mixed"] },
};
const errors = (spec: SpecOf<typeof Family.Enter> | SpecOf<typeof Family.Slots>) =>
  validate(spec)
    .filter((p) => p.level === "error")
    .map((p) => p.rule);

describe("the boxes as a string", () => {
  it("round-trips every way the boxes can be filled", () => {
    for (const b of [
      { whole: "", num: "3", den: "4" },
      { whole: "2", num: "1", den: "4" },
      { whole: "5", num: "", den: "" },
      { whole: "", num: "3", den: "" },
      { whole: "", num: "", den: "4" },
      { whole: "2", num: "", den: "4" },
    ])
      expect(boxesOf(textOf(b))).toEqual(b);
    expect(textOf({ whole: "2", num: "1", den: "4" })).toBe("2 1/4");
  });

  it("types into one box at a time, three digits at most, and a backspace in an empty box steps back", () => {
    expect(typeInto("", "num", { digit: "3" }, false)).toEqual({ text: "3/", box: "num" });
    expect(typeInto("3/", "den", { digit: "4" }, false)).toEqual({ text: "3/4", box: "den" });
    expect(typeInto("3/123", "den", { digit: "4" }, false).text).toBe("3/123");
    expect(typeInto("3/", "den", "backspace", false)).toEqual({ text: "", box: "num" });
    expect(typeInto("2 /", "num", "backspace", true)).toEqual({ text: "", box: "whole" });
    expect(halfFraction("3/")).toBe(true);
    expect(halfFraction("2")).toBe(false);
  });

  it("reads a fraction, a mixed number and a whole number with their forms", () => {
    expect(parseFraction("3/4")).toEqual({
      value: { n: 3, d: 4 },
      form: "proper",
      simplified: true,
    });
    expect(parseFraction("6/4")).toEqual({
      value: { n: 3, d: 2 },
      form: "improper",
      simplified: false,
    });
    expect(parseFraction("2 1/4")).toEqual({
      value: { n: 9, d: 4 },
      form: "mixed",
      simplified: true,
    });
    expect(parseFraction("1 5/4")?.simplified).toBe(false);
    expect(parseFraction("3")?.form).toBe("integer");
    expect(parseFraction("3/0")).toBeNull();
    expect(parseFraction("3/")).toBeNull();
  });
});

describe("what is still missing from a fraction", () => {
  it("one of its two numbers, and never lowest terms: the judge goes first (Enter addendum 3.4)", () => {
    expect(missingFraction("")?.reason).toBe("incomplete_text");
    expect(missingFraction("2/")?.reason).toBe("incomplete_fraction_boxes");
    expect(missingFraction("4/10")).toBeNull();
    expect(missingFraction("2/5")).toBeNull();
  });
});

// fraction-shaded (playground/examples/enter.ts): two of six parts shaded, 1/3 asked in lowest terms.
const sixths: SpecOf<typeof Family.Enter> = {
  ...shaded,
  id: "f4",
  data: { input: "fraction", entry: "keypad", simplify: "required" },
  key: { accept: ["1/3"], near: { "4/6": "counted_unshaded" } },
};

describe("validate and help for a fraction", () => {
  it("asks for fractions the boxes can hold, a whole box for a mixed number, and a solution in a form the key takes", () => {
    expect(errors(shaded)).toEqual([]);
    expect(errors(mixed)).toEqual([]);
    expect(errors({ ...shaded, key: { accept: ["0.4"] } })).toEqual(["not_a_fraction"]);
    expect(errors({ ...mixed, data: { input: "fraction", entry: "keypad" } })).toEqual([
      "mixed_needs_whole",
    ]);
    expect(errors({ ...mixed, key: { accept: ["10/3"], forms: ["mixed"] } })).toEqual([
      "solution_form",
    ]);
    expect(
      errors({
        ...shaded,
        data: { input: "number", entry: "keypad", simplify: "required" },
        key: { accept: ["2"] },
      }),
    ).toEqual(["fraction_rule_on_text"]);
  });

  it("a hint printing the fraction in TeX gives it away", () => {
    expect(answerWords(mixed)).toContain("3\\dfrac{1}{3}");
  });
});

describe("the fraction view", () => {
  const View = EnterView as ComponentType<object>;
  function play(
    spec: SpecOf<typeof Family.Enter>,
    onCommit = vi.fn(),
    nudge?: (value: unknown) => CopyKey | null,
  ) {
    const props = {
      ...common,
      mode: ViewMode.Play,
      spec: pageSpec(spec),
      live: true,
      attemptNo: 1,
      feedback: null,
      solution: null,
      onCommit,
      ...(nudge ? { around: { checking: false, moveOn: null, nudge } } : {}),
    } as object;
    render(
      <StepFrame stepId={spec.id}>
        <View {...props} />
      </StepFrame>,
    );
    return { onCommit };
  }

  it("types the numerator, then the denominator after a tap on its box, and commits 2/5", () => {
    const { onCommit } = play(shaded);
    expect(screen.queryByRole("button", { name: "Whole number" })).toBeNull();
    fireEvent.pointerDown(screen.getByRole("button", { name: "2" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Bottom number" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "5" }));
    expect(screen.getByRole("button", { name: "Top number" }).textContent).toBe("2");
    expect(screen.getByRole("button", { name: "Bottom number" }).textContent).toBe("5");
    fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ entered: "2/5" });
  });

  it("nudges a right 2/6 with the boxes unmarked and keeps the step open", () => {
    // The server's ask on 2/6 (judged right, not in lowest terms): `packages/core`'s.
    const nudge = (value: unknown): CopyKey | null =>
      (value as { entered: string }).entered === "2/6" ? "fraction_simplify" : null;
    const { onCommit } = play(sixths, vi.fn(), nudge);
    for (const key of ["2", "/", "6"]) fireEvent.keyDown(window, { key });
    act(() => {
      fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Can you write this fraction more simply?");
    // The boxes are not marked: 2/6 is not wrong.
    for (const name of ["Top number", "Bottom number"])
      expect(screen.getByRole("button", { name }).getAttribute("data-tone"), name).toBe("idle");
  });

  it("asks for the other number when only one is written", () => {
    const { onCommit } = play(shaded);
    fireEvent.pointerDown(screen.getByRole("button", { name: "2" }));
    act(() => {
      fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Write the top and the bottom number.");
  });

  it("after a miss selects the first box, so the next digit replaces it and a backspace clears it (§3.5)", () => {
    const onCommit = vi.fn();
    const at = (feedback: { kind: "try_again"; index: number } | null, attemptNo: number) => {
      const props = {
        ...common,
        mode: ViewMode.Play,
        spec: pageSpec(shaded),
        live: true,
        attemptNo,
        feedback,
        solution: null,
        onCommit,
      } as object;
      return (
        <StepFrame stepId={shaded.id}>
          <View {...props} />
        </StepFrame>
      );
    };
    const { rerender } = render(at(null, 1));
    for (const key of ["3", "/", "5"]) fireEvent.keyDown(window, { key });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    fireEvent.pointerUp(document);
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ entered: "3/5" });
    rerender(at({ kind: "try_again", index: 0 }, 2));
    const top = screen.getByRole("button", { name: "Top number" });
    expect(document.activeElement).toBe(top);
    expect(top.hasAttribute("data-selected")).toBe(true);
    fireEvent.keyDown(window, { key: "2" });
    expect(top.textContent).toBe("2");
    expect(screen.getByRole("button", { name: "Bottom number" }).textContent).toBe("5");
    expect(top.hasAttribute("data-selected")).toBe(false);
    rerender(at({ kind: "try_again", index: 1 }, 3));
    fireEvent.keyDown(window, { key: "Backspace" });
    expect(top.textContent?.trim()).toBe("");
  });

  it("a mixed number starts in the whole number’s box", () => {
    const { onCommit } = play(mixed);
    fireEvent.pointerDown(screen.getByRole("button", { name: "3" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Top number" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "1" }));
    fireEvent.keyDown(window, { key: "/" });
    fireEvent.pointerDown(screen.getByRole("button", { name: "3" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ entered: "3 1/3" });
  });

  it("shows the right fraction in its boxes once the step ends", () => {
    render(
      <EnterView
        {...common}
        mode={ViewMode.Review}
        spec={pageSpec(mixed) as PageSpecOf<typeof Family.Enter>}
        value={{ entered: "10/3" }}
        answerKey={mixed.key}
        verdict={{ correct: false, mistake_class: "wrong_form", parts: [] }}
      />,
    );
    const right = screen.getByRole("group", { name: "The answer" });
    expect(right.getAttribute("data-fraction")).toBe("3 1/3");
    expect(screen.getByRole("group", { name: "Your answer" }).getAttribute("data-fraction")).toBe(
      "10/3",
    );
  });
});

const grid: SpecOf<typeof Family.Slots> = {
  id: "f3",
  question_type: QuestionType.FillGaps,
  say: "Write the shaded part as a fraction and as a decimal.",
  family: Family.Slots,
  data: {
    template: "Fraction: {g1} Decimal: {g2}",
    gaps: [
      { id: "g1", kind: Family.Enter, input: "fraction" },
      { id: "g2", kind: Family.Enter, input: "number", decimal: true },
    ],
  },
  key: {
    gaps: {
      g1: { kind: Family.Enter, accept: ["3/10"], forms: ["proper"] },
      g2: { kind: Family.Enter, accept: ["0.3"] },
    },
  },
};

describe("a fraction gap", () => {
  it("validates the fraction beside a decimal, and is missing while half written", () => {
    expect(errors(grid)).toEqual([]);
    expect(missingGaps(grid.data, { gaps: { g1: "3/", g2: "0,3" } })?.reason).toBe(
      "incomplete_fraction_boxes",
    );
  });

  it("types into the fraction’s boxes and the decimal gap on one keypad", () => {
    const View = SlotsView as ComponentType<object>;
    const onCommit = vi.fn();
    const props = {
      ...common,
      mode: ViewMode.Play,
      spec: pageSpec(grid),
      live: true,
      attemptNo: 1,
      feedback: null,
      solution: null,
      onCommit,
    } as object;
    render(
      <StepFrame stepId="f3">
        <View {...props} />
      </StepFrame>,
    );
    fireEvent.pointerDown(screen.getByRole("button", { name: "3" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Bottom number" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "1" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "0" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Gap 2" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "0" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Comma" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "3" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { g1: "3/10", g2: "0,3" } });
  });
});
