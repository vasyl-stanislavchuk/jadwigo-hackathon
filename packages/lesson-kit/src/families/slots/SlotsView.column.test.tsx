/**
 * A written column and a number pyramid in the Gaps view (dl-w3.61.4): the cells are named by
 * place, the keypad starts at the units and moves left by itself, a small cell may stay empty at
 * Check, a crossed-out digit only gains a line, and the pyramid's bricks read top to bottom.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { Family, QuestionType } from "../names.ts";
import { ViewMode } from "../view.ts";
import { type ColumnSum, columnKey } from "./column.ts";
import type { SlotsData } from "./model.ts";
import { SlotsView } from "./SlotsView.tsx";

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

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-19T00:00:00.000Z" }) };

function play(data: SlotsData) {
  const onCommit = vi.fn();
  render(
    <StepFrame stepId="s1">
      <SlotsView
        mode={ViewMode.Play}
        spec={{
          id: "s1",
          say: "Add.",
          question_type: QuestionType.Column,
          family: Family.Slots,
          data,
        }}
        language="en"
        category="child"
        clock={clock}
        live
        attemptNo={1}
        feedback={null}
        onCommit={onCommit}
      />
    </StepFrame>,
  );
  return onCommit;
}
const column = (s: ColumnSum): SlotsData => ({ template: "", column: s, gaps: columnKey(s).gaps });
const key = (d: string) => fireEvent.click(screen.getByRole("button", { name: d }), { detail: 0 });

describe("a written column", () => {
  it("starts at the units, moves left by itself, and commits with an empty small cell", () => {
    const onCommit = play(
      column({ op: "add", operands: [41, 38], given_steps: 0, carry_row: true }),
    );
    expect(screen.getByRole("group", { name: "41 + 38" })).toBeTruthy();
    expect(screen.getByLabelText("the answer’s ones").getAttribute("aria-pressed")).toBe("true");
    key("9");
    expect(
      screen.getByLabelText("the small box in the tens column").getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByLabelText("the answer’s tens"), { detail: 0 });
    key("7");
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { r0: "9", r1: "7" } });
  });
  it("takes one digit per cell", () => {
    play(column({ op: "add", operands: [47, 38], given_steps: 0, carry_row: true }));
    key("5");
    key("1");
    key("8");
    expect(screen.getByLabelText("the answer’s ones").textContent).toBe("5");
    expect(screen.getByLabelText("the small box in the tens column").textContent).toBe("1");
    expect(screen.getByLabelText("the answer’s tens").textContent).toBe("8");
  });
  it("draws the given columns as digits, not gaps", () => {
    play(column({ op: "add", operands: [365, 278], given_steps: 1, carry_row: true }));
    expect(screen.queryByLabelText("the answer’s ones")).toBeNull();
    expect(screen.getByLabelText("the answer’s tens").getAttribute("aria-pressed")).toBe("true");
  });
  it("crosses out a lending digit once its small cell is written", () => {
    play(column({ op: "sub", operands: [52, 27], given_steps: 0, carry_row: true }));
    expect(document.querySelector("[data-struck]")).toBeNull();
    key("5");
    key("4");
    expect(must(document.querySelector("[data-struck]")).textContent).toBe("5");
  });
});

describe("a number pyramid", () => {
  it("draws its bricks top to bottom with the gaps in them", () => {
    play({
      template: "",
      pyramid: [["{g1}"], ["{g2}", 9], [6, 5, 4]],
      gaps: ["g1", "g2"].map((id) => ({ id, kind: Family.Enter, input: "number" as const })),
    });
    expect(document.querySelectorAll("[data-brick]").length).toBe(6);
    expect(
      [...document.querySelectorAll('[aria-label^="Gap "]')].map((e) =>
        e.getAttribute("aria-label"),
      ),
    ).toEqual(["Gap 1", "Gap 2"]);
  });
  it("opens on the lowest gap and fills from the bottom up (addendum 4.5)", () => {
    play({
      template: "",
      pyramid: [["{g1}"], ["{g2}", 9], [6, 5, 4]],
      gaps: ["g1", "g2"].map((id) => ({ id, kind: Family.Enter, input: "number" as const })),
    });
    expect(screen.getByLabelText("Gap 2").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Gap 1").getAttribute("aria-pressed")).toBe("false");
  });
});
