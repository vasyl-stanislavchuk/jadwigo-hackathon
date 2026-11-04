// The app's viewport (dl-uukj.29.176): on Android Chrome the page resizes above the system
// keyboard instead of being covered by it, and nothing stops a pinch zoom.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const content = /<meta\s+name="viewport"\s+content="([^"]+)"/.exec(html)?.[1] ?? "";

describe("the viewport meta", () => {
  it("resizes the page above an Android keyboard, at the device width", () => {
    const parts = content.split(",").map((p) => p.trim());
    expect(parts).toContain("width=device-width");
    expect(parts).toContain("interactive-widget=resizes-content");
    expect(content).not.toMatch(/user-scalable=no|maximum-scale/);
  });
});
