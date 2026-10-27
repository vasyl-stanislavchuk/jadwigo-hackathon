/**
 * Enter with `input: expression` (dl-w3.51.1): the view plays it on the keypad with sign keys and
 * from a hardware keyboard, and an unfinished expression is a gap, not a miss. The judge, which
 * compares by value and form, is `packages/core`'s.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { Family, QuestionType } from "../names.ts";
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

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-18T00:00:00.000Z" }) };
const common = { language: "en" as const, category: "child" as const, clock };

const product: SpecOf<typeof Family.Enter> = {
  id: "e1",
  question_type: QuestionType.Expression,
  say: "Write a multiplication for the scoops.",
  family: Family.Enter,
  data: { input: "expression", entry: "keypad" },
  key: { accept: ["2×5"], form: "product" },
};
const errors = (spec: SpecOf<typeof Family.Enter>) =>
  validate(spec)
    .filter((p) => p.level === "error")
    .map((p) => p.rule);

describe("validate an expression", () => {
  it("asks that every accepted form parses and has the form the key requires", () => {
    expect(errors(product)).toEqual([]);
    expect(errors({ ...product, key: { accept: ["2×5", "ten"] } })).toEqual(["not_an_expression"]);
    expect(errors({ ...product, key: { accept: ["2+5"], form: "product" } })).toEqual([
      "form_mismatch",
    ]);
    expect(errors({ ...product, key: { accept: ["2×5"], tolerance: 1 } })).toEqual([
      "tolerance_on_text",
    ]);
    expect(
      errors({
        ...product,
        data: { input: "number", entry: "keypad" },
        key: { accept: ["10"], form: "product" },
      }),
    ).toEqual(["form_on_text"]);
  });
});

const PICTURE = {
  src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>',
  alt: "A pencil lying flat",
  width: 400,
  height: 170,
};
const pencil: SpecOf<typeof Family.Enter> = {
  id: "m1",
  question_type: QuestionType.Measure,
  say: "Measure the pencil. How many centimetres?",
  family: Family.Enter,
  data: {
    input: "number",
    entry: "keypad",
    figure: { kind: "ruler", picture: PICTURE, unit: "cm", length: 8, pixels_per_unit: 40 },
  },
  key: { accept: ["6"] },
};

describe("a length read off a ruler (dl-w3.51.4)", () => {
  it("validates the ruler: a scale, a length, words for the picture that never give the length away", () => {
    expect(errors(pencil)).toEqual([]);
    expect(
      errors({
        ...pencil,
        data: {
          ...pencil.data,
          figure: { ...must(pencil.data.figure), pixels_per_unit: 0 } as never,
        },
      }),
    ).toEqual(["ruler_scale"]);
    expect(errors({ ...pencil, data: { ...pencil.data, input: "text" } })).toContain(
      "ruler_needs_number",
    );
    expect(
      errors({
        ...pencil,
        data: {
          ...pencil.data,
          figure: { ...must(pencil.data.figure), picture: { ...PICTURE, alt: "" } } as never,
        },
      }),
    ).toEqual(["missing_alt"]);
    expect(
      errors({
        ...pencil,
        data: {
          ...pencil.data,
          figure: {
            ...must(pencil.data.figure),
            picture: { ...PICTURE, alt: "A pencil 6 cm long" },
          } as never,
        },
      }),
    ).toEqual(["key_in_alt"]);
  });

  it("plays: the ruler slides by arrow keys and the length goes in on the keypad", () => {
    const View = EnterView as ComponentType<object>;
    const onCommit = vi.fn();
    const props = {
      ...common,
      mode: ViewMode.Play,
      spec: pageSpec(pencil),
      live: true,
      attemptNo: 1,
      feedback: null,
      solution: null,
      onCommit,
    } as object;
    render(
      <StepFrame stepId="m1">
        <View {...props} />
      </StepFrame>,
    );
    const ruler = screen.getByRole("slider", {
      name: "Ruler. Drag it, or move it with the arrow keys.",
    });
    expect(ruler.getAttribute("data-zero")).toBe("0");
    fireEvent.keyDown(ruler, { key: "ArrowRight", shiftKey: true });
    expect(ruler.getAttribute("data-zero")).toBe("40");
    expect(ruler.getAttribute("aria-valuetext")).toBe("Ruler zero at 1.0 cm from the left");
    fireEvent.pointerDown(screen.getByRole("button", { name: "6" }));
    // The child types the number; the unit stands after the field (Enter addendum 3.8).
    const unit = must(document.querySelector("[data-unit]"));
    expect(unit.textContent).toBe("cm");
    expect(unit.previousElementSibling?.getAttribute("data-entry")).toBe("number");
    fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ entered: "6" });
    // The key never reaches the page: the figure carries no length.
    expect(JSON.stringify(pageSpec(pencil))).not.toContain('"accept"');
  });
});

describe("the expression view", () => {
  const page = pageSpec(product) as PageSpecOf<typeof Family.Enter>;
  const View = EnterView as ComponentType<object>;
  function play(onCommit = vi.fn()) {
    const props = {
      ...common,
      mode: ViewMode.Play,
      spec: page,
      live: true,
      attemptNo: 1,
      feedback: null,
      solution: null,
      onCommit,
    } as object;
    render(
      <StepFrame stepId="e1">
        <View {...props} />
      </StepFrame>,
    );
    return { onCommit };
  }

  it("writes 2×5 from the digit and sign keys and commits it as typed", () => {
    const { onCommit } = play();
    fireEvent.pointerDown(screen.getByRole("button", { name: "2" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Times" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "5" }));
    expect(screen.getByRole("textbox").textContent).toBe("2×5");
    fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ entered: "2×5" });
  });

  it("takes a hardware keyboard, with * as ×", () => {
    const { onCommit } = play();
    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "*" });
    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ entered: "5×2" });
  });

  it("takes Khan’s 6+6+6+6+6+6+6+6, 15 characters, whole (the limit is 24, Enter addendum 3.7)", () => {
    const { onCommit } = play();
    const sum = "6+6+6+6+6+6+6+6";
    for (const key of sum) fireEvent.keyDown(window, { key });
    expect(screen.getByRole("textbox").textContent).toBe(sum);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ entered: sum });
  });

  it("says an unfinished expression is still to finish instead of judging it", () => {
    const { onCommit } = play();
    fireEvent.pointerDown(screen.getByRole("button", { name: "2" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Times" }));
    act(() => {
      fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Finish the expression first.");
  });

  it("shows the key in a preview only when asked, as written", () => {
    const { rerender } = render(
      <EnterView
        {...common}
        mode={ViewMode.Preview}
        spec={page}
        answerKey={product.key}
        showKey={false}
      />,
    );
    expect(screen.queryByText("2×5")).toBeNull();
    rerender(
      <EnterView {...common} mode={ViewMode.Preview} spec={page} answerKey={product.key} showKey />,
    );
    expect(screen.getByText("2×5")).toBeTruthy();
  });
});

// An equation (dl-w3.70.17): "15 is 3 times as many as 5", written 15 = 5×3. Invented numbers.
const comparison: SpecOf<typeof Family.Enter> = {
  ...product,
  id: "e2",
  say: "Write this comparison as a multiplication equation.",
  data: { input: "expression", entry: "keypad", equation: true },
  key: { accept: ["15=5×3"] },
};

describe("an equation", () => {
  it("validates: an equation key needs the = key, and the = key an equation key", () => {
    expect(errors(comparison)).toEqual([]);
    expect(errors({ ...comparison, data: { input: "expression", entry: "keypad" } })).toEqual([
      "equation_needs_key",
    ]);
    expect(errors({ ...product, data: { ...product.data, equation: true } })).toEqual([
      "equation_without_key",
    ]);
    expect(errors({ ...comparison, key: { accept: ["15=5×3=15"] } })).toEqual(["not_an_equation"]);
  });

  it("plays on the keypad with an = key, and an equation ending on = is still to finish", () => {
    const View = EnterView as ComponentType<object>;
    const onCommit = vi.fn();
    const props = {
      ...common,
      mode: ViewMode.Play,
      spec: pageSpec(comparison),
      live: true,
      attemptNo: 1,
      feedback: null,
      solution: null,
      onCommit,
    } as object;
    render(
      <StepFrame stepId="e2">
        <View {...props} />
      </StepFrame>,
    );
    for (const name of ["1", "5", "Equals"])
      fireEvent.pointerDown(screen.getByRole("button", { name }));
    act(() => {
      fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Finish the expression first.");
    for (const key of ["3", "*", "5", "Enter"]) fireEvent.keyDown(window, { key });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ entered: "15=3×5" });
  });

  it("the plain expression keypad has no = key", () => {
    const View = EnterView as ComponentType<object>;
    const props = {
      ...common,
      mode: ViewMode.Play,
      spec: pageSpec(product),
      live: true,
      attemptNo: 1,
      feedback: null,
      solution: null,
      onCommit: vi.fn(),
    } as object;
    render(
      <StepFrame stepId="e1">
        <View {...props} />
      </StepFrame>,
    );
    expect(screen.queryByRole("button", { name: "Equals" })).toBeNull();
  });
});
