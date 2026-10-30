/**
 * A chosen gap's dropdown (Slots addendum 2.2, dl-uukj.29.123): the list opens under its gap with
 * no option focused, ↑ ↓ walk it, only the open gap has the focus border, and the keypad stays but
 * goes quiet and types nothing until a pick closes the list. After a miss the dropdown the child is
 * in keeps its word in the miss mark under the focus border, never selected.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { Feedback } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
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

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-27T00:00:00.000Z" }) };

const data: SlotsData = {
  template: "{g1} groups of 3, and 3 × 8 = {g2}",
  gaps: [
    {
      id: "g1",
      kind: Family.Choose,
      options: [
        { id: "c1", label: "6" },
        { id: "c2", label: "8" },
      ],
    },
    { id: "g2", kind: Family.Enter, input: "number" },
  ],
};

function play(initial?: Record<string, string>) {
  const onCommit = vi.fn();
  const spec: PageSpecOf<typeof Family.Slots> = {
    id: "s1",
    say: "Fill in the gaps.",
    question_type: QuestionType.FillGaps,
    family: Family.Slots,
    data,
  };
  const at = (feedback: Feedback | null, attemptNo = 1) => (
    <StepFrame stepId="s1">
      <SlotsView
        mode={ViewMode.Play}
        spec={spec}
        language="en"
        category="child"
        clock={clock}
        live
        attemptNo={attemptNo}
        feedback={feedback}
        onCommit={onCommit}
        initialValue={initial ? { gaps: initial } : undefined}
      />
    </StepFrame>
  );
  const { rerender } = render(at(null));
  return { onCommit, verdict: (feedback: Feedback) => rerender(at(feedback, 2)) };
}

const menu = () => screen.getByRole("button", { name: "Gap 1" });
const box = () => screen.getByLabelText("Gap 2");
const pad = () => must(document.querySelector("[data-keypad-pad]"));
const key = (d: string) => fireEvent.click(screen.getByRole("button", { name: d }), { detail: 0 });

describe("a chosen gap opens its list under itself (addendum 2.2)", () => {
  it("opens with no option focused, so none draws a ring, and ↓ ↑ walk the options", () => {
    play();
    fireEvent.click(menu(), { detail: 0 });
    const list = screen.getByRole("listbox", { name: "Gap 1" });
    expect(document.activeElement).toBe(list);
    expect(list.closest('[data-gap-list="g1"]')).not.toBeNull();
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("option", { name: "6" }));
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("option", { name: "8" }));
    fireEvent.keyDown(list, { key: "ArrowUp" });
    expect(document.activeElement).toBe(screen.getByRole("option", { name: "6" }));
  });

  it("while open, only the open gap is active and the keypad is quiet and types nothing", () => {
    play();
    expect(box().getAttribute("data-active")).toBe("true");
    fireEvent.click(menu(), { detail: 0 });
    expect(menu().hasAttribute("data-menu-open")).toBe(true);
    expect(menu().className).toContain("border-primary");
    expect(box().hasAttribute("data-active")).toBe(false);
    expect(pad().hasAttribute("data-quiet")).toBe(true);
    // Every key is still there: nothing moves.
    expect(pad().querySelectorAll("button")).toHaveLength(11);
    key("7");
    expect(box().textContent?.trim()).toBe("");
  });

  it("a pick closes the list, and the keypad types again", () => {
    play();
    fireEvent.click(menu(), { detail: 0 });
    fireEvent.click(screen.getByRole("option", { name: "8" }), { detail: 0 });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(pad().hasAttribute("data-quiet")).toBe(false);
    expect(must(menu().querySelector("[data-pick]")).textContent).toBe("8");
    fireEvent.click(box(), { detail: 0 });
    key("2");
    key("4");
    expect(box().textContent).toBe("24");
  });

  it("after a miss, the dropdown in use keeps its word in the miss mark under the focus border", () => {
    const p = play({ g1: "c2", g2: "24" });
    p.verdict({
      kind: "try_again",
      index: 0,
      parts: [
        { id: "g1", correct: false },
        { id: "g2", correct: true },
      ],
    } as unknown as Feedback);
    expect(menu().getAttribute("data-tone")).toBe("try_again");
    expect(menu().hasAttribute("data-menu-focused")).toBe(true);
    // Nothing in it is selected: a dropdown has nothing to type over.
    expect(menu().querySelector("[data-selection]")).toBeNull();
    // The keypad's gap lets go of its active look, so one gap has the focus border, and a key types nothing.
    expect(box().hasAttribute("data-active")).toBe(false);
    key("7");
    expect(box().textContent).toBe("24");
    // A tap on the keypad's gap moves the focus there, and the keypad types again.
    fireEvent.click(box(), { detail: 0 });
    expect(box().getAttribute("data-active")).toBe("true");
  });
});
