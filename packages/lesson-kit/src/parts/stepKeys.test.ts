/**
 * The step keys' pure logic (paper-behaviour README §4): Enter before and after a miss, Sprawdź,
 * the jump of a filled slot, the arrows, Tab, Backspace and the phone's return key. The demos are
 * replayed through the shell in stepShell.test.tsx.
 */

import { describe, expect, it } from "vitest";
import { must } from "./must.ts";
import {
  afterInput,
  enterHint,
  type KeysState,
  nextEmpty,
  onArrow,
  onBackspace,
  onEnter,
  onKeyAway,
  onMiss,
  onPointer,
  onSprawdz,
  onTab,
  type StepField,
  selectRange,
} from "./stepKeys.ts";

const f = (value: string, more: Partial<StepField> = {}): StepField => ({
  id: value || "x",
  kind: "field",
  maxLength: 2,
  value,
  marked: false,
  ...more,
});
const s = (value: string, more: Partial<StepField> = {}): StepField =>
  f(value, { kind: "slot", maxLength: 1, ...more });
const rest: KeysState = { phase: "rest", review: false, complete: false };

describe("Enter", () => {
  it("before a miss: on to the next empty field, wrapping; stays in an empty one; checks once complete", () => {
    const fields = [f(""), f("2"), f("")];
    expect(nextEmpty(fields, 1)).toBe(2);
    expect(nextEmpty(fields, 2)).toBe(0);
    expect(onEnter(fields, 1, rest)).toEqual({ to: "field", at: 2, select: false });
    expect(onEnter(fields, 0, rest)).toEqual({ to: "stay" });
    expect(onEnter([f("1"), f("2")], 0, { ...rest, complete: true })).toEqual({ to: "check" });
  });

  it("after a miss: the review walk to the next field, selecting a marked one; from the last, a check only once a marked part changed", () => {
    const fields = [f("2", { marked: true }), f("28"), f("33", { marked: true })];
    const miss: KeysState = { phase: "miss", review: true, complete: true };
    expect(onEnter(fields, 0, miss)).toEqual({ to: "field", at: 1, select: false });
    expect(onEnter(fields, 1, miss)).toEqual({ to: "field", at: 2, select: true });
    expect(onEnter(fields, 2, miss)).toEqual({ to: "field", at: 0, select: true });
    expect(onEnter(fields, 2, { ...miss, phase: "rest" })).toEqual({ to: "check" });
    expect(onEnter(fields, 2, { ...miss, phase: "ended" })).toEqual({ to: "stay" });
  });
});

describe("Sprawdź and the miss", () => {
  it("quiet before a miss goes to the first empty field; after one to the first marked, selected", () => {
    expect(onSprawdz([f("1"), f("")], rest)).toEqual({ to: "field", at: 1, select: false });
    expect(
      onSprawdz([f("1"), f("3", { marked: true })], {
        phase: "miss",
        review: true,
        complete: true,
      }),
    ).toEqual({ to: "field", at: 1, select: true });
    expect(onSprawdz([f("1")], { ...rest, complete: true })).toEqual({ to: "check" });
    expect(onMiss([f("1"), f("3", { marked: true }), f("4", { marked: true })])).toEqual({
      to: "field",
      at: 1,
      select: true,
    });
  });

  it("selects a number whole, and a word whole until letter marks give its first missed run", () => {
    expect(selectRange(f("33"))).toEqual([0, 2]);
    expect(selectRange(f("rzeka", { word: true }))).toEqual([0, 5]);
    expect(selectRange(f("żeka", { word: true, missedRun: [0, 1] }))).toEqual([0, 1]);
  });
});

// Enter addendum 2.3 (decision dl-y3th 4b), fixing dl-uukj.29.100: after a miss a click on the page
// sends the child away and the field shows its mark; a tap back, or on a laptop any key, brings back
// the look just after the miss with the answer selected, so 24, away, back, 0 gives 0, not 240.
describe("away and back after a miss", () => {
  const marked = [f("24", { marked: true })];

  it("a click on the page after a miss is away; before a miss, after an edit or once the step ended, nothing", () => {
    expect(onPointer(marked, { on: "page" }, "miss")).toEqual({ away: true });
    expect(onPointer(marked, { on: "page" }, "rest")).toBeNull();
    expect(onPointer(marked, { on: "page" }, "ended")).toBeNull();
    expect(onPointer([], { on: "page" }, "miss")).toBeNull();
  });

  it("a control (Sprawdź, help, a key) is never away: it moves the focus its own way", () => {
    expect(onPointer(marked, { on: "control" }, "miss")).toBeNull();
  });

  it("a tap back into the marked field selects its answer again; an unmarked field gets the caret at the end", () => {
    expect(onPointer(marked, { on: "field", at: 0 }, "miss")).toEqual({
      away: false,
      at: 0,
      select: true,
    });
    expect(onPointer([f("24", { marked: true }), f("3")], { on: "field", at: 1 }, "miss")).toEqual({
      away: false,
      at: 1,
      select: false,
    });
    // Once the child edited the marked field the miss is over (rest): a tap selects nothing.
    expect(onPointer(marked, { on: "field", at: 0 }, "rest")).toEqual({
      away: false,
      at: 0,
      select: false,
    });
  });

  it("on a laptop any key while away brings back the first marked field, selected", () => {
    expect(onKeyAway([f("1"), f("24", { marked: true })], true, "miss")).toEqual({
      to: "field",
      at: 1,
      select: true,
    });
    expect(onKeyAway(marked, false, "miss")).toEqual({ to: "stay" });
    expect(onKeyAway(marked, true, "rest")).toEqual({ to: "stay" });
  });

  it("back selects the whole number, so the next key replaces it", () => {
    const back = onPointer(marked, { on: "field", at: 0 }, "miss");
    expect(back !== null && !back.away && back.select).toBe(true);
    expect(selectRange(must(marked[0]))).toEqual([0, 2]);
  });
});

describe("slots, arrows, Tab and Backspace", () => {
  it("a filled slot jumps to the next empty slot, but not while the miss stands; a field never jumps", () => {
    expect(afterInput([s("8"), s(""), s("")], 0, "rest")).toEqual({
      to: "field",
      at: 1,
      select: false,
    });
    expect(afterInput([s(""), s("3"), s("2")], 2, "rest")).toEqual({
      to: "field",
      at: 0,
      select: false,
    });
    expect(afterInput([s("8"), s("")], 0, "miss")).toEqual({ to: "stay" });
    expect(afterInput([f("1"), f("")], 0, "rest")).toEqual({ to: "stay" });
  });

  it("a column: units, the optional carry, tens; Enter goes past an empty carry, and the tens never wrap back to it (dl-uukj.29.133)", () => {
    const units = (v: string) => s(v, { id: "r0" });
    const carry = (v: string) => s(v, { id: "c1", optional: true });
    const tens = (v: string) => s(v, { id: "r1" });
    expect(afterInput([units("5"), carry(""), tens("")], 0, "rest")).toEqual({
      to: "field",
      at: 1,
      select: false,
    });
    expect(onEnter([units("5"), carry(""), tens("")], 1, rest)).toEqual({
      to: "field",
      at: 2,
      select: false,
    });
    expect(afterInput([units("5"), carry(""), tens("8")], 2, "rest")).toEqual({ to: "stay" });
    expect(afterInput([units(""), carry(""), tens("8")], 2, "rest")).toEqual({
      to: "field",
      at: 0,
      select: false,
    });
  });

  it("a field whose type fixes its length moves on once no longer answer is possible (Slots addendum 2.4)", () => {
    const hour = (v: string) => f(v, { id: "h", range: [0, 23] });
    const minute = (v: string) => f(v, { id: "m", range: [0, 59] });
    const grosze = (v: string) => f(v, { id: "gr", range: [0, 99] });
    // "7": no hour 70 to 79, so on to the minutes. "2" and "0" may still become 23 and 07.
    expect(afterInput([hour("7"), minute("")], 0, "rest")).toEqual({
      to: "field",
      at: 1,
      select: false,
    });
    expect(afterInput([hour("2"), minute("")], 0, "rest")).toEqual({ to: "stay" });
    expect(afterInput([hour("0"), minute("")], 0, "rest")).toEqual({ to: "stay" });
    expect(afterInput([hour("19"), minute("")], 0, "rest")).toEqual({
      to: "field",
      at: 1,
      select: false,
    });
    // Minutes and grosze after two digits; the last field has nowhere to go.
    expect(afterInput([f("3", { id: "zl" }), grosze("5")], 1, "rest")).toEqual({ to: "stay" });
    expect(afterInput([f("", { id: "zl" }), grosze("50")], 1, "rest")).toEqual({
      to: "field",
      at: 0,
      select: false,
    });
    expect(afterInput([hour("7"), minute("30")], 1, "rest")).toEqual({ to: "stay" });
    // Not while the miss stands.
    expect(afterInput([hour("7"), minute("")], 0, "miss")).toEqual({ to: "stay" });
  });

  it("↑ ↓ always move, ← → at the text edges or always in a slot, and they stop at the ends", () => {
    const fields = [f("12"), f("3"), s("4")];
    const mid = { atStart: false, atEnd: false };
    expect(onArrow(fields, 0, "ArrowDown", mid)).toBe(1);
    expect(onArrow(fields, 0, "ArrowUp", mid)).toBe(-1);
    expect(onArrow(fields, 0, "ArrowRight", mid)).toBe(-1);
    expect(onArrow(fields, 0, "ArrowRight", { atStart: false, atEnd: true })).toBe(1);
    expect(onArrow(fields, 2, "ArrowLeft", mid)).toBe(1);
    expect(onArrow(fields, 2, "ArrowRight", mid)).toBe(-1);
  });

  it("Tab follows fill order and leaves the ends to the browser; Backspace in an empty slot goes back", () => {
    const fields = [s("1"), s(""), f("")];
    expect(onTab(fields, 0, false)).toBe(1);
    expect(onTab(fields, 0, true)).toBe(-1);
    expect(onTab(fields, 2, false)).toBe(-1);
    expect(onBackspace(fields, 1)).toBe(0);
    expect(onBackspace(fields, 0)).toBe(-1);
    expect(onBackspace(fields, 2)).toBe(-1);
  });

  it("the phone keyboard says next until the last empty field, then go", () => {
    expect(enterHint([f(""), f("")], 0)).toBe("next");
    expect(enterHint([f("1"), f("")], 1)).toBe("go");
    expect(enterHint([f("1"), f("2")], 0)).toBe("go");
    expect(enterHint([f(""), f("", { optional: true })], 0)).toBe("go");
  });
});
