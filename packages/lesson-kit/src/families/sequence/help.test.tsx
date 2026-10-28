/**
 * Help on a Sequence step (families/help.ts): rung 1 outlines the cards it names, rung 2 fixes the
 * cards it gives at their right place, the others flow around them, and Check commits the whole
 * order with the fixed cards in it.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import { moveAround } from "../../parts/SortableList.tsx";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { PageHelp } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { ViewMode } from "../view.ts";
import { SequenceView, withPlaced } from "./SequenceView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-13T00:00:00.000Z" }) };
const spec: SpecOf<typeof Family.Sequence> = {
  id: "s1",
  say: "Smallest first",
  question_type: QuestionType.Order,
  family: Family.Sequence,
  data: {
    items: [
      { id: "i1", text: "6 × 7" },
      { id: "i2", text: "3 × 4" },
      { id: "i3", text: "5 × 5" },
      { id: "i4", text: "2 × 9" },
    ],
    first_label: "smallest",
    last_label: "largest",
  },
  key: { orders: [["i2", "i4", "i3", "i1"]] },
};
const help = (over: Partial<PageHelp>): PageHelp => ({
  rung: 1,
  card: { text: "Look." },
  focus: null,
  given: null,
  worked: null,
  twin: null,
  more: true,
  ...over,
});

function draw(ladder: PageHelp, onCommit = vi.fn()) {
  const props = {
    language: "en" as const,
    category: "child" as const,
    clock,
    mode: ViewMode.Play,
    spec: pageSpec(spec),
    live: true,
    attemptNo: 1,
    feedback: null,
    onCommit,
    around: { checking: false, moveOn: null, ladder: { help: ladder, ask: null, refused: false } },
  };
  render(
    <StepFrame stepId="s1">
      <SequenceView {...(props as unknown as Parameters<typeof SequenceView>[0])} />
    </StepFrame>,
  );
  return onCommit;
}

const cardOf = (text: string) => screen.getByText(text).closest("button") as HTMLElement;
// The card's words: the place number sits outside the card, and the grip has none (dl-w3.46.28).
const cards = () =>
  [...document.querySelectorAll("ol > li button[aria-pressed]")].map((b) => b.textContent ?? "");

describe("Sequence: help", () => {
  it("outlines the cards rung 1 names, and no others", () => {
    draw(help({ focus: ["i2"] }));
    expect(cardOf("3 × 4").dataset["helpFocus"]).toBe("true");
    expect(cardOf("6 × 7").dataset["helpFocus"]).toBeUndefined();
  });

  it("fixes a given card at its place, the others keeping their order around it", () => {
    draw(help({ rung: 2, card: { text: "Smaller." }, given: { placed: { i2: 0 } } }));
    expect(cards()).toEqual(["3 × 4", "6 × 7", "5 × 5", "2 × 9"]);
    const fixed = cardOf("3 × 4");
    expect(fixed.dataset["helpGiven"]).toBe("true");
    expect(fixed.getAttribute("aria-disabled")).toBe("true");
    // Its own arrows are off, and the card below it cannot move up past it.
    expect(
      screen.getByRole("button", { name: "Move up: 3 × 4" }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Move up: 6 × 7" }).getAttribute("aria-disabled"),
    ).toBe("true");
  });

  it("moves the other cards around a fixed one, and commits the whole order", () => {
    const onCommit = draw(
      help({ rung: 2, card: { text: "Smaller." }, given: { placed: { i4: 1 } } }),
    );
    expect(cards()).toEqual(["6 × 7", "2 × 9", "3 × 4", "5 × 5"]);
    // 3 × 4 goes up: it jumps over the fixed 2 × 9 to the first free place.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Move up: 3 × 4" }), { detail: 0 });
    });
    expect(cards()).toEqual(["3 × 4", "2 × 9", "6 × 7", "5 × 5"]);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual(["i2", "i4", "i1", "i3"]);
  });

  it("places and moves around fixed cards (withPlaced, moveAround)", () => {
    expect(withPlaced(["a", "b", "c", "d"], { d: 0 })).toEqual(["d", "a", "b", "c"]);
    expect(withPlaced(["a", "b", "c"], {})).toEqual(["a", "b", "c"]);
    expect(moveAround(["a", "X", "b", "c"], "c", "a", new Set(["X"]))).toEqual([
      "c",
      "X",
      "a",
      "b",
    ]);
    expect(moveAround(["a", "X", "b"], "X", "a", new Set(["X"]))).toBeNull();
    expect(moveAround(["a", "X", "b"], "a", "X", new Set(["X"]))).toBeNull();
  });
});
