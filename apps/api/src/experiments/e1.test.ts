import { readFileSync } from "node:fs";
import { join } from "node:path";
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
    const at = (name: string, day: number) =>
      learners.find((l) => l.profile === name)?.days[day]?.mean_level ?? 0;
    // The plateau stops growing after day 7; the keen learner keeps growing past it.
    expect(at("early-plateau", 20) - at("early-plateau", 9)).toBeLessThan(0.3);
    expect(at("new-and-keen", 20)).toBeGreaterThan(at("new-and-keen", 9));
    expect(at("slow-then-click", 20) - at("slow-then-click", 9)).toBeGreaterThan(0.5);
  });

  it("labels each day with its own date, from 2026-10-12", () => {
    const { learners } = buildCohort();
    expect(learners[0]?.days[0]?.date).toBe("2026-10-12");
    expect(learners[0]?.days[5]?.date).toBe("2026-10-17");
    expect(learners[0]?.days[20]?.date).toBe("2026-11-01");
  });

  it("matches the committed e1.json detail, apart from wall time and commit", () => {
    const path = join(import.meta.dirname, "../../../../apps/docs/src/data/experiments/e1.json");
    const committed = JSON.parse(readFileSync(path, "utf8")) as {
      detail: { learners: { profile: string; mastery: unknown; days: unknown }[] };
    };
    const { learners } = buildCohort();
    expect(committed.detail.learners.map((l) => [l.profile, l.mastery, l.days])).toEqual(
      learners.map((l) => [l.profile, l.mastery, l.days]),
    );
  });

  it("gives every learner a brief against the shared goal", () => {
    const { learners } = buildCohort();
    for (const learner of learners) {
      expect(learner.brief.school).toBe("nothing_recorded");
      expect(Array.isArray(learner.brief.entries)).toBe(true);
    }
  });
});
