// Colour and size come from Zeszyt's tokens through their utilities (dl-uukj.32): the shared check
// in @jadwigo/testing, one allowlist per lane's directory, so the lanes shrink theirs apart.
import { join } from "node:path";
import { checkTokens } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";

const SRC = import.meta.dirname;

describe("colour and size come from the tokens", () => {
  for (const [dir, shallow] of [
    [".", true],
    ["play", false],
    ["review", false],
    ["parent", false],
    ["playground", false],
  ] as const) {
    const report = checkTokens(join(SRC, dir), join(SRC, dir, "tokens.allow.json"), { shallow });
    it(`${dir}: finds the sources it checks`, () => {
      expect(report.checked).toBeGreaterThan(0);
    });
    it(`${dir}: has no violation the allowlist does not name`, () => {
      expect(report.unlisted).toEqual([]);
    });
    it(`${dir}: lists only what is still there`, () => {
      expect(report.stale).toEqual([]);
    });
  }
});
