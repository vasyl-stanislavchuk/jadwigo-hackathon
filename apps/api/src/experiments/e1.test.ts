import { describe, expect, it } from "vitest";
import { buildCohort, E1_DAYS, E1_PROFILES } from "./e1.ts";

describe("E1 cohort", () => {
  it("is deterministic and holds 12 invented learners over 21 days", () => {
    const a = buildCohort();
    const b = buildCohort();
    expect(JSON.stringify(a.learners.map((l) => l.mastery))).toBe(
      JSON.stringify(b.learners.map((l) => l.mastery)),
    );
    expect(a.learners).toHaveLength(E1_PROFILES.length);
    for (const learner of a.learners) {
      expect(learner.synthetic).toBe(true);
      expect(learner.days).toHaveLength(E1_DAYS);
      expect(learner.tries).toBeGreaterThan(20);
      expect(learner.mastery.length).toBeGreaterThan(0);
    }
  });

  it("separates the profiles: steady ends ahead of the guesser", () => {
    const { learners } = buildCohort();
    const mean = (name: string) =>
      learners.find((l) => l.profile === name)?.days.at(-1)?.mean_level ?? 0;
    expect(mean("steady")).toBeGreaterThan(mean("guesser"));
    expect(mean("new-and-keen")).toBeGreaterThan(mean("early-plateau") - 1);
  });

  it("gives every learner a brief against the shared goal", () => {
    const { learners } = buildCohort();
    for (const learner of learners) {
      expect(learner.brief.school).toBe("nothing_recorded");
      expect(Array.isArray(learner.brief.entries)).toBe(true);
    }
  });
});
