/**
 * The drawn graph part (dl-w3.51.3): every bar is a vertical slider the keyboard moves a step at a
 * time, a tap on a column sets the bar to that height, a given bar is locked, a picture graph
 * stacks one picture per tick, and each change is announced.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BarGraph } from "./BarGraph.tsx";
import type { GraphData } from "./graph.ts";
import { PLOT, WIDTH, yOf } from "./graph.ts";
import { must } from "./must.ts";

afterEach(cleanup);

const data: GraphData = {
  kind: "bar",
  categories: [
    { id: "a", label: "apples" },
    { id: "b", label: "pears" },
  ],
  max: 10,
  step: 1,
  tick: 2,
  unit_label: "children",
};
const words = {
  label: "Graph from 0 to 10",
  barLabel: (c: { label: string }) => `Bar: ${c.label}`,
  valueText: (c: { label: string }, h: number) => `${c.label}: ${h} children`,
};

describe("BarGraph", () => {
  it("each bar is a vertical slider; arrow keys move it a step, Home and End to the ends, and it is announced", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <BarGraph
        data={data}
        heights={{ a: 3 }}
        tones={{}}
        tone="idle"
        {...words}
        interactive={{ onChange }}
      />,
    );
    const bar = screen.getByRole("slider", { name: "Bar: apples" });
    expect(bar.getAttribute("aria-valuenow")).toBe("3");
    expect(bar.getAttribute("aria-valuetext")).toBe("apples: 3 children");
    expect(bar.getAttribute("aria-orientation")).toBe("vertical");
    fireEvent.keyDown(bar, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("a", 4, "keyboard");
    fireEvent.keyDown(bar, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("a", 2, "keyboard");
    fireEvent.keyDown(bar, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("a", 10, "keyboard");
    fireEvent.keyDown(bar, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("a", 0, "keyboard");
    expect(screen.getByTestId("graph-announce").textContent).toBe("apples: 0 children");
    rerender(
      <BarGraph
        data={data}
        heights={{ a: 0 }}
        tones={{}}
        tone="idle"
        {...words}
        interactive={{ onChange }}
      />,
    );
    fireEvent.keyDown(screen.getByRole("slider", { name: "Bar: apples" }), { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("a tap on a column sets the bar to the nearest step at that height", () => {
    const onChange = vi.fn();
    // The drawing is cropped to the plot and its ticks (dl-uukj.29.71): one px per unit, PLOT.y1 + 16 tall.
    const tall = PLOT.y1 + 16;
    const rect = {
      top: 0,
      left: 0,
      width: WIDTH,
      height: tall,
      right: WIDTH,
      bottom: tall,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
    const spy = vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
    render(
      <BarGraph
        data={data}
        heights={{}}
        tones={{}}
        tone="idle"
        {...words}
        interactive={{ onChange }}
      />,
    );
    const bar = screen.getByRole("slider", { name: "Bar: pears" });
    fireEvent.pointerDown(bar, { clientX: 700, clientY: yOf(6.3, data), pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith("b", 6, "click");
    fireEvent.pointerMove(bar, { clientX: 700, clientY: yOf(8, data), pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith("b", 8, "click");
    fireEvent.pointerUp(bar, { pointerId: 1 });
    fireEvent.pointerMove(bar, { clientX: 700, clientY: PLOT.y1, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("a given bar is locked and not a slider; a focused bar wears the ring; tones reach the bars", () => {
    const onChange = vi.fn();
    render(
      <BarGraph
        data={data}
        heights={{ a: 4, b: 2 }}
        tones={{ a: "green", b: "try_again" }}
        tone="idle"
        {...words}
        given={new Set(["a"])}
        focus={new Set(["b"])}
        interactive={{ onChange }}
      />,
    );
    expect(screen.queryByRole("slider", { name: "Bar: apples" })).toBeNull();
    const given = screen.getByRole("img", { name: "apples: 4 children" });
    expect(given.dataset["helpGiven"]).toBe("true");
    fireEvent.keyDown(given, { key: "ArrowUp" });
    expect(onChange).not.toHaveBeenCalled();
    const pears = screen.getByRole("slider", { name: "Bar: pears" });
    expect(pears.dataset["helpFocus"]).toBe("true");
    expect(pears.dataset["tone"]).toBe("try_again");
    expect(given.dataset["tone"]).toBe("green");
  });

  it("a picture graph stacks one picture per tick and names what a picture stands for", () => {
    const pics: GraphData = {
      kind: "picture",
      categories: [
        { id: "a", label: "sunny", picture: { icon: "sun" } },
        { id: "b", label: "rainy", picture: { icon: "rain" } },
      ],
      max: 5,
      step: 1,
    };
    const { container } = render(
      <BarGraph
        data={pics}
        heights={{ a: 3, b: 1 }}
        tones={{}}
        tone="idle"
        {...words}
        legend="One picture stands for 1 day"
      />,
    );
    const bars = container.querySelectorAll('[data-testid="bar"]');
    expect(bars[0]?.querySelectorAll("svg")).toHaveLength(3);
    expect(bars[1]?.querySelectorAll("svg")).toHaveLength(1);
    expect(screen.getByText("One picture stands for 1 day")).toBeTruthy();
    expect(screen.getAllByRole("img", { name: /sunny|rainy/ })).toHaveLength(2);
    // No numbers up the side of a line plot or a dot plot: the stack is the count.
    const dots = render(
      <BarGraph
        data={{ ...pics, kind: "dot_plot" }}
        heights={{ a: 2 }}
        tones={{}}
        tone="idle"
        {...words}
      />,
    );
    expect(dots.container.querySelectorAll('[data-testid="grid-label"]')).toHaveLength(0);
    expect(dots.container.querySelectorAll("circle")).toHaveLength(2);
  });

  it("a TeX category label is drawn through RichText, never as raw TeX", () => {
    const tex: GraphData = {
      ...data,
      categories: [
        { id: "a", label: "$\\text{Red}$" },
        { id: "b", label: "$\\frac{1}{2}$" },
      ],
    };
    const { container } = render(
      <BarGraph data={tex} heights={{}} tones={{}} tone="idle" {...words} />,
    );
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).not.toContain("\\frac");
  });
});

describe("BarGraph labels (dl-uukj.29.71)", () => {
  it("draws the scale, the names and the unit as HTML outside the SVG, and the drawing is cropped to the plot", () => {
    const { container } = render(
      <BarGraph
        data={{ ...data, category_label: "fruit" }}
        heights={{ a: 2 }}
        tones={{}}
        tone="idle"
        {...words}
      />,
    );
    const svg = must(container.querySelector('svg[data-testid="bar-graph"]'));
    expect(svg.querySelectorAll("text, foreignObject")).toHaveLength(0);
    expect(svg.getAttribute("viewBox")).toBe(
      `${PLOT.x0 - 12} 0 ${PLOT.x1 - PLOT.x0 + 24} ${PLOT.y1 + 16}`,
    );
    expect(
      [...container.querySelectorAll('[data-testid="category-label"]')].map((e) => e.textContent),
    ).toEqual(["apples", "pears"]);
    expect(container.querySelector('[data-testid="unit-label"]')?.tagName).toBe("P");
    expect(screen.getByText("fruit").tagName).toBe("P");
    // Every label at the option size: 24 on a phone, 26 on a laptop.
    for (const el of container.querySelectorAll(
      '[data-testid="grid-label"], [data-testid="category-label"]',
    ))
      expect(el.className).toContain("text-[length:var(--kid-answer-size)]");
    // A scale label sits at its gridline, in percent of the cropped drawing.
    const two = must(
      [...container.querySelectorAll<HTMLElement>('[data-testid="grid-label"]')].find(
        (e) => e.textContent === "2",
      ),
    );
    expect(parseFloat(two.style.top)).toBeCloseTo((yOf(2, data) / (PLOT.y1 + 16)) * 100, 3);
  });
});
