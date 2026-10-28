/**
 * What is still missing from an answer (docs/17 §2f rule 8): the reason and the parts to mark.
 */

import { describe, expect, it } from "vitest";
import { missingBars, missingGaps, missingGroup, missingPlace, missingText } from "./complete.ts";
import { Family } from "./names.ts";

describe("missing parts", () => {
  it("Gaps names every gap still empty, spaces included", () => {
    const data = {
      template: "{g1} {g2}",
      gaps: [
        { id: "g1", kind: Family.Enter, input: "number" as const },
        { id: "g2", kind: Family.Enter, input: "text" as const },
      ],
    };
    expect(missingGaps(data, { gaps: { g1: "7", g2: " " } })).toEqual({
      reason: "incomplete_gaps",
      parts: ["g2"],
    });
    expect(missingGaps(data, { gaps: { g1: "7", g2: "x" } })).toBeNull();
  });

  it("Group names every card still in the tray", () => {
    const data = {
      groups: [{ id: "a", label: "A" }],
      items: [
        { id: "i1", label: "1" },
        { id: "i2", label: "2" },
      ],
      each_item: "one" as const,
    };
    expect(missingGroup(data, { items: { i1: ["a"] } })).toEqual({
      reason: "incomplete_group",
      parts: ["i2"],
    });
    expect(missingGroup(data, { items: { i1: ["a"], i2: ["a"] } })).toBeNull();
  });

  it("Place and text are missing as a whole", () => {
    expect(missingPlace(null)?.reason).toBe("incomplete_place");
    expect(missingPlace({ at: 3 })).toBeNull();
    // A graph: nothing drawn yet is missing; a bar left at 0 after a change is the learner's own (dl-w3.51.3).
    expect(missingBars(null)?.reason).toBe("incomplete_graph");
    expect(missingBars({ heights: { a: 0, b: 0 } })).toBeNull();
    expect(missingText("  ")?.reason).toBe("incomplete_text");
    expect(missingText("7")).toBeNull();
  });
});
