import type { PageAttemptResult } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { summaryKey } from "./summary.ts";

const rows = (...ended: PageAttemptResult["ended"][]) => ended.map((e) => ({ ended: e }));

describe("summaryKey", () => {
  it("says every question went right when all are correct", () => {
    expect(summaryKey(rows("correct", "correct"))).toBe("play_summary_all");
  });

  it("says some are still to practise when one was missed or skipped", () => {
    expect(summaryKey(rows("correct", "missed"))).toBe("play_summary_some");
    expect(summaryKey(rows("skipped", "correct"))).toBe("play_summary_some");
  });

  it("says nothing while verdicts are held or with no questions", () => {
    expect(summaryKey(rows("done", "done"))).toBeNull();
    expect(summaryKey([])).toBeNull();
  });
});
