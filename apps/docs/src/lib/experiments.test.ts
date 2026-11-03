import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseExperiment } from "./experiments.ts";

const DIR = join(import.meta.dirname, "../data/experiments");
const files = readdirSync(DIR)
  .filter((file) => file.endsWith(".json"))
  .sort();

describe("every experiment result", () => {
  it("is there for e1 to e7", () => {
    expect(files).toEqual([
      "e1.json",
      "e2.json",
      "e3.json",
      "e4.json",
      "e5.json",
      "e6.json",
      "e7.json",
    ]);
  });

  it.each(files)("%s fits the schema, and its id is its file's stem", (file) => {
    const parsed = parseExperiment(JSON.parse(readFileSync(join(DIR, file), "utf8")));
    expect(parsed.ok, parsed.ok ? "" : parsed.problems.join("\n")).toBe(true);
    if (parsed.ok) expect(parsed.data.id).toBe(file.slice(0, -".json".length));
  });
});

describe("parseExperiment", () => {
  const good = {
    id: "e1",
    title: "Learner knowledge on a cohort of 12 invented learners",
    status: "done",
    model: "none",
    calls: 0,
    tokens: { input: 0, output: 0 },
    usd: 0,
    cost_source: "ledger",
    wall_s: 12.5,
    commit: "0123abc",
    commands: ["bunx vitest run experiment"],
    results: [{ label: "learners", value: 12 }],
  };

  it("takes a full result", () => {
    const parsed = parseExperiment(good);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.results).toEqual([{ label: "learners", value: 12 }]);
  });

  it("names a missing field, a cost with no known source, and a negative cost", () => {
    const { usd: _usd, ...noUsd } = good;
    const missing = parseExperiment(noUsd);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.problems.join("\n")).toContain("usd");

    const source = parseExperiment({ ...good, cost_source: "a guess" });
    expect(source.ok).toBe(false);
    if (!source.ok) expect(source.problems.join("\n")).toContain("cost_source");

    const negative = parseExperiment({ ...good, usd: -1 });
    expect(negative.ok).toBe(false);
    if (!negative.ok) expect(negative.problems.join("\n")).toContain("usd");
  });
});
