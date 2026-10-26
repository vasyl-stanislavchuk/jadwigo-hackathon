import { describe, expect, it } from "vitest";
import { isBankSource } from "./index.ts";

describe("isBankSource", () => {
  it("knows the three sources and nothing else", () => {
    expect(["fixture", "local", "remote", "git"].map(isBankSource)).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });
});
