import { PlanStatus, VerbName } from "@jadwigo/contracts/run";
import { movePlan } from "@jadwigo/jadwigo-ai";
import { describe, expect, it } from "vitest";
import { movePlanPort } from "./spineOf.ts";

/**
 * spineOf ports the engine's movePlan (packages/jadwigo-ai/src/run/plan.ts) to tell a result's own
 * end move from the end-of-turn settle (dl-uukj.47.71.36). This runs both over every verb, every
 * status and every plan of 3 stages, so a change to the engine's rule fails here first.
 */
describe("movePlanPort matches the engine's movePlan", () => {
  const statuses = PlanStatus.options;
  const plans = statuses.flatMap((a) =>
    statuses.flatMap((b) => statuses.map((c) => [a, b, c] as const)),
  );
  const named = (marks: readonly PlanStatus[]) =>
    marks.map((status, i) => ({ text: `Etap ${i + 1}`, status }));

  it.each(VerbName.options)("for %s, on every plan and status", (verb) => {
    for (const marks of plans)
      for (const status of statuses) {
        const engine = movePlan(named(marks), verb, status);
        const port = movePlanPort(named(marks), verb, status);
        expect(port).toEqual(engine === null ? null : engine.map((e) => e.status));
      }
  });

  it("answers null without a plan, as the engine does", () => {
    expect(movePlanPort(null, "lesson_check", "done")).toBe(movePlan(null, "lesson_check", "done"));
  });
});
