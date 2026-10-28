/**
 * fraction_shade (dl-w3.61.7): the solution, the checks, the view by tap and by keyboard, and the
 * fraction_bars figure. The judge is `packages/core`'s.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { placeSolution } from "../answer.ts";
import { FigureView } from "../FigureView.tsx";
import { Family, QuestionType, Surface } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { validate } from "../validate.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
import type { PlaceData, PlaceKey } from "./model.ts";
import { PlaceView } from "./PlaceView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-19T00:00:00.000Z" }) };
const bar: PlaceData = {
  surface: Surface.Fraction,
  shape: "bar",
  parts: 4,
  label: "$\\frac{3}{4}$",
};
const key: PlaceKey = { surface: Surface.Fraction, count: 3 };
const spec = (data: PlaceData = bar, k: PlaceKey = key): SpecOf<typeof Family.Place> => ({
  id: "s1",
  say: "Zamaluj trzy czwarte paska.",
  question_type: QuestionType.FractionShade,
  family: Family.Place,
  data,
  key: k,
});

describe("the fraction solution", () => {
  it("draws the first parts", () => {
    expect(placeSolution(key)).toEqual({ shaded: [0, 1, 2] });
  });
});

describe("the fraction checks", () => {
  const rules = (data: PlaceData, k: PlaceKey = key) => validate(spec(data, k)).map((p) => p.rule);
  it("passes a good step", () =>
    expect(validate(spec()).filter((p) => p.level === "error")).toEqual([]));
  it("takes 2 to 12 parts", () => {
    expect(rules({ ...bar, parts: 1 } as PlaceData)).toContain("fraction_parts");
    expect(rules({ ...bar, parts: 13 } as PlaceData)).toContain("fraction_parts");
  });
  it("needs rows that divide a rectangle", () =>
    expect(
      rules({ surface: Surface.Fraction, shape: "rect", parts: 6, rows: 4, label: "x" }),
    ).toContain("fraction_rows"));
  it("needs a count within the parts", () =>
    expect(rules(bar, { surface: Surface.Fraction, count: 5 })).toContain("fraction_count"));
  it("refuses fraction bars whose alt compares them", () => {
    const gaps: SpecOf<typeof Family.Slots> = {
      id: "s1",
      say: "Wybierz znak.",
      question_type: QuestionType.FractionCompare,
      family: Family.Slots,
      data: {
        template: "$\\frac{1}{3}$ {g1} $\\frac{1}{5}$",
        gaps: [
          {
            id: "g1",
            kind: Family.Choose,
            options: [
              { id: "c1", label: "<" },
              { id: "c3", label: ">" },
            ],
          },
        ],
        figure: {
          kind: "fraction_bars",
          items: [
            { n: 1, d: 3 },
            { n: 1, d: 5 },
          ],
          shape: "bar",
          alt: "1/3 > 1/5",
        },
      },
      key: { gaps: { g1: { kind: Family.Choose, correct: ["c3"] } } },
    };
    expect(validate(gaps).map((p) => p.rule)).toContain("key_in_alt");
  });
});

describe("the fraction surface", () => {
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
  it("shades parts by tap and commits them", () => {
    const onCommit = play();
    for (const n of [1, 2, 4])
      fireEvent.pointerDown(screen.getByRole("button", { name: `Part ${n} of 4` }), { button: 0 });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Part 4 of 4" }), { button: 0 });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Part 3 of 4" }), { button: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ shaded: [0, 1, 2] });
  });
  it("shades a part by Space on the keyboard", () => {
    const onCommit = play();
    const part = screen.getByRole("button", { name: "Part 2 of 4" });
    fireEvent.keyDown(part, { key: " " });
    expect(part.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0]).toMatchObject({
      value: { shaded: [1] },
      modality: "keyboard",
    });
  });
  it("commits nothing while nothing is shaded", () => {
    const onCommit = play();
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("the fraction_bars figure", () => {
  it("draws one shape per fraction, shaded, under its alt", () => {
    const { container } = render(
      <FigureView
        language="pl"
        figure={{
          kind: "fraction_bars",
          items: [
            { n: 3, d: 4 },
            { n: 2, d: 3 },
          ],
          shape: "bar",
          alt: "Dwa paski.",
        }}
      />,
    );
    expect(
      container.querySelector('[data-figure="fraction_bars"]')?.getAttribute("aria-label"),
    ).toBe("Dwa paski.");
    expect(
      [...container.querySelectorAll("[data-fraction]")].map((e) =>
        e.getAttribute("data-fraction"),
      ),
    ).toEqual(["bar:3/4", "bar:2/3"]);
  });
});
