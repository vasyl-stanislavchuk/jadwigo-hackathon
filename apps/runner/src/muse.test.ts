import { RunId } from "@jadwigo/contracts/run";
import { CONTRIBUTOR_MODEL, MuseRefused } from "@jadwigo/jadwigo-ai";
import { FIXED_NOW } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import type { MuseConfig } from "./config.ts";
import { liveMuse } from "./muse.ts";

const REQUEST = {
  run_id: RunId.parse("run_0000000000000000000000000a"),
  call_no: 1,
  tag: "product:lesson-compose",
  prompt_cache_key: "jadwigo-lesson-compose:1",
  tier: "private" as const,
  instructions: "Say hello.",
  input: [],
  tools: [],
  names: [],
};

const CONTRIBUTOR: MuseConfig = {
  api_key: "a-key",
  lane_cap_usd: 1,
  tier: "contributor",
  private_model: null,
};

/** A fetch that records each body it was sent and answers nothing: no network in a unit test. */
function recorder() {
  const bodies: Record<string, unknown>[] = [];
  return {
    bodies,
    runtime: {
      fetch: (_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)));
        return Promise.resolve(new Response("refused", { status: 400 }));
      },
      now: () => FIXED_NOW,
      sleep: () => Promise.resolve(),
    },
  };
}

describe("the host's model", () => {
  it("answers a contributor-tier request with the contributor model", async () => {
    const r = recorder();
    await expect(
      liveMuse(CONTRIBUTOR, r.runtime).respond({ ...REQUEST, tier: "contributor" }),
    ).rejects.toThrow();
    expect(r.bodies[0]?.["model"]).toBe(CONTRIBUTOR_MODEL);
  });

  // dl-uafq (accepted 2026-11-01): while no private model is named, the contributor model
  // serves a private-tier request too (#478); before, it was refused with nothing sent.
  it("serves a private-tier request with the contributor model while no private model is named", async () => {
    const r = recorder();
    await expect(liveMuse(CONTRIBUTOR, r.runtime).respond(REQUEST)).rejects.toThrow();
    expect(r.bodies).toHaveLength(1);
    expect(r.bodies[0]?.["model"]).toBe(CONTRIBUTOR_MODEL);
  });

  // dl-z5ja.101: a named private model is used only once HttpMuse's PRICES holds its price, and
  // the host passes no prices of its own, so a named but unpriced one still gets the contributor.
  it("serves a private-tier request with the contributor model while the named one has no price", async () => {
    const r = recorder();
    const named: MuseConfig = { ...CONTRIBUTOR, tier: "private", private_model: "m" };
    await expect(liveMuse(named, r.runtime).respond(REQUEST)).rejects.toThrow();
    expect(r.bodies).toHaveLength(1);
    expect(r.bodies[0]?.["model"]).toBe(CONTRIBUTOR_MODEL);
  });

  it("refuses an untagged call in GuardedMuse, before anything is sent", async () => {
    const r = recorder();
    await expect(
      liveMuse(CONTRIBUTOR, r.runtime).respond({ ...REQUEST, tag: "untagged" }),
    ).rejects.toBeInstanceOf(MuseRefused);
    expect(r.bodies).toEqual([]);
  });

  // dl-z5ja.89: with the host's store, the lane's spend is what every run logged today, so the
  // cap holds across cold starts.
  it("reads the lane's spend from the host's store, and refuses at the cap with nothing sent", async () => {
    const r = recorder();
    const asked: string[] = [];
    const store = {
      spentUsd: (_workflows: readonly unknown[], since: string) => {
        asked.push(since);
        return Promise.resolve(CONTRIBUTOR.lane_cap_usd);
      },
    };
    await expect(
      liveMuse(CONTRIBUTOR, r.runtime, store).respond({ ...REQUEST, tier: "contributor" }),
    ).rejects.toMatchObject({ type: "budget" });
    expect(r.bodies).toEqual([]);
    expect(asked[0]).toBe("2026-09-01T00:00:00.000Z");
  });
});
