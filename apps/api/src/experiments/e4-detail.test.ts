import { describe, expect, it } from "vitest";
import { E4_DAY, e4Detail, type MuseRow, stepOf, taskOf } from "./e4-detail.ts";

/** A made-up log call: its tag, its day and what it cost. */
const row = (tag: string | null, at: string, usd: number, seconds = 10): MuseRow => ({
  tag,
  model: "muse-spark-1.3-contributor",
  seconds,
  at,
  usage: { input_tokens: 100, cached_tokens: 0, output_tokens: 10, reasoning_tokens: 5, usd },
});
const BEFORE = "2026-10-31T14:00:00+00:00";

describe("e4Detail (dl-5ssh.90.53.6)", () => {
  it("names a call's step by its lane and its last part without the counter", () => {
    expect(stepOf("enrich:set_khan_x1:draft2")).toBe("enrich:draft");
    expect(stepOf("eval:golden:need-skill-001:intent")).toBe("eval:intent");
    expect(stepOf("filters:map:b07")).toBe("filters:b");
    expect(stepOf("product:smoke-explain")).toBe("product:smoke-explain");
    expect(stepOf("alt:12")).toBe("alt:(none)");
    expect(stepOf("items:set_khan_x1:0")).toBe("items:(none)");
    expect(stepOf("smoke-2026-10-28")).toBe("smoke-2026-10-28:(none)");
    expect(taskOf("eval:golden:need-skill-001:intent")).toBe("eval:golden");
  });

  it("counts the ledger before E4's day, steps by calls, and tasks of 10 calls or more apart", () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => row(`eval:golden:n${i}:skill`, BEFORE, 0.001, i)),
      row("enrich:set_a:draft1", BEFORE, 0.00005),
      row("enrich:set_a:draft2", BEFORE, 0.00005),
      row(null, BEFORE, 0),
      row("e4:set_b:draft", `${E4_DAY}T10:00:00+00:00`, 0.004),
    ];
    const detail = e4Detail(rows);
    expect(detail.ledger_before_e4).toEqual({
      rows: 13,
      contributor_calls: 13,
      input_tokens: 1300,
      output_tokens: 130,
      usd: 0.0101,
    });
    expect(Object.keys(detail.by_step)).toEqual([
      "eval:skill",
      "enrich:draft",
      "(untagged):(none)",
      "e4:draft",
    ]);
    expect(detail.by_task.tasks_with_10_plus_calls).toEqual({
      "eval:golden": {
        calls: 10,
        input_tokens: 1000,
        cached_tokens: 0,
        output_tokens: 100,
        reasoning_tokens: 50,
        usd: 0.01,
        seconds_total: 45,
        seconds_median: 4.5,
      },
    });
    // Each smaller task's cost is rounded first, as the ledger's full table rounds it.
    expect(detail.by_task.smaller_tasks).toMatchObject({ tasks: 3, calls: 4, usd: 0.0041 });
  });
});
