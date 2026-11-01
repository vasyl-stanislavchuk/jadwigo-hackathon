import { RunEvent, RunStatus } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { budgetGuard, deadlineDue, foldRun, mergeLive } from "./index.ts";

/**
 * The fold held to the golden run logs (frozen by step 0, dl-z5ja.12). The fold lane (dl-z5ja.13)
 * writes the bodies and removes each name below as its test turns green: a name left here runs as
 * `it.fails`, so a test that starts passing fails until its name goes. The set ends empty.
 */
const EXPECTED_RED = new Set<string>([]);

/** `it`, or `it.fails` while the name is in EXPECTED_RED. */
function frozen(name: string, body: () => void): void {
  (EXPECTED_RED.has(name) ? it.fails : it)(name, body);
}

const parsed = RUN_LOGS.map((log) => ({ ...log, events: RunEvent.array().parse(log.events) }));

describe("foldRun, the golden run logs", () => {
  for (const log of parsed) {
    frozen(`fold: ${log.name}`, () => expect(foldRun(log.events)).toEqual(log.expected));
  }
});

describe("deadlineDue, the 2 clocks", () => {
  const checks = parsed.flatMap((log) => log.deadlines ?? []);
  it("has its checks", () => expect(checks.length).toBeGreaterThanOrEqual(7));
  for (const c of checks) {
    frozen(`deadlineDue: ${c.about}`, () => {
      const run = {
        status: RunStatus.parse(c.run.status),
        idle_deadline_at: c.run.idle_deadline_at,
        max_deadline_at: c.run.max_deadline_at,
      };
      expect(deadlineDue(run, new Date(c.now))).toBe(c.due);
    });
  }
});

describe("budgetGuard", () => {
  frozen("budgetGuard: none below half, steer from half, stop from 90%", () => {
    expect(budgetGuard(0, 1)).toBe("none");
    expect(budgetGuard(0.49, 1)).toBe("none");
    expect(budgetGuard(0.5, 1)).toBe("steer");
    expect(budgetGuard(0.89, 1)).toBe("steer");
    expect(budgetGuard(0.9, 1)).toBe("stop");
    expect(budgetGuard(1.2, 1)).toBe("stop");
  });
  frozen("budgetGuard: an unknown spend is stop", () => {
    expect(budgetGuard(null, 1)).toBe("stop");
    expect(budgetGuard(undefined, 1)).toBe("stop");
    expect(budgetGuard(Number.NaN, 1)).toBe("stop");
  });
});

describe("mergeLive", () => {
  const name =
    "mergeLive: a reload's buffer and fetch fold like the log, with no gap and no duplicate";
  frozen(name, () => {
    const log = parsed.find((l) => l.name === "reload-with-duplicates");
    if (!log) throw new Error("reload-with-duplicates is missing");
    const merged = mergeLive(log.events.slice(4), log.events.slice(0, 7), 0);
    expect(merged.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(foldRun(merged)).toEqual(log.expected);
    expect(mergeLive(log.events, log.events, 3).map((e) => e.seq)).toEqual([4, 5, 6, 7]);
  });
});
