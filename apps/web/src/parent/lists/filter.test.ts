import type { Learner } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { childSlugs, inPreset } from "./filter.ts";

const learner = (id: string, first_name: string) => ({ id, first_name }) as unknown as Learner;

describe("the lists' facets", () => {
  // Wednesday 2026-11-04, noon local time.
  const now = new Date(2026, 10, 4, 12);

  it("holds today, this week from Monday and this month", () => {
    const at = (d: number, h = 9) => new Date(2026, 10, d, h).toISOString();
    expect(inPreset(at(4), "dzis", now)).toBe(true);
    expect(inPreset(at(3, 23), "dzis", now)).toBe(false);
    expect(inPreset(at(2), "tydzien", now)).toBe(true);
    expect(inPreset(new Date(2026, 10, 1, 23).toISOString(), "tydzien", now)).toBe(false);
    expect(inPreset(at(1), "miesiac", now)).toBe(true);
    expect(inPreset(new Date(2026, 9, 31, 23).toISOString(), "miesiac", now)).toBe(false);
  });

  it("names each child by its id, never by a name", () => {
    const slugs = childSlugs([learner("lrn_a", "Żółw Ola"), learner("lrn_b", "Kuba")]);
    expect([...slugs.values()]).toEqual(["lrn_a", "lrn_b"]);
  });
});
