import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { must } from "../parts/must.ts";
import { FigureView } from "./FigureView.tsx";
import type { Figure } from "./figure.ts";

describe("the expression figure", () => {
  it("keeps a run of numbers and commas on one line, its maths inline (Khan xcc93caa6552a9070)", () => {
    const { container } = render(
      <FigureView
        figure={{ kind: "expression", text: "$116$, $117$, $118$, $119$," }}
        language="en"
      />,
    );
    const maths = [...container.querySelectorAll("[data-tex]")];
    expect(maths).toHaveLength(4);
    expect(maths.every((m) => m.getAttribute("data-tex") === "inline")).toBe(true);
    expect(container.textContent).toContain("116, 117, 118, 119,");
  });

  it("draws a figure that is one formula in display mode", () => {
    const { container } = render(
      <FigureView figure={{ kind: "expression", text: "$\\frac{3}{4}$" }} language="en" />,
    );
    expect(must(container.querySelector("[data-tex]")).getAttribute("data-tex")).toBe("display");
  });
});

describe("no --focus ink on the question (Enter addendum 10b)", () => {
  it("draws shaded parts and the read marker in ink, and the line at most 600 wide", () => {
    const bars = render(
      <FigureView
        figure={{
          kind: "fraction_bars",
          items: [{ n: 2, d: 6 }],
          shape: "bar",
          alt: "A bar of six parts, two shaded",
        }}
        language="en"
      />,
    );
    const shaded = [...bars.container.querySelectorAll('[data-shaded="yes"]')];
    expect(shaded).toHaveLength(2);
    expect(shaded.every((p) => must(p.getAttribute("class")).includes("fill-foreground"))).toBe(
      true,
    );
    bars.unmount();
    const { container } = render(
      <FigureView
        figure={{
          kind: "number_line",
          min: 0,
          max: 100,
          step: 10,
          labelled: [0, 50, 100],
          marker: 70,
        }}
        language="en"
      />,
    );
    expect(container.querySelector('[class*="primary"]')).toBeNull();
    expect(must(container.querySelector('[data-figure="number_line"]')).className).toContain(
      "max-w-[37.5rem]",
    );
  });
});

describe("fraction bars print their fraction unless it is the answer (dl-uukj.29.108)", () => {
  it("prints 2/6 beside the bar by default, and nothing with labels none", () => {
    const fig: Figure = {
      kind: "fraction_bars",
      items: [{ n: 2, d: 6 }],
      shape: "bar",
      alt: "A bar of six parts, two shaded",
    };
    const shown = render(<FigureView figure={fig} language="en" />);
    expect(must(shown.container.textContent).trim()).not.toBe("");
    shown.unmount();
    const { container } = render(
      <FigureView figure={{ ...fig, labels: "none" } as Figure} language="en" />,
    );
    expect(container.querySelectorAll('[data-shaded="yes"]')).toHaveLength(2);
    expect(must(container.textContent).trim()).toBe("");
  });
});
