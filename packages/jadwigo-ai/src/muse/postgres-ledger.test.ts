import type { RunWorkflow } from "@jadwigo/contracts/run";
import { FIXED_NOW } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { requestFor, runId } from "../testing/context.ts";
import { GuardedMuse, MuseRefused } from "./guarded.ts";
import { PostgresMuseLedger } from "./postgres-ledger.ts";
import { ScriptedMuse } from "./scripted.ts";

/** A store that answers a fixed spend and records what it was asked. */
function spending(spent: number) {
  const asked: { workflows: readonly RunWorkflow[]; since: string }[] = [];
  return {
    asked,
    store: {
      spentUsd: (workflows: readonly RunWorkflow[], since: string) => {
        asked.push({ workflows, since });
        return Promise.resolve(spent);
      },
    },
  };
}

describe("PostgresMuseLedger (dl-z5ja.89)", () => {
  it("reads a lane's spend from the store, for its workflows, since the UTC day began", async () => {
    const { store, asked } = spending(0.25);
    const ledger = new PostgresMuseLedger({ store, now: () => FIXED_NOW });
    expect(await ledger.spent("product")).toBe(0.25);
    expect(asked).toEqual([
      { workflows: ["jadwigo-lesson-compose"], since: "2026-09-01T00:00:00.000Z" },
    ]);
  });

  it("reads an unknown lane as NaN, so GuardedMuse refuses it with nothing sent", async () => {
    const { store, asked } = spending(0);
    const ledger = new PostgresMuseLedger({ store, now: () => FIXED_NOW });
    expect(await ledger.spent("toString")).toBeNaN();
    const inner = new ScriptedMuse([{ text: "ok", cost_usd: 0.01 }]);
    const muse = new GuardedMuse(inner, { ledger, lane_cap_usd: 1, now: () => FIXED_NOW });
    await expect(muse.respond(requestFor(runId(), 1, "bank:search"))).rejects.toMatchObject({
      type: "budget",
    });
    expect(inner.calls).toHaveLength(0);
    expect(asked).toEqual([]);
  });

  it("holds the lane's cap from what every run logged, whichever process logged it", async () => {
    const { store } = spending(1);
    const inner = new ScriptedMuse([{ text: "ok", cost_usd: 0.01 }]);
    const ledger = new PostgresMuseLedger({ store, now: () => FIXED_NOW });
    const muse = new GuardedMuse(inner, { ledger, lane_cap_usd: 1, now: () => FIXED_NOW });
    await expect(muse.respond(requestFor(runId(), 1))).rejects.toBeInstanceOf(MuseRefused);
    expect(inner.calls).toHaveLength(0);
  });

  it("writes nothing of its own: the run's model_response event is the row", async () => {
    const { store, asked } = spending(0);
    const inner = new ScriptedMuse([{ text: "ok", cost_usd: 0.01 }]);
    const ledger = new PostgresMuseLedger({ store, now: () => FIXED_NOW });
    const muse = new GuardedMuse(inner, { ledger, lane_cap_usd: 1, now: () => FIXED_NOW });
    await muse.respond(requestFor(runId(), 1));
    expect(inner.calls).toHaveLength(1);
    expect(asked).toHaveLength(1);
  });
});
