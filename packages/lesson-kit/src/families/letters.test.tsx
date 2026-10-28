/**
 * The Polish letter row in the views (dl-uukj.28): a typed text answer with `letters: 'pl'` shows
 * it under its field, a number never does, a tap is the attempt's onset and wakes Check, and the
 * answer is committed exactly as typed. In Gaps one row serves the Polish text gap that last had
 * the focus, and the gap's field grows with the word.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../parts/must.ts";
import type { Clock, Instant } from "../stage/clock.ts";
import { StepFrame } from "../stage/StepFrame.tsx";
import { EnterView } from "./enter/EnterView.tsx";
import type { EnterData } from "./enter/model.ts";
import { Family, QuestionType } from "./names.ts";
import type { SlotsData } from "./slots/model.ts";
import { SlotsView } from "./slots/SlotsView.tsx";
import { ViewMode } from "./view.ts";

afterEach(cleanup);

const AT: Instant = { perf: 3, wall: "2026-10-23T00:00:00.000Z" };
const clock: Clock = { now: () => AT };
const row = () => document.querySelector('[data-letters="pl"]');
const tap = (letter: string) =>
  fireEvent.pointerDown(must(document.querySelector(`[data-letter="${letter}"]`)), { button: 0 });
const check = () => fireEvent.click(screen.getByRole("button", { name: "Sprawdź" }), { detail: 0 });

function enter(data: EnterData) {
  const onCommit = vi.fn();
  render(
    <StepFrame stepId="s1">
      <EnterView
        mode={ViewMode.Play}
        spec={{
          id: "s1",
          say: "Napisz słowo.",
          question_type: QuestionType.ShortText,
          family: Family.Enter,
          data,
        }}
        language="pl"
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

function gaps(data: SlotsData) {
  const onCommit = vi.fn();
  render(
    <StepFrame stepId="s1">
      <SlotsView
        mode={ViewMode.Play}
        spec={{
          id: "s1",
          say: "Wpisz brakujące litery.",
          question_type: QuestionType.FillGaps,
          family: Family.Slots,
          data,
        }}
        language="pl"
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

describe("Enter: the letter row under a Polish text answer", () => {
  it("shows for letters: pl, and the tapped answer is committed as typed with the tap as its onset", () => {
    const onCommit = enter({ input: "text", entry: "keyboard", letters: "pl" });
    expect(row()).not.toBeNull();
    const field = screen.getByLabelText("Twoja odpowiedź") as HTMLInputElement;
    tap("ż");
    fireEvent.change(field, { target: { value: "żab" } });
    field.setSelectionRange(3, 3);
    tap("ą");
    expect(field.value).toBe("żabą");
    check();
    expect(must(onCommit.mock.calls[0])[0]).toMatchObject({
      value: { entered: "żabą" },
      t1: AT,
      modality: "click",
    });
  });

  it("starts lowercase for a word, and in capitals for an answer that starts a sentence (dl-w3.68.22)", () => {
    enter({ input: "text", entry: "keyboard", letters: "pl" });
    tap("ó");
    expect((screen.getByLabelText("Twoja odpowiedź") as HTMLInputElement).value).toBe("ó");
    cleanup();
    enter({ input: "text", entry: "keyboard", letters: "pl", capitals: true });
    tap("Ó");
    expect((screen.getByLabelText("Twoja odpowiedź") as HTMLInputElement).value).toBe("Ó");
  });

  it("wakes Check on the first letter", () => {
    enter({ input: "text", entry: "keyboard", letters: "pl" });
    expect(screen.getByRole("button", { name: "Sprawdź" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
    tap("ó");
    expect(screen.getByRole("button", { name: "Sprawdź" }).getAttribute("aria-disabled")).toBe(
      "false",
    );
  });

  it("never shows without letters: pl, nor for a number", () => {
    enter({ input: "text", entry: "keyboard" });
    expect(row()).toBeNull();
    cleanup();
    enter({ input: "text", entry: "keyboard", letters: "none" });
    expect(row()).toBeNull();
    cleanup();
    enter({ input: "number", entry: "keypad", letters: "pl" });
    expect(row()).toBeNull();
  });
});

describe("Gaps: one letter row for the Polish text gaps", () => {
  const text = (id: string, letters?: "pl" | "none") =>
    ({ id, kind: Family.Enter, input: "text", ...(letters ? { letters } : {}) }) as const;

  it("types into the Polish gap that last had the focus, at its caret", () => {
    const onCommit = gaps({
      template: "m{g1}z, bo m{g2}zy",
      gaps: [text("g1", "pl"), text("g2", "pl")],
    });
    expect(document.querySelectorAll('[data-letters="pl"]')).toHaveLength(1);
    const g1 = screen.getByLabelText("Luka 1") as HTMLInputElement;
    const g2 = screen.getByLabelText("Luka 2") as HTMLInputElement;
    tap("ó");
    expect(g1.value).toBe("ó");
    fireEvent.focus(g2);
    fireEvent.change(g2, { target: { value: "o" } });
    expect(g1.value).toBe("ó");
    fireEvent.focus(g1);
    fireEvent.change(g1, { target: { value: "r" } });
    g1.setSelectionRange(1, 1);
    tap("ó");
    expect(g1.value).toBe("ró");
    check();
    expect(must(onCommit.mock.calls[0])[0]).toMatchObject({
      value: { gaps: { g1: "ró", g2: "o" } },
      t1: AT,
      modality: "click",
    });
  });

  it("starts lowercase in a gap inside a word: mr_z takes ó (dl-w3.68.22)", () => {
    gaps({ template: "Na dworze jest mr{g1}z.", gaps: [text("g1", "pl")] });
    tap("ó");
    expect((screen.getByLabelText("Luka 1") as HTMLInputElement).value).toBe("ó");
  });

  it("starts in capitals in a gap that starts the template, and lowercase in a gap after a word", () => {
    gaps({
      template: "{g1} jest stolicą. Mieszkam w {g2}.",
      gaps: [text("g1", "pl"), text("g2", "pl")],
    });
    tap("Ł");
    expect((screen.getByLabelText("Luka 1") as HTMLInputElement).value).toBe("Ł");
    fireEvent.focus(screen.getByLabelText("Luka 2"));
    tap("ł");
    expect((screen.getByLabelText("Luka 2") as HTMLInputElement).value).toBe("ł");
  });

  it("keeps the gap’s width as the word arrives (Slots addendum 3.1)", () => {
    gaps({ template: "Ona {g1} wodę.", gaps: [text("g1", "pl")] });
    const g1 = screen.getByLabelText("Luka 1") as HTMLInputElement;
    const before = g1.style.width;
    fireEvent.change(g1, { target: { value: "przepijałaby" } });
    expect(g1.style.width).toBe(before);
  });

  it("shows no row when no text gap is Polish, nor for a number gap", () => {
    gaps({
      template: "{g1} i {g2}",
      gaps: [text("g1"), { id: "g2", kind: Family.Enter, input: "number", letters: "pl" } as never],
    });
    expect(row()).toBeNull();
  });
});
