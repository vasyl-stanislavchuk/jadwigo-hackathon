/**
 * The week strip's counts and the page's words, from the fixtures: weeks run Monday to Sunday in
 * Warsaw, a skill that moved forward is counted once in its attempt's week, a move back is not
 * counted, and a week no report ended in has no attention count.
 */

import { describe, expect, it } from "vitest";
import { ADD_10, ADD_20, ATTEMPTS, GROUPS, REPORTS, SKILLS, TAKE_AWAY } from "./fixtures.ts";
import { mondayOf, weeksOf } from "./weeks.ts";
import { readable, skillLine } from "./words.ts";

describe("mondayOf", () => {
  it("starts the week on Monday in Warsaw, not in UTC", () => {
    expect(mondayOf("2026-08-30T21:30:00.000Z")).toBe("2026-08-24");
    expect(mondayOf("2026-08-30T22:30:00.000Z")).toBe("2026-08-31");
    expect(mondayOf("2026-09-06T12:00:00.000Z")).toBe("2026-08-31");
  });
});

describe("weeksOf", () => {
  it("counts the last 4 weeks, oldest first, from the attempts and the digests", () => {
    expect(weeksOf(ATTEMPTS.attempts, REPORTS.reports, new Date())).toEqual([
      { monday: "2026-08-10", lessons: 1, movedUp: 1, attention: null },
      { monday: "2026-08-17", lessons: 1, movedUp: 0, attention: null },
      { monday: "2026-08-24", lessons: 1, movedUp: 1, attention: 0 },
      { monday: "2026-08-31", lessons: 1, movedUp: 0, attention: 1 },
    ]);
  });

  it("counts a skill once a week, however many reports carry its move", () => {
    const twice = [REPORTS.reports[0], REPORTS.reports[0]].filter((r) => r !== undefined);
    const weeks = weeksOf(ATTEMPTS.attempts, twice, new Date());
    expect(weeks.map((w) => w.movedUp)).toEqual([0, 0, 1, 0]);
  });

  it("is all zeros and no reports for a learner with nothing yet", () => {
    expect(weeksOf([], [], new Date(), 2)).toEqual([
      { monday: "2026-08-24", lessons: 0, movedUp: 0, attention: null },
      { monday: "2026-08-31", lessons: 0, movedUp: 0, attention: null },
    ]);
  });
});

describe("skillLine", () => {
  it("reads a reviewed line, else the code made readable", () => {
    expect(skillLine(ADD_10, SKILLS.catalogue, "pl")).toBe("Dodaje w zakresie 10.");
    expect(skillLine(ADD_10, SKILLS.catalogue, "en")).toBe("Adds within 10.");
    // A draft line is never shown.
    expect(skillLine(ADD_20, SKILLS.catalogue, "pl")).toBe("Within 20");
    expect(skillLine(TAKE_AWAY, SKILLS.catalogue, "pl")).toBe("Take away to 10");
    expect(readable(GROUPS)).toBe("Equal groups");
  });

  it("finds a skill by an alias", () => {
    const aliased = SKILLS.catalogue
      .map((s) => (s.code === ADD_10 ? { ...s, aliases: [GROUPS] } : s))
      .filter((s) => s.code !== GROUPS);
    expect(skillLine(GROUPS, aliased, "en")).toBe("Adds within 10.");
  });
});
