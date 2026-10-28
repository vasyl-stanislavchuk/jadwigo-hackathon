/**
 * The ruler part (dl-w3.51.4): its geometry snaps the zero end to a mark and keeps it on the
 * picture, a centimetre ruler numbers every unit and a millimetre ruler every ten, and the
 * interactive ruler moves by tap, drag and arrow keys. Nothing here knows what is measured.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "./must.ts";
import { Ruler } from "./Ruler.tsx";
import {
  labelEvery,
  lastZero,
  nudgeZero,
  numberPx,
  rulerBox,
  rulerMarks,
  snapZero,
} from "./rulerGeometry.ts";

afterEach(cleanup);

const cm = { length: 8, pixelsPerUnit: 40, ticks: 10, width: 400 };
const mm = { length: 80, pixelsPerUnit: 4, ticks: 1, width: 400 };

describe("ruler geometry", () => {
  it("snaps the zero to a mark and keeps it one numbered step inside the picture", () => {
    expect(snapZero(41.7, cm)).toBe(40);
    expect(snapZero(-20, cm)).toBe(0);
    expect(snapZero(900, cm)).toBe(lastZero(cm));
    expect(lastZero(cm)).toBe(360);
    expect(lastZero(mm)).toBe(360);
  });

  it("an arrow moves one mark, Shift and an arrow one numbered step, on both rulers", () => {
    expect(nudgeZero(40, 1, cm)).toBe(44);
    expect(nudgeZero(40, -1, cm)).toBe(36);
    expect(nudgeZero(40, 1, cm, true)).toBe(80);
    expect(nudgeZero(40, 1, mm)).toBe(44);
    expect(nudgeZero(40, 1, mm, true)).toBe(80);
    expect(nudgeZero(0, -1, cm)).toBe(0);
  });

  it("numbers every centimetre on a centimetre ruler and every ten millimetres on a millimetre one", () => {
    expect(labelEvery(cm)).toBe(1);
    expect(labelEvery(mm)).toBe(10);
    expect(numberPx(cm)).toBe(numberPx(mm));
    const cmMarks = rulerMarks(0, cm);
    expect(cmMarks).toHaveLength(81);
    expect(cmMarks.filter((m) => m.kind === "number").map((m) => m.n)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(cmMarks.filter((m) => m.kind === "half")).toHaveLength(8);
    const mmMarks = rulerMarks(0, mm);
    expect(mmMarks).toHaveLength(81);
    expect(mmMarks.filter((m) => m.kind === "number").map((m) => m.n)).toEqual([
      0, 10, 20, 30, 40, 50, 60, 70, 80,
    ]);
    expect(mmMarks[25]?.kind).toBe("half");
  });

  it("the body starts a little before the zero and is as tall as a numbered step and a bit", () => {
    const box = rulerBox(40, cm);
    expect(box.x).toBeLessThan(40);
    expect(box.width).toBeGreaterThan(8 * 40);
    expect(box.height).toBeCloseTo(44);
  });
});

/** happy-dom lays nothing out: give the SVG a 400 px box so clientX maps to picture pixels. */
function laidOut(): SVGSVGElement {
  const svg = screen.getByTestId("ruler") as unknown as SVGSVGElement;
  svg.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 400,
      height: 170,
      right: 400,
      bottom: 170,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return svg;
}

describe("Ruler", () => {
  it("draws the numbers, the unit and a still ruler when there is no control", () => {
    render(<Ruler geometry={cm} height={170} top={126} unit="cm" zero={0} />);
    const marks = screen.getAllByTestId("ruler-mark");
    expect(marks).toHaveLength(81);
    expect(marks.filter((m) => m.dataset["kind"] === "number")).toHaveLength(9);
    expect(screen.getByText("cm")).toBeTruthy();
    expect(screen.getByTestId("ruler").getAttribute("role")).toBe("img");
  });

  it("draws the zero in ink like every number, and a grip of 2 × 3 dots before it (Enter addendum 3.8)", () => {
    render(<Ruler geometry={cm} height={170} top={126} unit="cm" zero={120} />);
    const zero = must(screen.getAllByTestId("ruler-mark")[0]);
    expect(zero.querySelector("line")?.getAttribute("class")).toBe("stroke-foreground");
    expect(zero.querySelector("text")?.getAttribute("class")).toBe("fill-foreground");
    expect(document.querySelector('[class*="primary"]')).toBeNull();
    const dots = [...screen.getByTestId("ruler-grip").querySelectorAll("circle")];
    expect(dots).toHaveLength(6);
    expect(
      dots.every(
        (d) => d.getAttribute("class") === "fill-muted-foreground" && d.getAttribute("r") === "2.2",
      ),
    ).toBe(true);
    // Before the zero, on the body, two columns 7 apart.
    const xs = [...new Set(dots.map((d) => Number(d.getAttribute("cx"))))];
    expect(xs).toEqual([100, 107]);
    expect(xs.every((x) => x < 120 && x > rulerBox(120, cm).x)).toBe(true);
  });

  it("draws a 3 px focus outline 3 px out on keyboard focus, not the browser ring (dl-zz13.3)", () => {
    const control = { zero: 0, onMove: vi.fn(), label: "Ruler", valueText: "0 cm" };
    render(<Ruler geometry={cm} height={170} top={126} unit="cm" zero={0} control={control} />);
    const cls = must(screen.getByTestId("ruler").getAttribute("class")).split(" ");
    expect(cls).toEqual(
      expect.arrayContaining([
        "outline-none",
        "focus-visible:outline-[0.1875rem]!",
        "focus-visible:outline-offset-[0.1875rem]!",
        "focus-visible:outline-ring!",
      ]),
    );
  });

  it("a tap away from the ruler places its zero there, a press on it drags, and arrows nudge", () => {
    const onMove = vi.fn();
    const control = { zero: 0, onMove, label: "Ruler", valueText: "0 cm" };
    render(<Ruler geometry={cm} height={170} top={126} unit="cm" zero={0} control={control} />);
    const svg = laidOut();
    expect(svg.getAttribute("role")).toBe("slider");
    expect(svg.getAttribute("aria-valuemax")).toBe("360");
    // The ruler sits at 0 to 336 px; a tap at 380 is off it and places the zero there, clamped and snapped.
    fireEvent.pointerDown(svg, { clientX: 380, pointerId: 1 });
    expect(onMove).toHaveBeenLastCalledWith(360);
    fireEvent.pointerUp(svg, { pointerId: 1 });
    // A press on the ruler at 100 keeps the offset: moving to 142 slides the zero to 42, snapped to 44.
    fireEvent.pointerDown(svg, { clientX: 100, pointerId: 2 });
    fireEvent.pointerMove(svg, { clientX: 142, pointerId: 2 });
    expect(onMove).toHaveBeenLastCalledWith(44);
    fireEvent.pointerUp(svg, { pointerId: 2 });
    fireEvent.keyDown(svg, { key: "ArrowRight" });
    expect(onMove).toHaveBeenLastCalledWith(4);
    fireEvent.keyDown(svg, { key: "ArrowRight", shiftKey: true });
    expect(onMove).toHaveBeenLastCalledWith(40);
    fireEvent.keyDown(svg, { key: "ArrowLeft" });
    expect(onMove).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(svg, { key: "Home" });
    expect(onMove).toHaveBeenLastCalledWith(0);
  });
});
