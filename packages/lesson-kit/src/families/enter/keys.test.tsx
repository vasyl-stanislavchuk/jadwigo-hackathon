/**
 * The step keys in the Enter view (paper-behaviour README §3.5; stepKeys.ts): after a miss the one
 * field is focused and its answer selected, a number on the keypad wears the selection fill and the
 * next key replaces it, a word typed on a keyboard is selected whole (only its slipped letters after
 * an accent or one-letter slip: families/letterMarks.test.tsx), and only an edit makes Sprawdź ready
 * again.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { Feedback } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { ViewMode } from "../view.ts";
import { EnterView } from "./EnterView.tsx";
import type { EnterData } from "./model.ts";

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

function play(data: EnterData) {
  const onCommit = vi.fn();
  const at = (feedback: Feedback | null, attemptNo: number) => (
    <StepFrame stepId="e1">
      <EnterView
        mode={ViewMode.Play}
        spec={{
          id: "e1",
          say: "Write it.",
          question_type: QuestionType.Production,
          family: Family.Enter,
          data,
        }}
        language="en"
        category="child"
        clock={clock}
        live
        attemptNo={attemptNo}
        feedback={feedback}
        onCommit={onCommit}
      />
    </StepFrame>
  );
  const { rerender } = render(at(null, 1));
  return Object.assign(onCommit, { miss: () => rerender(at({ kind: "try_again", index: 0 }, 2)) });
}

const key = (k: string) => fireEvent.keyDown(document.activeElement ?? document.body, { key: k });
const band = () => must(document.querySelector("[data-bar]")).getAttribute("data-band");
const box = () => screen.getByRole("textbox", { name: "Your answer" });

describe("a number on the keypad", () => {
  it("opens with its box focused; after a miss the box is selected, the next key replaces it and Sprawdź is ready", () => {
    const onCommit = play({ input: "number", entry: "keypad" });
    expect(document.activeElement).toBe(box());
    key("2");
    key("3");
    key("Enter");
    expect(onCommit).toHaveBeenCalledOnce();
    onCommit.miss();
    expect(document.activeElement).toBe(box());
    expect(box().hasAttribute("data-selected")).toBe(true);
    // Enter before a change: no second check, the box stays selected.
    key("Enter");
    expect(onCommit).toHaveBeenCalledOnce();
    key("2");
    expect(box().textContent).toBe("2");
    expect(box().hasAttribute("data-selected")).toBe(false);
    expect(band()).toBe("none");
    key("4");
    key("Enter");
    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(must(onCommit.mock.calls[1])[0].value).toEqual({ entered: "24" });
  });

  it("Backspace on a selected box clears it", () => {
    const onCommit = play({ input: "number", entry: "keypad" });
    key("1");
    key("7");
    key("Enter");
    onCommit.miss();
    key("Backspace");
    expect(box().textContent?.trim()).toBe("");
  });
});

// Enter addendum 2.3 (decision dl-y3th 4b), the done-when of dl-uukj.29.100 on Khan's
// x12adc4d3b8823e6b (12 + 8 = ?, a number on the keypad): 24, Sprawdź, click away, click back,
// type 0 gives 0.
describe("away and back after a miss", () => {
  const page = () => fireEvent.pointerDown(document.body);
  const look = () => ({
    active: box().getAttribute("data-active"),
    selected: box().hasAttribute("data-selected"),
    away: box().hasAttribute("data-away"),
    tone: box().getAttribute("data-tone"),
  });

  it("24, Sprawdź, click away, click back, 0 gives 0", () => {
    const onCommit = play({ input: "number", entry: "keypad" });
    key("2");
    key("4");
    key("Enter");
    onCommit.miss();
    // Just after the miss: the ink edge and caret (active), the answer selected.
    expect(look()).toEqual({ active: "true", selected: true, away: false, tone: "amber" });
    page();
    // Away: no active look, no selection drawn, the dashed miss mark (tone amber).
    expect(look()).toEqual({ active: null, selected: false, away: true, tone: "amber" });
    expect(document.activeElement).not.toBe(box());
    fireEvent.pointerDown(box());
    fireEvent.click(box());
    // Back: exactly as just after the miss.
    expect(look()).toEqual({ active: "true", selected: true, away: false, tone: "amber" });
    key("0");
    expect(box().textContent).toBe("0");
    expect(look().tone).toBe("idle");
  });

  it("on a laptop any key while away brings the child back, and the key replaces the answer", () => {
    const onCommit = play({ input: "number", entry: "keypad" });
    key("6");
    key("3");
    key("Enter");
    onCommit.miss();
    page();
    expect(look().away).toBe(true);
    key("2");
    expect(box().textContent).toBe("2");
    expect(look().away).toBe(false);
  });

  it("a tap on the keypad after a miss is not away: its key replaces the answer", () => {
    const onCommit = play({ input: "number", entry: "keypad" });
    key("1");
    key("Enter");
    onCommit.miss();
    fireEvent.pointerDown(screen.getByRole("button", { name: "7" }));
    expect(look().away).toBe(false);
    expect(box().textContent).toBe("7");
  });

  it("a word: away drops the focus, and a click back selects the whole word again", () => {
    const onCommit = play({ input: "text", entry: "keyboard" });
    const field = box() as HTMLInputElement;
    fireEvent.change(field, { target: { value: "kot" } });
    key("Enter");
    onCommit.miss();
    page();
    expect(field.hasAttribute("data-away")).toBe(true);
    expect(document.activeElement).not.toBe(field);
    field.setSelectionRange(1, 1);
    fireEvent.pointerDown(field);
    field.focus();
    fireEvent.click(field);
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 3]);
    expect(field.hasAttribute("data-away")).toBe(false);
  });
});

describe("a word on a keyboard", () => {
  it("after a miss the word is selected whole, and an edit folds the band", () => {
    const onCommit = play({ input: "text", entry: "keyboard" });
    const field = box() as HTMLInputElement;
    expect(document.activeElement).toBe(field);
    expect(field.getAttribute("enterkeyhint")).toBe("go");
    fireEvent.change(field, { target: { value: "kot" } });
    key("Enter");
    expect(onCommit).toHaveBeenCalledOnce();
    onCommit.miss();
    expect(band()).toBe("miss");
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 3]);
    fireEvent.change(field, { target: { value: "kota" } });
    expect(band()).toBe("none");
    key("Enter");
    expect(onCommit).toHaveBeenCalledTimes(2);
  });
});
