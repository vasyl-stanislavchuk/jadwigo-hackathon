/** FractionShape (dl-w3.61.7): equal parts drawn, shaded ones marked, and each a toggle when live. */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Clock, Instant } from "../stage/clock.ts";
import { FractionShape } from "./FractionShape.tsx";
import { must } from "./must.ts";

afterEach(cleanup);
const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-19T00:00:00.000Z" }) };

describe("FractionShape", () => {
  it("draws every bar as one whole of one size, however many parts it has (dl-w3.46.28)", () => {
    const box = (parts: number): string | null => {
      const { container } = render(
        <FractionShape shape="bar" parts={parts} shaded={new Set([0])} label="Pasek" />,
      );
      const viewBox = must(container.querySelector("svg")).getAttribute("viewBox");
      cleanup();
      return viewBox;
    };
    expect(box(2)).toBe(box(4));
    expect(box(3)).toBe(box(8));
  });

  it.each([
    ["bar", 4, undefined],
    ["circle", 6, undefined],
    ["rect", 6, 2],
  ] as const)("draws a %s in %i parts, still, as one picture", (shape, parts, rows) => {
    const { container } = render(
      <FractionShape
        shape={shape}
        parts={parts}
        rows={rows}
        shaded={new Set([0, 1])}
        label="Figura"
      />,
    );
    expect(screen.getByRole("img", { name: "Figura" })).not.toBeNull();
    expect(container.querySelectorAll("[data-part]").length).toBe(parts);
    expect(container.querySelectorAll('[data-shaded="yes"]').length).toBe(2);
    expect(screen.queryAllByRole("button")).toEqual([]);
  });

  it("toggles a part by tap and by Space or Enter", () => {
    const onToggle = vi.fn();
    render(
      <FractionShape
        shape="bar"
        parts={4}
        shaded={new Set([2])}
        label="Pasek"
        partLabel={(i) => `Część ${i + 1}`}
        interactive={{ clock, onToggle }}
      />,
    );
    fireEvent.pointerDown(screen.getByRole("button", { name: "Część 1" }), { button: 0 });
    fireEvent.keyDown(screen.getByRole("button", { name: "Część 2" }), { key: " " });
    fireEvent.keyDown(screen.getByRole("button", { name: "Część 4" }), { key: "Enter" });
    expect(onToggle.mock.calls.map((c) => [c[0], c[2]])).toEqual([
      [0, "click"],
      [1, "keyboard"],
      [3, "keyboard"],
    ]);
    expect(screen.getByRole("button", { name: "Część 3" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
});
