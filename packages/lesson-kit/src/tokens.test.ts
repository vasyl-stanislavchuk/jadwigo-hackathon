// Colour and size come from Zeszyt's tokens (packages/ui/src/styles) through their utilities: no
// literal colour, no pixel or rem size, no palette class and no var() in a part, a family view or the
// stage. The rules are @jadwigo/testing's (dl-uukj.32, grown from this file's first version, ported
// from david-learns frontend/src/levels.test.ts); the allowlist beside this file is what the kit lane
// is still removing, and NumberLineSvg's SVG units stay with their reason.
import { join } from "node:path";
import { checkTokens } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";

const report = checkTokens(import.meta.dirname, join(import.meta.dirname, "tokens.allow.json"));

describe("colour and size come from the tokens", () => {
  it("finds the sources it checks", () => {
    expect(report.checked).toBeGreaterThan(100);
  });
  it("has no violation the allowlist does not name", () => {
    expect(report.unlisted).toEqual([]);
  });
  it("lists only what is still there", () => {
    expect(report.stale).toEqual([]);
  });
});
