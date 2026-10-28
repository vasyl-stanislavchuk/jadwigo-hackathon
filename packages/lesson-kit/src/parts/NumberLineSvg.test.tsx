/**
 * The number line's labels on fractions (dl-w3.55): a tick written as a fraction or a mixed number
 * draws through RichText (KaTeX), a line of whole numbers keeps its plain text, and the marker may
 * sit at a fraction. The labels are HTML over the SVG, at the UI's size, and a read marker is ink
 * (Enter addendum 3.5, 10b). The key is never drawn.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { must } from "./must.ts";
import { NumberLineSvg } from "./NumberLineSvg.tsx";

afterEach(cleanup);

describe("NumberLineSvg on fractions", () => {
  it("draws fraction labels as KaTeX in HTML over the SVG, one per labelled tick", () => {
    render(
      <NumberLineSvg
        data={{ min: 0, max: 1, step: 0.25, labelled: [0, 0.5, 1], tick_label: "fraction" }}
        marker={0.75}
        tone="idle"
        arcs={false}
        label="Number line from 0 to 1"
      />,
    );
    const labels = screen.getAllByTestId("tick-label");
    expect(labels).toHaveLength(3);
    expect(
      labels.every((l) => l.closest("svg") === null && l.tagName.toLowerCase() === "span"),
    ).toBe(true);
    expect(labels[1]?.querySelector(".katex")).not.toBeNull();
    expect(labels[1]?.querySelector(".katex-error")).toBeNull();
    expect(labels[0]?.textContent).toBe("0");
    expect(screen.getAllByTestId("tick")).toHaveLength(5);
    expect(screen.getByTestId("marker").getAttribute("data-value")).toBe("0.75");
  });

  it("a mixed-number line writes 1 and a half with its whole part", () => {
    render(
      <NumberLineSvg
        data={{ min: 0, max: 2, step: 0.5, labelled: [0, 1.5, 2], tick_label: "mixed" }}
        marker={null}
        tone="idle"
        arcs={false}
        label="Number line from 0 to 2"
      />,
    );
    const label = must(screen.getAllByTestId("tick-label")[1]);
    expect(label.querySelector(".katex")?.textContent).toContain("1");
    expect(label.querySelector(".katex")?.textContent).toContain("2");
  });

  it("a line of whole numbers keeps plain text labels", () => {
    render(
      <NumberLineSvg
        data={{ min: 0, max: 70, step: 7, labelled: [0, 35, 70] }}
        marker={null}
        tone="idle"
        arcs={false}
        label="Number line from 0 to 70"
      />,
    );
    const labels = screen.getAllByTestId("tick-label");
    expect(labels.map((l) => l.textContent)).toEqual(["0", "35", "70"]);
    expect(labels.every((l) => l.querySelector(".katex") === null)).toBe(true);
  });

  it("fraction style on whole labelled ticks still draws digits, through the same slots", () => {
    render(
      <NumberLineSvg
        data={{ min: 0, max: 1, step: 0.25, labelled: [0, 1], tick_label: "fraction" }}
        marker={0.25}
        tone="idle"
        arcs={false}
        label="Number line from 0 to 1"
      />,
    );
    expect(screen.getAllByTestId("tick-label").map((l) => l.textContent)).toEqual(["0", "1"]);
  });
});

describe("NumberLineSvg as the question draws it (Enter addendum 3.5)", () => {
  it("draws a read marker in ink, a placed one in the child’s blue, and labels at 34 px a 600 px line", () => {
    render(
      <NumberLineSvg
        data={{ min: 0, max: 100, step: 10, labelled: [0, 50, 100] }}
        marker={70}
        tone="idle"
        markerState="read"
        arcs={false}
        label="Number line from 0 to 100"
      />,
    );
    for (const part of screen.getByTestId("marker").children)
      expect(part.getAttribute("class")).toBe("fill-foreground");
    expect(screen.getAllByTestId("tick-label")[0]?.className).toContain(
      "text-[length:min(2.125rem,5.667cqw)]",
    );
    cleanup();
    render(
      <NumberLineSvg
        data={{ min: 0, max: 100, step: 10, labelled: [0, 100] }}
        marker={70}
        tone="idle"
        markerState="placed"
        arcs={false}
        label="Number line from 0 to 100"
      />,
    );
    expect(must(screen.getByTestId("marker").firstElementChild).getAttribute("class")).toBe(
      "fill-primary",
    );
  });

  it("keeps the line 4 px and the ticks 3 px, a labelled tick 4 px and longer, at any width", () => {
    render(
      <NumberLineSvg
        data={{ min: 0, max: 100, step: 10, labelled: [0, 50, 100] }}
        marker={null}
        tone="idle"
        arcs={false}
        label="Number line from 0 to 100"
      />,
    );
    const ticks = screen.getAllByTestId("tick").map((g) => must(g.querySelector("line")));
    const plain = must(
      ticks.find((l) => must(l.parentElement).getAttribute("data-value") === "10"),
    );
    const labelled = must(
      ticks.find((l) => must(l.parentElement).getAttribute("data-value") === "50"),
    );
    expect(plain.getAttribute("stroke-width")).toBe("3");
    expect(labelled.getAttribute("stroke-width")).toBe("4");
    expect(
      Number(labelled.getAttribute("y2")) - Number(labelled.getAttribute("y1")),
    ).toBeGreaterThan(Number(plain.getAttribute("y2")) - Number(plain.getAttribute("y1")));
    for (const l of [
      ...ticks,
      must(screen.getByTestId("number-line").querySelector(":scope > line")),
    ])
      expect(l.getAttribute("vector-effect")).toBe("non-scaling-stroke");
  });
});
