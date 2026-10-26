import { describe, expect, it } from "vitest";
import { FAMILIES } from "./index.ts";

describe("FAMILIES", () => {
  it("has no duplicates", () => {
    expect(new Set(FAMILIES).size).toBe(FAMILIES.length);
  });
});
