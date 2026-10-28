/**
 * Letter marks (Enter addendum 3.6, decision dl-y3th 8b, dl-uukj.29.107, folding dl-uukj.29.50): an
 * accent or one-letter slip in a typed word marks only the slipped letters, the field stays paper.
 * The same in a Gaps text gap. Also the Gaps leftovers of the Enter wave: the ask to write a fraction
 * more simply (3.4), and the away look after a miss (2.3). The page marks are written out here, as
 * the judge (`packages/core`) would send them. Invented words and numbers only.
 */

import type { PartMark, SlotsValue } from "@jadwigo/contracts";
import type { CopyKey } from "@jadwigo/copy";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../parts/must.ts";
import type { Clock, Instant } from "../stage/clock.ts";
import { StepFrame } from "../stage/StepFrame.tsx";
import type { Feedback } from "../stage/types.ts";
import { missingGaps } from "./complete.ts";
import { EnterView } from "./enter/EnterView.tsx";
import type { EnterData } from "./enter/model.ts";
import { Family, QuestionType } from "./names.ts";
import type { SlotsData } from "./slots/model.ts";
import { SlotsView } from "./slots/SlotsView.tsx";
import type { SpecOf } from "./types.ts";
import { pageSpec } from "./types.ts";
import { ViewMode } from "./view.ts";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-26T00:00:00.000Z" }) };

const words: SpecOf<typeof Family.Enter> = {
  id: "w1",
  say: "Zapisz słowami liczbę 47.",
  question_type: QuestionType.ShortText,
  family: Family.Enter,
  data: { input: "text", entry: "keyboard", letters: "pl" },
  key: { accept: ["czterdzieści siedem"] },
};

/** A word's letters as page marks, `l0` to `ln` (or `g1.l0` in a gap), only the slipped ones missed. */
const letters = (n: number, slipped: number[], of?: string): PartMark[] =>
  Array.from({ length: n }, (_, i) => ({
    id: of === undefined ? `l${i}` : `${of}.l${i}`,
    correct: !slipped.includes(i),
  }));

function playEnter(data: EnterData) {
  const onCommit = vi.fn();
  const at = (feedback: Feedback | null, attemptNo: number) => (
    <StepFrame stepId="w1">
      <EnterView
        mode={ViewMode.Play}
        spec={{ ...pageSpec(words), data } as never}
        language="pl"
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
  const verdict = (parts: PartMark[] | null) =>
    rerender(at({ kind: "try_again", index: 0, ...(parts ? { parts } : {}) }, 2));
  return Object.assign(onCommit, { verdict });
}

const marked = () => [...document.querySelectorAll('[data-mark="miss"]')].map((m) => m.textContent);

describe("the Enter field after a slip", () => {
  it("draws only the s; the field stays paper with its ink edge, and the next key replaces the s", () => {
    const onCommit = playEnter(words.data);
    const field = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "czterdziesci siedem" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledOnce();
    onCommit.verdict(letters(19, [9]));
    expect(marked()).toEqual(["s"]);
    // Paper, not the miss's fill: no amber tone, never away-dashed, and the focus (the ink edge) on it.
    expect(field.getAttribute("data-tone")).toBe("idle");
    expect(document.activeElement).toBe(field);
    expect(field.hasAttribute("data-letter-marked")).toBe(true);
    expect([field.selectionStart, field.selectionEnd]).toEqual([9, 10]);
    expect(must(document.querySelector("[data-bar]")).getAttribute("data-band")).toBe("miss");
    // A click on the page: the marks stay and the field does not turn into the dashed miss.
    fireEvent.pointerDown(document.body);
    expect(marked()).toEqual(["s"]);
    expect(field.hasAttribute("data-away")).toBe(false);
    // Fixed in place: the marks go with the change.
    fireEvent.change(field, { target: { value: "czterdzieści siedem" } });
    expect(marked()).toEqual([]);
    expect(field.hasAttribute("data-letter-marked")).toBe(false);
  });

  it("a typo marks only the slipped letter; another miss marks the field whole", () => {
    const onCommit = playEnter(words.data);
    const field = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "kwadrst" } });
    onCommit.verdict(letters(7, [5]));
    expect(marked()).toEqual(["s"]);
    cleanup();
    const other = playEnter(words.data);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "koło" } });
    other.verdict(null);
    expect(marked()).toEqual([]);
    expect(screen.getByRole("textbox").getAttribute("data-tone")).toBe("amber");
  });
});

const gaps: SpecOf<typeof Family.Slots> = {
  id: "g",
  say: "Uzupełnij.",
  question_type: QuestionType.FillGaps,
  family: Family.Slots,
  data: {
    template: "Zimą jest {g1}, a {g2} to 7.",
    gaps: [
      { id: "g1", kind: Family.Enter, input: "text", letters: "pl" },
      { id: "g2", kind: Family.Enter, input: "number" },
    ],
  },
  key: {
    gaps: {
      g1: { kind: Family.Enter, accept: ["mróz"] },
      g2: { kind: Family.Enter, accept: ["7"] },
    },
  },
};

function playGaps(spec: SpecOf<typeof Family.Slots>, nudge?: (value: unknown) => CopyKey | null) {
  const onCommit = vi.fn();
  const at = (feedback: Feedback | null, attemptNo: number) => (
    <StepFrame stepId="g">
      <SlotsView
        mode={ViewMode.Play}
        spec={pageSpec(spec) as never}
        language="pl"
        category="child"
        clock={clock}
        live
        attemptNo={attemptNo}
        feedback={feedback}
        onCommit={onCommit}
        {...(nudge ? { around: { checking: false, moveOn: null, nudge } } : {})}
      />
    </StepFrame>
  );
  const { rerender } = render(at(null, 1));
  const verdict = (parts: PartMark[]) => rerender(at({ kind: "try_again", index: 0, parts }, 2));
  return Object.assign(onCommit, { verdict });
}

describe("a Gaps text gap after a slip", () => {
  it("marks only the slipped letter, the gap stays paper, and its run is selected", () => {
    const onCommit = playGaps(gaps);
    const field = screen.getByLabelText("Luka 1") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "mroz" } });
    onCommit.verdict([
      { id: "g1", correct: false },
      ...letters(4, [2], "g1"),
      { id: "g2", correct: true },
    ]);
    expect(marked()).toEqual(["o"]);
    expect(field.getAttribute("data-tone")).toBe("idle");
    expect(field.hasAttribute("data-letter-marked")).toBe(true);
    expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd]).toEqual([2, 3]);
    fireEvent.change(field, { target: { value: "mróz" } });
    expect(marked()).toEqual([]);
  });
});

const halves: SpecOf<typeof Family.Slots> = {
  id: "h",
  say: "Uzupełnij.",
  question_type: QuestionType.FillGaps,
  family: Family.Slots,
  data: {
    template: "Połowa to {f}, a {n} to 2.",
    gaps: [
      { id: "f", kind: Family.Enter, input: "fraction", simplify: "required" },
      { id: "n", kind: Family.Enter, input: "number" },
    ],
  },
  key: {
    gaps: { f: { kind: Family.Enter, accept: ["1/2"] }, n: { kind: Family.Enter, accept: ["2"] } },
  },
};

/** The server's ask on a right 2/4 (the judge goes first, then the nudge): `packages/core`'s. */
const simplify = (value: unknown): CopyKey | null =>
  (value as SlotsValue).gaps["f"] === "2/4" ? "fraction_simplify" : null;

describe("a Gaps fraction gap to write more simply (Enter addendum 3.4)", () => {
  it("is no gap in the answer: completeness says nothing about lowest terms", () => {
    expect(missingGaps(halves.data as SlotsData, { gaps: { f: "2/4", n: "2" } })).toBeNull();
  });

  it("shows the ask with the boxes unmarked and nothing committed", () => {
    const onCommit = playGaps(halves, simplify);
    const boxes = screen.getAllByRole("button").filter((b) => b.hasAttribute("data-box"));
    fireEvent.click(must(boxes[0]));
    fireEvent.keyDown(document.body, { key: "2" });
    fireEvent.keyDown(document.body, { key: "/" });
    fireEvent.keyDown(document.body, { key: "4" });
    fireEvent.click(screen.getByLabelText("Luka 2"));
    fireEvent.keyDown(document.body, { key: "2" });
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("prościej");
    expect(
      document.querySelectorAll(
        ':is([data-tone="amber"], [data-tone="missing"]):not([role="status"])',
      ),
    ).toHaveLength(0);
    expect(boxes.every((b) => b.getAttribute("data-tone") === "idle")).toBe(true);
  });
});

describe("a Gaps number box after a miss: away and back (Enter addendum 2.3)", () => {
  it("lets go of its active look and selection on a page click, and shows its mark", () => {
    const spec: SpecOf<typeof Family.Slots> = {
      ...gaps,
      data: { template: "{a} + 2 = 7", gaps: [{ id: "a", kind: Family.Enter, input: "number" }] },
      key: { gaps: { a: { kind: Family.Enter, accept: ["5"] } } },
    };
    const onCommit = playGaps(spec);
    const box = screen.getByLabelText("Luka 1");
    fireEvent.click(box);
    fireEvent.keyDown(document.body, { key: "4" });
    onCommit.verdict([{ id: "a", correct: false }]);
    expect(box.getAttribute("data-tone")).toBe("amber");
    expect(box.getAttribute("data-active")).toBe("true");
    expect(box.hasAttribute("data-selected")).toBe(true);
    fireEvent.pointerDown(document.body);
    expect(box.hasAttribute("data-away")).toBe(true);
    expect(box.getAttribute("data-active")).toBeNull();
    expect(box.hasAttribute("data-selected")).toBe(false);
    // Back: a tap on it, and the next digit replaces the answer.
    fireEvent.pointerDown(box);
    fireEvent.click(box);
    expect(box.hasAttribute("data-away")).toBe(false);
    fireEvent.keyDown(document.body, { key: "5" });
    expect(box.textContent).toBe("5");
  });
});
