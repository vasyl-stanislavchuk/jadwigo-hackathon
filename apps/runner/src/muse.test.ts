import { RunId } from "@jadwigo/contracts/run";
import { MuseRefused } from "@jadwigo/jadwigo-ai";
import { FIXED_NOW } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
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

describe("the host's model", () => {
  it("refuses a private-tier call before sending anything while no private model is named", async () => {
    const sent: string[] = [];
    const muse = liveMuse(
      { api_key: "a-key", lane_cap_usd: 1, private_model: null },
      {
        fetch: (url) => {
          sent.push(url);
          return Promise.reject(new Error("no network in a unit test"));
        },
        now: () => FIXED_NOW,
        sleep: () => Promise.resolve(),
      },
    );

    await expect(muse.respond(REQUEST)).rejects.toBeInstanceOf(MuseRefused);
    expect(sent).toEqual([]);
  });

  it("refuses an untagged call in GuardedMuse, before HttpMuse sees it", async () => {
    const muse = liveMuse(
      { api_key: "a-key", lane_cap_usd: 1, private_model: null },
      {
        fetch: () => Promise.reject(new Error("unused")),
        now: () => FIXED_NOW,
        sleep: () => Promise.resolve(),
      },
    );

    await expect(muse.respond({ ...REQUEST, tag: "untagged" })).rejects.toMatchObject({
      type: "untagged",
    });
  });
});
