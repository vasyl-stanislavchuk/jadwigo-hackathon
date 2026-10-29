import { describe, expect, it } from "vitest";
import { handleFor } from "./handle.ts";

describe("handleFor", () => {
  it("makes a first name plain", () => {
    expect(handleFor("Żółw Łoś", new Set())).toBe("zolw-los");
    expect(handleFor("  Anne-Marie ", new Set())).toBe("anne-marie");
    expect(handleFor("!!!", new Set())).toBe("learner");
  });

  it("adds -2, -3 and so on when the pod holds it", () => {
    expect(handleFor("Fox", new Set(["fox"]))).toBe("fox-2");
    expect(handleFor("Fox", new Set(["fox", "fox-2"]))).toBe("fox-3");
  });
});
