/**
 * Lane B (dl-w3.61.3): a picture answered by keyboard (a crosshair on a 20 by 20 grid, Enter to
 * tap, Backspace to lift), a line graph and a histogram drawn by the graph part, their checks in
 * validate.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BarGraph } from "../../parts/BarGraph.tsx";
import { column, type GraphData } from "../../parts/graph.ts";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { Family, QuestionType, Surface } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { validate } from "../validate.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
import type { PlaceData, PlaceKey } from "./model.ts";
import { PlaceView } from "./PlaceView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-19T00:00:00.000Z" }) };
const specOf = (
  question_type: string,
  data: PlaceData,
  key: PlaceKey,
): SpecOf<typeof Family.Place> => ({
  id: "s1",
  say: "Spróbuj.",
  question_type: question_type as never,
  family: Family.Place,
  data,
  key,
});
const square = [
  { x: 0.5, y: 0.5 },
  { x: 0.6, y: 0.5 },
  { x: 0.6, y: 0.6 },
  { x: 0.5, y: 0.6 },
];

describe("a picture by keyboard", () => {
  it("arrows move the crosshair a cell, Enter taps the cell centre, Backspace lifts the last tap", () => {
    const spec = pageSpec(
      specOf(
        QuestionType.Hotspot,
        { surface: Surface.Image, image: "p.svg", image_alt: "Figury", taps: 2 },
        { surface: Surface.Image, targets: [{ id: "r1", polygon: square }], require_all: true },
      ),
    ) as PageSpecOf<typeof Family.Place>;
    render(
      <StepFrame stepId="s1">
        <PlaceView
          mode={ViewMode.Play}
          spec={spec}
          language="en"
          category="child"
          clock={clock}
          live
          attemptNo={1}
          feedback={null}
          onCommit={() => {}}
        />
      </StepFrame>,
    );
    const picture = screen.getByRole("group", { name: /arrow keys move the target/ });
    expect(screen.queryByTestId("hotspot-cursor")).toBeNull();
    fireEvent.keyDown(picture, { key: "ArrowRight" });
    fireEvent.keyDown(picture, { key: "ArrowDown" });
    const cursor = screen.getByTestId("hotspot-cursor");
    expect(cursor.style.left).toBe("57.5%");
    expect(cursor.style.top).toBe("57.5%");
    expect(screen.getByTestId("hotspot-announce").textContent).toBe(
      "Target: 12 from the left, 12 from the top",
    );
    fireEvent.keyDown(picture, { key: "Enter" });
    fireEvent.keyDown(picture, { key: "ArrowLeft" });
    fireEvent.keyDown(picture, { key: " " });
    const markers = screen.getAllByRole("button", { name: /^Tap \d/ });
    expect(markers.map((m) => parseFloat(m.style.left))).toEqual(
      [57.5, 52.5].map((v) => expect.closeTo(v)),
    );
    fireEvent.keyDown(picture, { key: "Backspace" });
    expect(screen.getAllByRole("button", { name: /^Tap \d/ })).toHaveLength(1);
    // The crosshair never stops at the edge of the picture's grid by wrapping: it stays inside.
    for (let i = 0; i < 30; i++) fireEvent.keyDown(picture, { key: "ArrowUp" });
    expect(screen.getByTestId("hotspot-cursor").style.top).toBe("2.5%");
  });
});

const words = {
  label: "Graph",
  barLabel: (c: { label: string }) => `Point: ${c.label}`,
  valueText: (c: { label: string }, h: number) => `${c.label}: ${h}`,
};

describe("a line graph and a histogram", () => {
  const line: GraphData = {
    kind: "line",
    categories: [
      { id: "a", label: "Mon" },
      { id: "b", label: "Tue" },
      { id: "c", label: "Wed" },
    ],
    max: 10,
    step: 1,
    tick: 2,
  };
  it("a line graph draws a point per category joined by one line, and its axis is numbered", () => {
    const onChange = vi.fn();
    const { container } = render(
      <BarGraph
        data={line}
        heights={{ a: 4, b: 6 }}
        tones={{}}
        tone="idle"
        {...words}
        interactive={{ onChange }}
      />,
    );
    expect(container.querySelectorAll('[data-testid="graph-point"]')).toHaveLength(3);
    expect(
      container.querySelector('[data-testid="graph-line"]')?.getAttribute("points")?.split(" "),
    ).toHaveLength(3);
    expect(container.querySelectorAll('[data-testid="grid-label"]').length).toBeGreaterThan(0);
    fireEvent.keyDown(screen.getByRole("slider", { name: "Point: Wed" }), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("c", 1, "keyboard");
  });

  it("a histogram draws touching bars and labels its bin edges, not its categories", () => {
    const hist: GraphData = {
      kind: "histogram",
      categories: [
        { id: "a", label: "0–5" },
        { id: "b", label: "5–10" },
      ],
      bins: [0, 5, 10],
      max: 6,
      step: 1,
    };
    const { container } = render(
      <BarGraph data={hist} heights={{ a: 2, b: 3 }} tones={{}} tone="idle" {...words} />,
    );
    expect(
      [...container.querySelectorAll('[data-testid="bin-edge"]')].map((e) => e.textContent),
    ).toEqual(["0", "5", "10"]);
    expect(container.querySelectorAll('[data-testid="category-label"]')).toHaveLength(0);
    const rects = [...container.querySelectorAll('[data-testid="bar"] rect.stroke-card')];
    expect(rects).toHaveLength(2);
    expect(
      Number(must(rects[0]).getAttribute("x")) + Number(must(rects[0]).getAttribute("width")),
    ).toBeCloseTo(Number(must(rects[1]).getAttribute("x")));
    expect(Number(must(rects[0]).getAttribute("width"))).toBeCloseTo(column(0, 2).w);
  });

  const bars = (kind: "line" | "histogram" | "bar", bins?: number[]): SpecOf<typeof Family.Place> =>
    specOf(
      QuestionType.DrawGraph,
      {
        surface: Surface.Bars,
        kind,
        categories: [
          { id: "a", label: "0–5" },
          { id: "b", label: "5–10" },
        ],
        max: 6,
        step: 1,
        ...(bins ? { bins } : {}),
      },
      { surface: Surface.Bars, heights: { a: 2, b: 3 } },
    );
  const rules = (spec: SpecOf<typeof Family.Place>) =>
    validate(spec).map((p) => `${p.level}:${p.rule}`);

  it("validate: a histogram needs one more edge than bars, increasing; unequal bins and unused edges warn", () => {
    expect(rules(bars("histogram", [0, 5, 10]))).toEqual([]);
    expect(rules(bars("line"))).toEqual([]);
    expect(rules(bars("histogram"))).toContain("error:bins_mismatch");
    expect(rules(bars("histogram", [0, 5]))).toContain("error:bins_mismatch");
    expect(rules(bars("histogram", [0, 5, 5]))).toContain("error:bins_not_increasing");
    expect(rules(bars("histogram", [0, 5, 15]))).toEqual(["warning:unequal_bins"]);
    expect(rules(bars("bar", [0, 5, 10]))).toEqual(["warning:bins_unused"]);
  });
});
