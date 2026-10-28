import { FEATURED_POD_ID } from "@jadwigo/contracts";
import { FEATURED_POD } from "@jadwigo/lesson-import";
import { describe, expect, it } from "vitest";

describe("the featured pod", () => {
  it("is the pod lesson import seeds the featured lessons into", () => {
    expect(FEATURED_POD_ID).toBe(FEATURED_POD.id);
  });
});
