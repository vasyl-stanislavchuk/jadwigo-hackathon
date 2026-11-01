/**
 * Which family views draw the right answer beside a wrong one themselves (dl-uukj.30.7): every one
 * but Place on a picture, which marks only the child's points.
 */

import type { ReviewQuestion } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { drawsRightBeside } from "./Still.tsx";

const of = (family: string, data: object = {}) =>
  ({ question: { family, data } }) as unknown as Pick<ReviewQuestion, "question">;

describe("drawsRightBeside", () => {
  it("is true for the families whose still shows the right answer beside the child's", () => {
    for (const family of ["enter", "choose", "sequence", "group", "slots"]) {
      expect(drawsRightBeside(of(family))).toBe(true);
    }
    for (const surface of ["number_line", "grid", "bars", "clock", "coins", "fraction"]) {
      expect(drawsRightBeside(of("place", { surface }))).toBe(true);
    }
  });

  it("is false for Place on a picture, whose still marks only the child's points", () => {
    expect(drawsRightBeside(of("place", { surface: "image" }))).toBe(false);
  });
});
