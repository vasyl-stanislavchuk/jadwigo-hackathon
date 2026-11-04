import { RunId } from "@jadwigo/contracts/run";
import { describe, expect, it } from "vitest";
import { createRunnerHandler } from "./handler.ts";
import type { HostReport } from "./host.ts";

const REPORT: HostReport = {
  cold: true,
  loaded_ms: 5,
  steps: 2,
  outcomes: ["continue", "turn_complete"],
  events: 12,
  wall_ms: 300,
  cpu_ms: 80,
  stuck: { oldest_ready_step_age_s: null, runs_past_deadline: [] },
  failed: [],
  dead_letters: 0,
  max_wait_s: 1.5,
  runs: [],
  refused: [],
};
const RUN = "run_0000000000000000000000000a";

describe("the runner's Lambda handler", () => {
  it("drains on the api's poke and logs the run it was poked for, by id", async () => {
    const lines: string[] = [];
    let drains = 0;
    const handler = createRunnerHandler(
      () => {
        drains += 1;
        return Promise.resolve(REPORT);
      },
      (line) => lines.push(line),
    );

    expect(await handler({ run_id: RUN, attempt: 1 })).toEqual(REPORT);
    expect(drains).toBe(1);
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({
      runner: "drained",
      poked: RUN,
      steps: 2,
      outcomes: ["continue", "turn_complete"],
      runs_past_deadline: 0,
      max_wait_s: 1.5,
    });
  });

  it("drains on the schedule's empty event too, poked by nobody", async () => {
    const lines: string[] = [];
    const handler = createRunnerHandler(
      () => Promise.resolve(REPORT),
      (line) => lines.push(line),
    );

    await handler({});
    await handler(undefined);
    expect(lines.map((l) => JSON.parse(l).poked)).toEqual([null, null]);
  });

  it("logs the runs it worked and the calls refused, though nothing failed", async () => {
    const lines: string[] = [];
    const run_id = RunId.parse(RUN);
    const refused = [{ run_id, verb: "lesson_edit", type: "edit", count: 3 }] as const;
    await createRunnerHandler(
      () => Promise.resolve({ ...REPORT, runs: [run_id], refused }),
      (line) => lines.push(line),
    )({});

    expect(JSON.parse(lines[0] ?? "")).toMatchObject({
      failed: [],
      runs: [RUN],
      refused: [{ run_id: RUN, verb: "lesson_edit", type: "edit", count: 3 }],
    });
  });

  it("logs nothing a payload carries: only the keys it names", async () => {
    const lines: string[] = [];
    await createRunnerHandler(
      () => Promise.resolve(REPORT),
      (line) => lines.push(line),
    )({ run_id: RUN, attempt: 1, text: "a parent's words" });

    expect(lines.join("\n")).not.toContain("parent");
  });

  it("lets a failed drain throw, so the invoke is marked failed and the step stays queued", async () => {
    const handler = createRunnerHandler(
      () => Promise.reject(new Error("no database")),
      () => undefined,
    );

    await expect(handler({})).rejects.toThrow("no database");
  });

  it("reports a host that fails, and still fails the Lambda", async () => {
    const failure = new Error("no database");
    const reported: unknown[] = [];
    const handler = createRunnerHandler(
      () => Promise.reject(failure),
      () => {},
      async (error) => {
        reported.push(error);
      },
    );
    await expect(handler({})).rejects.toBe(failure);
    expect(reported).toHaveLength(1);
    const [sent] = reported as Error[];
    expect({ name: sent?.name, message: sent?.message }).toEqual({ name: "Error", message: "" });
    expect(sent?.stack).not.toContain("no database");
  });
});
