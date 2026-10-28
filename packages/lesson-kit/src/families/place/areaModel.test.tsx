/**
 * area_model (dl-w3.61.7): its solution and checks; the split strip by tap and by arrow keys, held
 * in place before the child splits. The judge, size and split marked apart, is `packages/core`'s.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { placeSolution } from "../answer.ts";
import { Family, QuestionType, Surface } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { validate } from "../validate.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
import type { PlaceData, PlaceKey } from "./model.ts";
import { PlaceView } from "./PlaceView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-19T00:00:00.000Z" }) };
const data: PlaceData = {
  surface: Surface.Grid,
  size: 9,
  label: "6 × 7",
  split: "one",
  cells: "squares",
};
const key: PlaceKey = {
  surface: Surface.Grid,
  rows: 6,
  cols: 7,
  either_order: true,
  split: { accept_at: [5] },
};
const spec = (k: PlaceKey = key, d: PlaceData = data): SpecOf<typeof Family.Place> => ({
  id: "s1",
  say: "Zbuduj i podziel.",
  question_type: QuestionType.AreaModel,
  family: Family.Place,
  data: d,
  key: k,
});

describe("the area model solution", () => {
  it("draws the solution with its split", () =>
    expect(placeSolution(key)).toEqual({ rows: 6, cols: 7, split: { axis: "cols", at: 5 } }));
});

describe("the area model checks", () => {
  it("passes a good step", () =>
    expect(validate(spec()).filter((p) => p.level === "error")).toEqual([]));
  it("asks for a split exactly when the key has one", () => {
    expect(validate(spec({ ...key, split: undefined } as PlaceKey)).map((p) => p.rule)).toContain(
      "split_mismatch",
    );
  });
  it("keeps every accepted split inside the side", () => {
    expect(
      validate(spec({ ...key, split: { accept_at: [7] } } as PlaceKey)).map((p) => p.rule),
    ).toContain("split_outside");
  });
});

describe("the split strip", () => {
  const play = (onCommit = vi.fn()) => {
    render(
      <StepFrame stepId="s1">
        <PlaceView
          mode={ViewMode.Play}
          spec={pageSpec(spec()) as PageSpecOf<typeof Family.Place>}
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
  };
  it("holds its places before the rectangle is built, so nothing moves", () => {
    play();
    expect(document.querySelectorAll("[data-split-slot], [data-split]").length).toBe(2 * 9);
    expect(document.querySelector("[data-split-sum]")?.textContent).toBe(
      "The rectangle is not split yet.",
    );
  });
  it("builds, splits by tap and commits the split", () => {
    const onCommit = play();
    fireEvent.pointerDown(screen.getByRole("button", { name: "6 by 7" }), { button: 0 });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Split after column 5" }), {
      button: 0,
    });
    expect(document.querySelector("[data-split-sum]")?.textContent).toBe("6 × 5 + 6 × 2");
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({
      rows: 6,
      cols: 7,
      split: { axis: "cols", at: 5 },
    });
  });
  it("moves the split with the arrow keys", () => {
    const onCommit = play();
    fireEvent.click(screen.getByRole("button", { name: "6 by 7" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Split after column 3" }), { detail: 0 });
    fireEvent.keyDown(screen.getByRole("button", { name: "Split after column 3" }), {
      key: "ArrowRight",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "Split after column 4" }), {
      key: "ArrowRight",
    });
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value.split).toEqual({ axis: "cols", at: 5 });
  });
  it("offers no split past the rectangle", () => {
    play();
    fireEvent.pointerDown(screen.getByRole("button", { name: "6 by 7" }), { button: 0 });
    expect(screen.queryByRole("button", { name: "Split after column 7" })).toBeNull();
    expect(screen.getByRole("button", { name: "Split after row 5" })).not.toBeNull();
  });
});
