// Colour and size come from Zeszyt's tokens through their utilities (dl-uukj.32): the shared check
// in @jadwigo/testing over every primitive and part, with the allowlist beside it.
import { join } from "node:path";
import { checkTokens } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";

const report = checkTokens(import.meta.dirname, join(import.meta.dirname, "tokens.allow.json"));

describe("colour and size come from the tokens", () => {
  it("finds the sources it checks", () => {
    expect(report.checked).toBeGreaterThan(10);
  });
  it("has no violation the allowlist does not name", () => {
    expect(report.unlisted).toEqual([]);
  });
  it("lists only what is still there", () => {
    expect(report.stale).toEqual([]);
  });
});
