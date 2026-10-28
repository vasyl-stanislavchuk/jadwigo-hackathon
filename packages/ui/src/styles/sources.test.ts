// Tailwind generates a class only where it finds it in a scanned file, and it skips node_modules,
// where the workspace packages are linked. tailwind.css names the packages whose classes it must
// see; without them a part's classes (a clock face's fill, a ring's stroke) are never generated
// and the part draws black. Component tests run without Tailwind, so only this test notices.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = import.meta.dirname;
const sources = [
  ...readFileSync(join(DIR, "tailwind.css"), "utf8").matchAll(/@source "([^"]+)";/g),
].map((m) => m[1] ?? "");

describe("tailwind.css scans the packages whose classes it styles", () => {
  it("names lesson-kit's and ui's sources", () => {
    expect(sources).toContain("../../../lesson-kit/src");
    expect(sources).toContain("..");
  });

  it.each(sources)("%s exists", (source) => {
    expect(existsSync(join(DIR, source))).toBe(true);
  });
});
