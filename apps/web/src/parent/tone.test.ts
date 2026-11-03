import { describe, expect, it } from "vitest";
import { learnerTone } from "./tone.ts";

const learners = [
  { id: "lrn_b", created_at: "2026-11-02T10:00:00Z" },
  { id: "lrn_a", created_at: "2026-11-01T10:00:00Z" },
  { id: "lrn_c", created_at: "2026-11-03T10:00:00Z" },
];

describe("learnerTone", () => {
  it("is the child's place by when it was added, whatever the list's order", () => {
    expect(learners.map((l) => learnerTone(learners, l.id))).toEqual([1, 0, 2]);
  });

  it("gives an unknown child the first tone", () => {
    expect(learnerTone(learners, "lrn_x")).toBe(0);
  });
});
