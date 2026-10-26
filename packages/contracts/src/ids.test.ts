import { describe, expect, it } from "vitest";
import { z } from "zod";
import { LearnerId } from "./ids.ts";

describe("LearnerId", () => {
  it("parses a valid id, refuses others, and keeps its JSON Schema snapshot", async () => {
    expect(LearnerId.parse("lrn_0123456789ab")).toBe("lrn_0123456789ab");
    expect(LearnerId.safeParse("lrn_UPPER").success).toBe(false);
    // The contract gate: a change to the wire shape fails here until the snapshot is updated
    // on purpose (vitest -u) and reviewed in the PR.
    await expect(`${JSON.stringify(z.toJSONSchema(LearnerId), null, 2)}\n`).toMatchFileSnapshot(
      "../schemas/learner-id.json",
    );
  });
});
