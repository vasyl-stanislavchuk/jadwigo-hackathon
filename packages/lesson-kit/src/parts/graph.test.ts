/**
 * The graph's geometry (dl-w3.51.3): heights snap to whole steps and never leave the graph, a
 * tap at a point lands on the nearest step, gridlines follow the tick, and a picture graph stacks
 * one mark per tick.
 */

import { describe, expect, it } from "vitest";
import {
  column,
  GRAPH_ICONS,
  type GraphData,
  gridValues,
  HEIGHT,
  heightAt,
  iconOf,
  labelEvery,
  marksOf,
  nudgeHeight,
  PLOT,
  yOf,
} from "./graph.ts";

const g: GraphData = {
  kind: "bar",
  categories: [
    { id: "a", label: "a" },
    { id: "b", label: "b" },
  ],
  max: 12,
  step: 1,
  tick: 2,
};

describe("a graph's geometry", () => {
  it("maps a height onto the plot: 0 at the baseline, max at the top", () => {
    expect(yOf(0, g)).toBe(PLOT.y1);
    expect(yOf(12, g)).toBe(PLOT.y0);
    expect(yOf(6, g)).toBe((PLOT.y0 + PLOT.y1) / 2);
  });

  it("a tap lands on the nearest step and stays inside the graph", () => {
    expect(heightAt(PLOT.y1 / HEIGHT, g)).toBe(0);
    expect(heightAt(PLOT.y0 / HEIGHT, g)).toBe(12);
    expect(heightAt(yOf(7.4, g) / HEIGHT, g)).toBe(7);
    expect(heightAt(1, g)).toBe(0);
    expect(heightAt(0, g)).toBe(12);
    // A step of a half: 0.1 + 0.1 + 0.1 never drifts.
    const halves: GraphData = { ...g, step: 0.5, tick: 1, max: 3 };
    expect(heightAt(yOf(2.6, halves) / HEIGHT, halves)).toBe(2.5);
  });

  it("an arrow press moves one step and stops at the ends", () => {
    expect(nudgeHeight(0, -1, g)).toBe(0);
    expect(nudgeHeight(11, 1, g)).toBe(12);
    expect(nudgeHeight(12, 1, g)).toBe(12);
    expect(nudgeHeight(5, 1, g)).toBe(6);
    expect(nudgeHeight(0.5, 1, { ...g, step: 0.5 })).toBe(1);
  });

  it("gridlines follow the tick, and a crowded axis labels every k-th line", () => {
    expect(gridValues(g)).toEqual([0, 2, 4, 6, 8, 10, 12]);
    expect(labelEvery(g)).toBe(1);
    const tall: GraphData = { ...g, max: 48, step: 1, tick: 1 };
    expect(gridValues(tall)).toHaveLength(49);
    expect(labelEvery(tall)).toBe(4);
  });

  it("columns share the plot width and the bar is three fifths of its column", () => {
    const a = column(0, 2);
    const b = column(1, 2);
    expect(a.x0).toBe(PLOT.x0);
    expect(b.x1).toBeCloseTo(PLOT.x1);
    expect(a.x1).toBeCloseTo(b.x0);
    expect(a.bar.w).toBeCloseTo(a.w * 0.6);
    expect(a.bar.x + a.bar.w / 2).toBeCloseTo(a.cx);
  });

  it("a picture graph stacks one mark per tick", () => {
    expect(marksOf(6, g)).toBe(3);
    expect(marksOf(0, g)).toBe(0);
    const { tick: _tick, ...untagged } = g;
    expect(marksOf(3, untagged)).toBe(3);
  });

  it("every named icon exists and the fallback is a square", () => {
    for (const [name, Icon] of Object.entries(GRAPH_ICONS))
      expect(typeof Icon, name).not.toBe("undefined");
    expect(iconOf({ icon: "apple" })).toBe(GRAPH_ICONS.apple);
    expect(iconOf(undefined)).toBe(GRAPH_ICONS.square);
    expect(iconOf({ src: "/x.png", alt: "x" })).toBe(GRAPH_ICONS.square);
  });
});
