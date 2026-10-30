/**
 * The step keys in the Gaps view (paper-behaviour README §3.4, §3.5; stepKeys.ts): a column sum
 * fills units first and its one-digit cells jump on, Backspace in an empty cell goes back and
 * clears, the keypad has no → key (Enter addendum 4.1) and Enter checks, and after a miss the first marked cell in fill
 * order is selected so the next digit replaces it. The clock's two fields never jump, and the
 * review walk goes through both. A typed word is selected whole, or only its slipped letters after
 * an accent or one-letter slip (families/letterMarks.test.tsx).
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { Feedback } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { ViewMode } from "../view.ts";
import { type ColumnSum, columnFillOrder, columnKey } from "./column.ts";
import { fillOrder, type SlotsData } from "./model.ts";
import { SlotsView } from "./SlotsView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-25T00:00:00.000Z" }) };

function play(data: SlotsData) {
  const onCommit = vi.fn();
  const at = (feedback: Feedback | null, attemptNo: number) => (
    <StepFrame stepId="s1">
      <SlotsView
        mode={ViewMode.Play}
        spec={{
          id: "s1",
          say: "Fill in.",
          question_type: QuestionType.FillGaps,
          family: Family.Slots,
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
  // The runner's verdict: a new attempt, with each gap marked right or missed.
  const verdict = (marks: Record<string, boolean>) =>
    rerender(
      at(
        {
          kind: "try_again",
          index: 0,
          parts: Object.entries(marks).map(([id, correct]) => ({ id, correct })),
        },
        2,
      ),
    );
  return Object.assign(onCommit, { verdict });
}

const column = (s: ColumnSum): SlotsData => ({ template: "", column: s, gaps: columnKey(s).gaps });
const cell = (name: string) => screen.getByLabelText(name);
const ONES = "the answer’s ones";
const CARRY = "the small box in the tens column";
const TENS = "the answer’s tens";
/** A hardware key on whatever has the focus. */
const key = (k: string, more: object = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key: k, ...more });
const focused = () => document.activeElement?.getAttribute("aria-label");
/** The child moves to a field (a click or a tap focuses it). */
const moveTo = (name: string) => act(() => cell(name).focus());
const band = () => must(document.querySelector("[data-bar]")).getAttribute("data-band");

describe("the fill order", () => {
  it("is the reading order, a column units first, or the step’s own", () => {
    const sum: ColumnSum = { op: "add", operands: [47, 38], given_steps: 0, carry_row: true };
    expect(columnFillOrder(sum)).toEqual(["r0", "c1", "r1"]);
    expect(fillOrder(column(sum))).toEqual(["r0", "c1", "r1"]);
    const gaps = [
      { id: "a", kind: Family.Enter, input: "number" },
      { id: "b", kind: Family.Enter, input: "number" },
    ] as const;
    expect(fillOrder({ template: "{a} + {b}", gaps: [...gaps] })).toEqual(["a", "b"]);
    expect(fillOrder({ template: "{a} + {b}", gaps: [...gaps], fill_order: ["b", "a"] })).toEqual([
      "b",
      "a",
    ]);
  });

  it("Tab and Enter follow a fill order the step sets", () => {
    play({
      template: "{a} + {b} = 9",
      gaps: [
        { id: "a", kind: Family.Enter, input: "number" },
        { id: "b", kind: Family.Enter, input: "number" },
      ],
      fill_order: ["b", "a"],
    });
    expect(focused()).toBe("Gap 2");
    key("Tab");
    expect(focused()).toBe("Gap 1");
    key("Tab", { shiftKey: true });
    expect(focused()).toBe("Gap 2");
  });
});

describe("a pyramid on the keys (Slots addendum 4.5, dl-uukj.29.132)", () => {
  // The top brick and the left brick of the middle row are gaps: Gap 1 is the top in reading
  // order, Gap 2 the middle one, and the child fills the middle one first.
  const pyramid = (): SlotsData => ({
    template: "",
    pyramid: [["{g1}"], ["{g2}", 9], [6, 5, 4]],
    gaps: [
      { id: "g1", kind: Family.Enter, input: "number", max_length: 3 },
      { id: "g2", kind: Family.Enter, input: "number", max_length: 3 },
    ],
  });
  const TOP = "Gap 1";
  const MIDDLE = "Gap 2";

  it("opens on the lowest gap, and Enter goes up to the next empty brick, then checks", () => {
    const onCommit = play(pyramid());
    expect(focused()).toBe(MIDDLE);
    // An empty brick: Enter stays.
    key("Enter");
    expect(focused()).toBe(MIDDLE);
    key("1");
    key("1");
    key("Enter");
    expect(focused()).toBe(TOP);
    key("2");
    key("0");
    key("Enter");
    expect(onCommit).toHaveBeenCalledOnce();
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { g1: "20", g2: "11" } });
  });

  it("Enter from the top brick filled first goes down to the empty one", () => {
    play(pyramid());
    moveTo(TOP);
    key("2");
    key("0");
    key("Enter");
    expect(focused()).toBe(MIDDLE);
  });

  it("Tab walks the bricks bottom up, then leaves them", () => {
    play(pyramid());
    key("Tab");
    expect(focused()).toBe(TOP);
    // Past the last brick in fill order the focus goes on to the buttons, never back to the
    // brick under it, which comes later on the page.
    const top = cell(TOP);
    key("Tab");
    expect(document.activeElement).not.toBe(top);
    expect(document.activeElement?.closest("[data-field]")).toBeNull();
  });

  it("a tapped brick is the one in use even when the tap gives it no focus (Safari)", () => {
    play(pyramid());
    key("1");
    key("1");
    // A pointer on the top brick, and no focus: the page holds it.
    fireEvent.pointerDown(cell(TOP));
    act(() => (document.activeElement as HTMLElement | null)?.blur());
    expect(document.activeElement).toBe(document.body);
    key("Tab", { shiftKey: true });
    expect(focused()).toBe(MIDDLE);
  });
});

describe("a column sum on the keys", () => {
  it("opens on the units, and each cell filled jumps to the next empty one, right to left", () => {
    play(column({ op: "add", operands: [47, 38], given_steps: 0, carry_row: true }));
    expect(focused()).toBe(ONES);
    key("5");
    expect(focused()).toBe(CARRY);
    key("1");
    expect(focused()).toBe(TENS);
    key("8");
    expect(cell(ONES).textContent).toBe("5");
    expect(cell(CARRY).textContent).toBe("1");
    expect(cell(TENS).textContent).toBe("8");
    // Every cell filled: the focus stays, and nothing is checked by itself.
    expect(focused()).toBe(TENS);
  });

  it("Backspace in an empty cell goes back to the cell before and clears it; ← → move between cells", () => {
    play(column({ op: "add", operands: [47, 38], given_steps: 0, carry_row: true }));
    key("5");
    key("1");
    expect(focused()).toBe(TENS);
    key("Backspace");
    expect(focused()).toBe(CARRY);
    expect(cell(CARRY).textContent?.trim()).toBe("");
    expect(cell(ONES).textContent).toBe("5");
    key("ArrowLeft");
    expect(focused()).toBe(ONES);
    key("ArrowLeft");
    expect(focused()).toBe(ONES);
    key("ArrowRight");
    key("ArrowRight");
    expect(focused()).toBe(TENS);
  });

  it("the keypad has no → key (Enter addendum 4.1): Enter checks once the cells are filled", () => {
    const onCommit = play(
      column({ op: "add", operands: [41, 38], given_steps: 0, carry_row: true }),
    );
    key("9");
    // The small cell may stay empty; the tens is the one still needed.
    moveTo(TENS);
    key("7");
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Next field" })).toBeNull();
    key("Enter");
    expect(onCommit).toHaveBeenCalledOnce();
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { r0: "9", r1: "7" } });
  });

  it("after a miss selects the first marked cell in fill order; the next digit replaces it and the band folds", () => {
    const onCommit = play(
      column({ op: "add", operands: [47, 38], given_steps: 0, carry_row: true }),
    );
    key("5");
    key("0");
    key("7");
    key("Enter");
    expect(onCommit).toHaveBeenCalledOnce();
    onCommit.verdict({ r0: true, c1: false, r1: false });
    expect(band()).toBe("miss");
    expect(focused()).toBe(CARRY);
    expect(cell(CARRY).hasAttribute("data-selected")).toBe(true);
    // The review walk: Enter goes on to the tens, selected because it is marked.
    key("Enter");
    expect(focused()).toBe(TENS);
    expect(cell(TENS).hasAttribute("data-selected")).toBe(true);
    expect(cell(CARRY).hasAttribute("data-selected")).toBe(false);
    // Enter in the last cell before any change: back to the first marked cell, no second check.
    key("Enter");
    expect(onCommit).toHaveBeenCalledOnce();
    expect(focused()).toBe(CARRY);
    key("1");
    expect(cell(CARRY).textContent).toBe("1");
    expect(band()).toBe("none");
    expect(cell(TENS).getAttribute("data-tone")).toBe("try_again");
    moveTo(TENS);
    key("8");
    expect(cell(TENS).textContent).toBe("8");
    key("Enter");
    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(must(onCommit.mock.calls[1])[0].value).toEqual({ gaps: { r0: "5", c1: "1", r1: "8" } });
  });
});

describe("a column sum by hardware keys, the focus held outside the step (dl-uukj.29.133)", () => {
  /** A key the way the browser sends it: keydown on the element with the focus, bubbling up to the
   * window, then keyup. A button's own Enter clicks it unless a listener took the key. */
  const hw = (k: string) => {
    const el = (document.activeElement ?? document.body) as HTMLElement;
    const down = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true });
    act(() => {
      el.dispatchEvent(down);
    });
    if (k === "Enter" && !down.defaultPrevented && el instanceof HTMLButtonElement)
      act(() => el.click());
    act(() => {
      el.dispatchEvent(new KeyboardEvent("keyup", { key: k, bubbles: true }));
    });
  };
  /** The step opens while a control outside it keeps the focus: the playground's example menu,
   * pressed to pick 47 + 38. */
  const openHeld = (s: ColumnSum) => {
    const picker = document.createElement("button");
    picker.textContent = "Example";
    const opened = vi.fn();
    picker.addEventListener("click", opened);
    document.body.append(picker);
    picker.focus();
    const onCommit = play(column(s));
    return { onCommit, picker, opened };
  };
  afterEach(() =>
    document.body.querySelectorAll(":scope > button").forEach((b) => {
      b.remove();
    }),
  );

  it("47 + 38: the units digit moves on to the carry, then the tens, and Enter checks", () => {
    const { onCommit, picker } = openHeld({
      op: "add",
      operands: [47, 38],
      given_steps: 0,
      carry_row: true,
    });
    expect(document.activeElement).toBe(picker);
    const order: (string | null | undefined)[] = [];
    for (const k of ["5", "1", "8"]) {
      hw(k);
      order.push(focused());
    }
    expect(order).toEqual([CARRY, TENS, TENS]);
    expect([cell(ONES), cell(CARRY), cell(TENS)].map((c) => c.textContent)).toEqual([
      "5",
      "1",
      "8",
    ]);
    hw("Enter");
    expect(onCommit).toHaveBeenCalledOnce();
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { r0: "5", c1: "1", r1: "8" } });
  });

  it("47 + 38 by Enter: the carry is optional, so Enter past it empty lands on the tens", () => {
    const { onCommit, opened } = openHeld({
      op: "add",
      operands: [47, 38],
      given_steps: 0,
      carry_row: true,
    });
    hw("5");
    expect(focused()).toBe(CARRY);
    hw("Enter");
    expect(focused()).toBe(TENS);
    hw("8");
    // The sum is whole: the focus stays on the tens, never back to the empty carry.
    expect(focused()).toBe(TENS);
    expect(cell(CARRY).textContent?.trim()).toBe("");
    hw("Enter");
    expect(onCommit).toHaveBeenCalledOnce();
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { r0: "5", r1: "8" } });
    expect(opened).not.toHaveBeenCalled();
  });

  it("Tab walks the same order: units, carry, tens", () => {
    play(column({ op: "add", operands: [47, 38], given_steps: 0, carry_row: true }));
    expect(focused()).toBe(ONES);
    hw("Tab");
    expect(focused()).toBe(CARRY);
    hw("Tab");
    expect(focused()).toBe(TENS);
  });

  it("52 − 27 and 23 × 4 move on the same way", () => {
    openHeld({ op: "sub", operands: [52, 27], given_steps: 0, carry_row: true });
    hw("5");
    expect(focused()).toBe(CARRY);
    hw("4");
    expect(focused()).toBe(TENS);
    cleanup();
    openHeld({ op: "mul", operands: [23, 4], given_steps: 0, carry_row: true });
    hw("2");
    expect(focused()).toBe(CARRY);
    hw("Enter");
    expect(focused()).toBe(TENS);
  });
});

describe("the clock: two fields", () => {
  const clockData: SlotsData = {
    template: "{h} : {m}",
    gaps: [
      { id: "h", kind: Family.Enter, input: "number", max_length: 2 },
      { id: "m", kind: Family.Enter, input: "number", max_length: 2 },
    ],
  };

  it("a field never jumps; Enter goes on to the minutes, then checks", () => {
    const onCommit = play(clockData);
    expect(focused()).toBe("Gap 1");
    key("1");
    key("2");
    expect(focused()).toBe("Gap 1");
    key("Enter");
    expect(focused()).toBe("Gap 2");
    key("Enter");
    expect(focused()).toBe("Gap 2");
    key("3");
    key("0");
    key("Enter");
    expect(onCommit).toHaveBeenCalledOnce();
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { h: "12", m: "30" } });
  });

  it("after a miss the marked minutes are selected and replaced whole; editing the hour does not make Sprawdź ready", () => {
    const onCommit = play(clockData);
    key("7");
    key("Enter");
    key("6");
    key("Enter");
    onCommit.verdict({ h: true, m: false });
    expect(focused()).toBe("Gap 2");
    expect(cell("Gap 2").hasAttribute("data-selected")).toBe(true);
    // Enter in the last field before a change: back to the first marked one.
    key("Enter");
    expect(focused()).toBe("Gap 2");
    expect(onCommit).toHaveBeenCalledOnce();
    moveTo("Gap 1");
    key("Backspace");
    key("7");
    expect(band()).toBe("miss");
    // The review walk: Enter goes on to the minutes, still marked, so selected again.
    key("Enter");
    expect(focused()).toBe("Gap 2");
    key("3");
    key("0");
    expect(cell("Gap 2").textContent).toBe("30");
    expect(band()).toBe("none");
    key("Enter");
    expect(onCommit).toHaveBeenCalledTimes(2);
    expect(must(onCommit.mock.calls[1])[0].value).toEqual({ gaps: { h: "7", m: "30" } });
  });
});

describe("a word in a gap", () => {
  it("after a miss the word is selected whole, and the phone keyboard says go on the last empty field", () => {
    const onCommit = play({
      template: "Ala ma {g1} i {g2}.",
      gaps: [
        { id: "g1", kind: Family.Enter, input: "text" },
        { id: "g2", kind: Family.Enter, input: "text" },
      ],
    });
    const g1 = cell("Gap 1") as HTMLInputElement;
    const g2 = cell("Gap 2") as HTMLInputElement;
    expect(document.activeElement).toBe(g1);
    expect(g1.getAttribute("enterkeyhint")).toBe("next");
    fireEvent.change(g1, { target: { value: "kota" } });
    expect(document.activeElement).toBe(g1);
    expect(g2.getAttribute("enterkeyhint")).toBe("go");
    key("Enter");
    expect(document.activeElement).toBe(g2);
    fireEvent.change(g2, { target: { value: "psa" } });
    key("Enter");
    expect(onCommit).toHaveBeenCalledOnce();
    onCommit.verdict({ g1: false, g2: true });
    expect(document.activeElement).toBe(g1);
    expect([g1.selectionStart, g1.selectionEnd]).toEqual([0, 4]);
  });
});

describe("a chosen gap on the keys", () => {
  it("opens its menu on Enter while empty, and once picked Enter checks like a filled field (§3.4)", () => {
    const onCommit = play({
      template: "Six is {g1}.",
      gaps: [
        {
          id: "g1",
          kind: Family.Choose,
          options: [
            { id: "c1", label: "even" },
            { id: "c2", label: "odd" },
          ],
        },
      ],
    });
    const gap = cell("Gap 1");
    act(() => gap.focus());
    key("Enter");
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.click(gap, { detail: 0 });
    fireEvent.click(screen.getByRole("option", { name: "even" }), { detail: 0 });
    act(() => gap.focus());
    key("Enter");
    expect(onCommit).toHaveBeenCalledOnce();
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { g1: "c1" } });
  });
});
