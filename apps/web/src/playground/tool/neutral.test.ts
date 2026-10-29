/**
 * The playground's tools are neutral, only the lesson takes a theme (dl-uukj.29.22). Read from the
 * stylesheets as written: the neutral palette covers every colour the tools use, in light and dark,
 * with readable pairs and no hue; the chrome keeps its compact type and radii though Zeszyt sits at
 * :root (dl-uukj.32); and a lesson surface takes Zeszyt's aliases back.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const STYLES = join(import.meta.dirname, "../../../../../packages/ui/src/styles");
const NEUTRAL = readFileSync(join(import.meta.dirname, "neutral.css"), "utf-8");
const FOUNDATION = readFileSync(join(STYLES, "foundation.css"), "utf-8");
const TAILWIND = readFileSync(join(STYLES, "tailwind.css"), "utf-8");

function block(css: string, head: string): Record<string, string> {
  const at = css.indexOf(head);
  expect(at, head).toBeGreaterThanOrEqual(0);
  const body = css.slice(at, css.indexOf("}", at));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]),
  );
}

const light = block(NEUTRAL, "html[data-playground] {");
const dark = block(NEUTRAL, 'html[data-playground][theme="dark"] {');
/** Every colour utility tailwind.css names, except the kid feedback colours, which stay the lesson's. */
const UTILITIES = [...TAILWIND.matchAll(/^\s*--color-(?!kid-|jw-)([\w-]+):/gm)].map((m) => m[1]);

function channels(hex: string): [number, number, number] {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map(
    (i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  return [r, g, b];
}

function saturation(hex: string): number {
  const rgb = channels(hex);
  return Math.max(...rgb) - Math.min(...rgb);
}

/** The WCAG 2 contrast ratio of two #rrggbb colours, from 1 to 21. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string): number => {
    const [r, g, b] = channels(hex).map((s) =>
      s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  };
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("the neutral playground", () => {
  it("sets every colour the tools use, in light and dark", () => {
    expect(UTILITIES.length).toBeGreaterThanOrEqual(20);
    for (const name of UTILITIES) {
      if (name === undefined) continue;
      expect(light[name], `light --${name}`).toMatch(/^#/);
      expect(dark[name], `dark --${name}`).toMatch(/^#/);
    }
  });

  it("is neutral: no hue anywhere, so no Grape purple in the tools", () => {
    for (const [name, hex] of [...Object.entries(light), ...Object.entries(dark)])
      expect(saturation(hex), `--${name} ${hex}`).toBeLessThan(0.02);
  });

  it.each([
    ["foreground", "background"],
    ["primary-foreground", "primary"],
    ["muted-foreground", "background"],
    ["muted-foreground", "muted"],
    ["sidebar-foreground", "sidebar"],
    ["sidebar-accent-foreground", "sidebar-accent"],
  ])("holds %s on %s to 4.5:1 in light and dark", (fg, bg) => {
    expect(contrast(light[fg] ?? "", light[bg] ?? "")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark[fg] ?? "", dark[bg] ?? "")).toBeGreaterThanOrEqual(4.5);
  });

  it("outranks :root on <html>, and gives the lesson Zeszyt's aliases back on every lesson surface", () => {
    expect(NEUTRAL).not.toContain("[data-tool-surface]");
    // The aliases' head: Zeszyt declares them on :root, again on every nested theme, and again on
    // every lesson, so a lesson inside the chrome resolves its own roles, not the chrome's colours.
    const at = FOUNDATION.indexOf("--primary: var(--jw-focus);");
    const open = FOUNDATION.lastIndexOf("{", at);
    const head = FOUNDATION.slice(FOUNDATION.lastIndexOf("}", open) + 1, open);
    const selectors = head
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split(",")
      .map((x) => x.trim());
    expect(selectors).toEqual([":root", ":host", "[theme]", "[data-lesson-theme]"]);
  });

  // Zeszyt's aliases at :root set the lesson's font, its 16 px corners, no shadows and its slower
  // step; the chrome sets its own back on <html>, which outranks :root.
  it("keeps the chrome's own type, radii, shadows and motion", () => {
    const at = NEUTRAL.indexOf("html[data-playground] {");
    const body = NEUTRAL.slice(at, NEUTRAL.indexOf("}", at));
    const set = Object.fromEntries(
      [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], (m[2] ?? "").trim()]),
    );
    expect(set["font-sans"]).toMatch(/^"Inter"/);
    expect(set["radius"]).toBe("0.5rem");
    for (const name of [
      "radius-sm",
      "radius-lg",
      "radius-xl",
      "radius-2xl",
      "shadow-xs",
      "shadow-sm",
      "shadow-elevation",
      "duration-slow",
    ])
      expect(set[name], `--${name}`).toBeDefined();
    expect(set["shadow-sm"]).not.toBe("none");
  });
});
