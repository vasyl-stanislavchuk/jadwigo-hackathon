/**
 * The clock face's numerals (dl-w3.61): each is drawn where clock.ts FACE says, in the face's own
 * units and font size, so no numeral meets a tick at any size the face renders (it scales as one
 * viewBox, and no CSS class may resize the numerals).
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClockFace } from "./ClockFace.tsx";
import { CAP_HEIGHT, FACE, numeralReach } from "./clock.ts";

afterEach(cleanup);

describe("the clock face numerals", () => {
  it("sit on the numeral circle, inside the hour ticks, at the face font size", () => {
    render(<ClockFace hands={{ hourAt: 0, minute: 0 }} label="Zegar" />);
    const svg = screen.getByTestId("clock-face");
    expect(svg.getAttribute("viewBox")).toBe(`0 0 ${FACE.size} ${FACE.size}`);
    const numbers = screen.getAllByTestId("clock-number");
    expect(numbers).toHaveLength(12);
    const c = FACE.size / 2;
    for (const el of numbers) {
      const n = Number(el.textContent);
      expect(Number(el.getAttribute("font-size"))).toBe(FACE.font);
      expect(el.getAttribute("class") ?? "").not.toMatch(/\btext-(xs|sm|base|lg|xl|\d?xl|\[)/);
      const x = Number(el.getAttribute("x"));
      const midY = Number(el.getAttribute("y")) - (CAP_HEIGHT * FACE.font) / 2;
      expect(Math.hypot(x - c, midY - c)).toBeCloseTo(FACE.numberR, 5);
      expect(numeralReach(n)).toBeLessThan(FACE.hourTickIn);
    }
  });
});
