/**
 * A cell's gap holds its digits centred (Slots addendum 4.5, 10; dl-uukj.29.132): gapFit sets the
 * centring, and the field's box (InlineField.tsx `FIELD_BOX`) reads it through the three variables.
 */

import { describe, expect, it } from "vitest";
import { gapFit } from "./gapFit.ts";
import { FIELD_BOX } from "./InlineField.tsx";

describe("a gap in a cell is centred", () => {
  it("gapFit asks for the centre", () => {
    expect(gapFit("6.5rem", "4rem")).toMatchObject({
      "--gap-justify": "center",
      "--gap-align": "center",
      "--gap-px": "0",
    });
  });

  it("the field box reads the centring through its variables", () => {
    expect(FIELD_BOX).toContain("--gap-justify");
    expect(FIELD_BOX).toContain("--gap-align");
    expect(FIELD_BOX).toContain("--gap-px");
  });
});
