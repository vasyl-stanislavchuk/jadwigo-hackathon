import { describe, expect, it } from "vitest";
import { type Finding, type ItemResult, shapesOf, sidecarOf, summaryLines } from "./report.ts";

const finding = (rule: string, level: Finding["level"] = "error"): Finding => ({
  step_id: "x",
  path: "",
  level,
  rule,
  text: `${rule} found`,
  fix: `fix ${rule}`,
});

const result = (
  item_id: string,
  set_id: string | null,
  question_type: string,
  findings: Finding[],
): ItemResult => ({ item_id, set_id, question_type, problem_type: null, findings });

const RESULTS = [
  result("a1", "set_a", "recognition", [finding("render-split-inline")]),
  result("a2", "set_a", "recognition", [finding("render-split-inline")]),
  result("b1", "set_b", "recognition", [finding("render-split-inline")]),
  result("c1", "set_c", "production", [
    finding("render-raw-tex"),
    finding("render-overflow", "warn"),
  ]),
  result("c2", "set_c", "production", [finding("render-raw-tex")]),
  result("c3", "set_c", "production", [finding("render-raw-tex")]),
  result("d1", "set_d", "production", []),
];

describe("the conformance report", () => {
  it("ranks a failing shape by the sets it serves before the items", () => {
    const shapes = shapesOf(RESULTS);
    expect(shapes.map((s) => [s.rule, s.question_type, s.sets, s.items])).toEqual([
      ["render-split-inline", "recognition", 2, 3],
      ["render-raw-tex", "production", 1, 3],
      ["render-overflow", "production", 1, 1],
    ]);
    expect(shapes[0]?.set_ids).toEqual(["set_a", "set_b"]);
    expect(shapes[0]?.examples).toEqual(["a1", "a2", "b1"]);
    expect(shapes[2]?.level).toBe("warn");
  });

  it("writes each item's verdict to the sidecar: render_ok unless an error", () => {
    const sidecar = sidecarOf(RESULTS, "sha256:abc", "2026-10-30T12:00:00.000Z", "pl");
    expect(Object.keys(sidecar.items)).toEqual(["a1", "a2", "b1", "c1", "c2", "c3", "d1"]);
    expect(sidecar.items["a1"]?.render_ok).toBe(false);
    expect(sidecar.items["d1"]).toEqual({ render_ok: true, findings: [], lang: "pl" });
    expect(
      sidecarOf([result("w", null, "x", [finding("r", "warn")])], "", "", "pl").items["w"]
        ?.render_ok,
    ).toBe(true);
    expect(sidecar.rules_version).toBe("sha256:abc");
    expect(sidecar.lang).toBe("pl");
  });

  it("prints the counts and the top shapes", () => {
    const lines = summaryLines(RESULTS, shapesOf(RESULTS), 1);
    expect(lines).toEqual([
      "7 items checked, 6 fail a check (contract, key or render), 3 shapes",
      "  error render-split-inline on recognition: 2 sets, 3 items (e.g. a1, a2, b1)",
    ]);
  });
});
