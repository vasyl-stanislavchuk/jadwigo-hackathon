import type { RunEvent } from "@jadwigo/contracts/run";
import { describe, expect, it } from "vitest";
import { inWriteOrder } from "./give.ts";

/** An event of `run` at `seq`, written at `at`: only what the order reads, named by its call. */
function event(run: string, seq: number, at: string, call_id: string): RunEvent {
  return {
    type: "tool_result",
    run_id: run,
    seq,
    created_at: at,
    payload: { call_id },
  } as unknown as RunEvent;
}

const callsOf = (log: readonly RunEvent[]) =>
  log.map((e) => (e.payload as { call_id: string }).call_id);

describe("inWriteOrder", () => {
  it("keeps a turn's seq order when created_at runs against it (a patch that waited on the lock)", () => {
    // The check logged its pass at T2; the patch's unit started at T1 and waited on the run's lock,
    // so it holds the higher seq and the earlier created_at. It came after the check.
    const turn = [
      event("run_a", 1, "2026-11-02T18:00:02.000Z", "check"),
      event("run_a", 2, "2026-11-02T18:00:01.000Z", "patch"),
    ];
    expect(callsOf(inWriteOrder([turn]))).toEqual(["check", "patch"]);
  });

  it("interleaves turns by when they wrote, a later turn's check before an earlier turn's patch", () => {
    const one = [
      event("run_a", 1, "2026-11-02T18:00:00.000Z", "draft"),
      event("run_a", 2, "2026-11-02T18:00:05.000Z", "patch"),
    ];
    const two = [event("run_b", 1, "2026-11-02T18:00:03.000Z", "check")];
    expect(callsOf(inWriteOrder([one, two]))).toEqual(["draft", "check", "patch"]);
  });

  it("puts the earlier turn first in one millisecond, and reads no turn twice", () => {
    const at = "2026-11-02T18:00:00.000Z";
    const one = [event("run_a", 1, at, "a1"), event("run_a", 2, at, "a2")];
    const two = [event("run_b", 1, at, "b1")];
    expect(callsOf(inWriteOrder([one, two, []]))).toEqual(["a1", "a2", "b1"]);
  });
});
