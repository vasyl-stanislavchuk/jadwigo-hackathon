/**
 * Group's two-column layout (dl-w3.51.7, Khan's matcher): the items fixed on the left, the groups
 * reordered on the right, row i pairing item i with the group beside it. Tap-tap and the up and
 * down buttons reorder, Check commits items to groups, a miss marks each pair (three or more) or
 * the whole step (two), and a pair rung 2 gives is pinned at its row and cannot be moved.
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { Feedback, PageHelp } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { ViewMode } from "../view.ts";
import { GroupView, pairsOf, pinOrder, pinsOf } from "./GroupView.tsx";
import { layoutOf } from "./model.ts";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-18T00:00:00.000Z" }) };
const match: SpecOf<typeof Family.Group> = {
  id: "s1",
  say: "Match each fact to its answer",
  question_type: QuestionType.Match,
  family: Family.Group,
  data: {
    groups: [
      { id: "a27", label: "27", capacity: 1 },
      { id: "a42", label: "$6 \\times 7$", capacity: 1 },
      { id: "a32", label: "32", capacity: 1 },
    ],
    items: [
      { id: "f1", label: "6 × 7" },
      { id: "f2", label: "8 × 4" },
      { id: "f3", label: "9 × 3" },
    ],
    each_item: "one",
  },
  key: { items: { f1: ["a42"], f2: ["a32"], f3: ["a27"] } },
};
const two: SpecOf<typeof Family.Group> = {
  ...match,
  data: {
    ...match.data,
    groups: match.data.groups.slice(0, 2).reverse(),
    items: match.data.items.slice(0, 2),
  },
  key: { items: { f1: ["a42"], f2: ["a27"] } },
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

function draw(
  spec: SpecOf<typeof Family.Group>,
  feedback: Feedback | null = null,
  attemptNo = 1,
  ladder: PageHelp | null = null,
  onCommit = vi.fn(),
) {
  const props = {
    language: "en" as const,
    category: "child" as const,
    clock,
    mode: ViewMode.Play,
    spec: pageSpec(spec),
    live: true,
    attemptNo,
    feedback,
    onCommit,
    around: {
      checking: false,
      moveOn: null,
      ladder: ladder && { help: ladder, ask: null, refused: false },
    },
  };
  const view = <GroupView {...(props as unknown as Parameters<typeof GroupView>[0])} />;
  const out = render(<StepFrame stepId="s1">{view}</StepFrame>);
  return {
    onCommit,
    rerender: (next: Feedback | null, n: number) =>
      out.rerender(
        <StepFrame stepId="s1">
          {
            <GroupView
              {...({ ...props, feedback: next, attemptNo: n } as unknown as Parameters<
                typeof GroupView
              >[0])}
            />
          }
        </StepFrame>,
      ),
  };
}

const tap = (el: HTMLElement) =>
  act(() => {
    fireEvent.click(el, { detail: 0 });
  });
/** The right column's cards, top to bottom, as their words. */
const rightColumn = () =>
  screen
    .getAllByRole("button", { pressed: false })
    .filter((b) => b.dataset["tone"] !== undefined && b.closest("li"))
    .map((b) => b.textContent ?? "");
const rightCard = (text: string) =>
  screen
    .getAllByRole("button")
    .find((b) => b.dataset["tone"] !== undefined && b.textContent === text) as HTMLElement;

describe("Group in two columns", () => {
  it("is match’s default layout, and bucket’s is zones", () => {
    expect(layoutOf(match.data, QuestionType.Match)).toBe("columns");
    expect(layoutOf(match.data, QuestionType.Bucket)).toBe("zones");
    expect(layoutOf({ ...match.data, layout: "zones" }, QuestionType.Match)).toBe("zones");
  });

  it("pairs row i with item i, pins a given group at its item’s row, and the others flow around it", () => {
    expect(pairsOf(match.data, ["a27", "a42", "a32"])).toEqual({
      items: { f1: ["a27"], f2: ["a42"], f3: ["a32"] },
    });
    expect(pinsOf(match.data, { f3: ["a27"] })).toEqual({ a27: 2 });
    expect(pinOrder(["a27", "a42", "a32"], { a27: 2 })).toEqual(["a42", "a32", "a27"]);
    expect(pinOrder(["a27", "a42", "a32"], {})).toEqual(["a27", "a42", "a32"]);
  });

  it("draws the items fixed on the left with no place numbers, and the groups as cards on the right", () => {
    draw(match);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(must(rows[0])).getByText("6 × 7").closest("button")).toBeNull();
    expect(within(must(rows[0])).getByText("27").closest("button")).not.toBeNull();
    expect(rightColumn()).toEqual(["27", "6 × 7", "32"]);
  });

  it("tap-tap and the arrows reorder the right column, and Check commits items to groups", () => {
    const { onCommit } = draw(match);
    tap(rightCard("27"));
    tap(rightCard("32"));
    expect(rightColumn()).toEqual(["6 × 7", "32", "27"]);
    // The arrow's name carries the card's words as written (TeX included: the voice never reads them).
    tap(screen.getByRole("button", { name: "Move down: $6 \\times 7$" }));
    expect(rightColumn()).toEqual(["32", "6 × 7", "27"]);
    tap(screen.getByRole("button", { name: "Move up: $6 \\times 7$" }));
    tap(screen.getByRole("button", { name: "Check" }));
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({
      items: { f1: ["a42"], f2: ["a32"], f3: ["a27"] },
    });
  });

  it("after a miss each pair is marked, and a mark clears when that row changes", () => {
    const { rerender } = draw(match);
    rerender(
      {
        kind: "try_again",
        index: 0,
        parts: [
          { id: "f1", correct: false },
          { id: "f2", correct: true },
          { id: "f3", correct: false },
        ],
      },
      2,
    );
    expect(rightCard("27").dataset["tone"]).toBe("amber");
    expect(rightCard("6 × 7").dataset["tone"]).toBe("green");
    expect(rightCard("32").dataset["tone"]).toBe("amber");
    const rows = screen.getAllByRole("listitem");
    expect(
      within(must(rows[0]))
        .getByText("6 × 7")
        .parentElement?.closest("[data-tone]")
        ?.getAttribute("data-tone"),
    ).toBe("amber");
    // Swapping the second and third rows changes those two pairs only; the first keeps its mark.
    tap(screen.getByRole("button", { name: "Move up: 32" }));
    expect(rightColumn()).toEqual(["27", "32", "6 × 7"]);
    expect(rightCard("27").dataset["tone"]).toBe("amber");
    expect(rightCard("32").dataset["tone"]).toBe("idle");
    expect(rightCard("6 × 7").dataset["tone"]).toBe("idle");
  });

  it("with two pairs the whole column is marked, not each pair", () => {
    const { rerender } = draw(two);
    rerender({ kind: "try_again", index: 0 }, 2);
    expect(rightCard("6 × 7").dataset["tone"]).toBe("amber");
    expect(rightCard("27").dataset["tone"]).toBe("amber");
  });

  it("a pair rung 2 gives is pinned at its row, locked, and committed with the rest", () => {
    const { onCommit } = draw(
      match,
      null,
      1,
      help({ rung: 2, card: { text: "Smaller." }, given: { items: { f3: ["a27"] } } }),
    );
    expect(rightColumn()).toEqual(["6 × 7", "32", "27"]);
    const given = rightCard("27");
    expect(given.dataset["helpGiven"]).toBe("true");
    expect(given.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: "Move up: 27" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
    tap(rightCard("6 × 7"));
    tap(rightCard("32"));
    expect(rightColumn()).toEqual(["32", "6 × 7", "27"]);
    tap(rightCard("6 × 7"));
    tap(rightCard("32"));
    tap(screen.getByRole("button", { name: "Check" }));
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({
      items: { f1: ["a42"], f2: ["a32"], f3: ["a27"] },
    });
  });

  it("rung 1 outlines a left card or a right card by id", () => {
    draw(match, null, 1, help({ focus: ["f2", "a32"] }));
    const rows = screen.getAllByRole("listitem");
    expect(
      within(must(rows[1])).getByText("8 × 4").parentElement?.closest("[data-help-focus]"),
    ).not.toBeNull();
    expect(
      within(must(rows[0])).getByText("6 × 7").parentElement?.closest("[data-help-focus]"),
    ).toBeNull();
    expect(rightCard("32").dataset["helpFocus"]).toBe("true");
    expect(rightCard("27").dataset["helpFocus"]).toBeUndefined();
  });

  it("the solution view shows the pairs as rows, the learner’s beside the right ones", () => {
    const props = {
      language: "en" as const,
      category: "child" as const,
      clock,
      mode: ViewMode.Solution,
      spec: pageSpec(match),
      value: { items: { f1: ["a27"], f2: ["a32"], f3: ["a42"] } },
      solution: { items: { f1: ["a42"], f2: ["a32"], f3: ["a27"] } },
    };
    render(<GroupView {...(props as unknown as Parameters<typeof GroupView>[0])} />);
    expect(screen.getByText("Your answer")).toBeTruthy();
    expect(screen.getByText("The answer")).toBeTruthy();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(6);
    expect(must(rows[0]).dataset["tone"]).toBe("amber");
    expect(must(rows[1]).dataset["tone"]).toBe("green");
    expect(must(rows[3]).dataset["tone"]).toBe("green");
  });
});
