import { FIXED_NOW } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { requestFor, runId } from "../testing/context.ts";
import { GuardedMuse, InMemoryMuseLedger, laneOf, MuseRefused } from "./guarded.ts";
import { ScriptedMuse } from "./scripted.ts";

function guarded(costs: readonly number[], lane_cap_usd = 1) {
  const inner = new ScriptedMuse(costs.map((cost_usd) => ({ text: "ok", cost_usd })));
  const ledger = new InMemoryMuseLedger();
  return {
    inner,
    ledger,
    muse: new GuardedMuse(inner, { ledger, lane_cap_usd, now: () => FIXED_NOW }),
  };
}

describe("GuardedMuse keeps jw.muse.ask's contract", () => {
  it("writes one ledger row per call, carrying the run id", async () => {
    const { muse, ledger } = guarded([0.02, 0.03]);
    const run = runId();
    await muse.respond(requestFor(run, 1));
    await muse.respond(requestFor(run, 2));
    expect(ledger.rows.map((r) => [r.run_id, r.call_no, r.tag, r.response_id, r.cost_usd])).toEqual(
      [
        [run, 1, "product:lesson-compose", "resp_1", 0.02],
        [run, 2, "product:lesson-compose", "resp_2", 0.03],
      ],
    );
    expect(ledger.rows[0]?.at).toBe(FIXED_NOW.toISOString());
    expect(await ledger.spent("product")).toBeCloseTo(0.05, 9);
  });

  it("refuses an untagged call and an empty cache key before anything is sent", async () => {
    const { muse, inner, ledger } = guarded([0.02]);
    const run = runId();
    await expect(muse.respond(requestFor(run, 1, ""))).rejects.toMatchObject({ type: "untagged" });
    await expect(
      muse.respond({ ...requestFor(run, 1), prompt_cache_key: "" }),
    ).rejects.toBeInstanceOf(MuseRefused);
    expect(inner.calls).toHaveLength(0);
    expect(ledger.rows).toHaveLength(0);
  });

  it("checks the lane's spend before the call and refuses at the cap", async () => {
    const { muse, inner } = guarded([0.6, 0.6, 0.6], 1);
    const run = runId();
    await muse.respond(requestFor(run, 1));
    await muse.respond(requestFor(run, 2)); // 0.6 < 1 before it: sent, and it overspends
    await expect(muse.respond(requestFor(run, 3))).rejects.toMatchObject({ type: "budget" });
    expect(inner.calls).toHaveLength(2);
    // Another lane has its own spend.
    await expect(muse.respond(requestFor(run, 3, "bank:explain"))).resolves.toMatchObject({
      response_id: "resp_3",
    });
  });

  it("reads a tag's lane as jw.muse.lane_of does", () => {
    expect(laneOf("product:lesson-compose")).toBe("product");
  });
});
