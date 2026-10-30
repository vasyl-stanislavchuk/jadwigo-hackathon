import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type ConvertedItem, lessonFileOf } from "./items.ts";
import { PLANTED } from "./planted.ts";
import { compileStrictly } from "./strict.ts";

// The mirror against its source (dl-a38n.32.2): lesson-import's real check, run as the CLI it is
// (`bun run check`, packages/lesson-import/src/check.ts), over the planted items as one lesson.
const CHECK = join(import.meta.dirname, "../../../../../packages/lesson-import/src/check.ts");
/** compileProblems' question rules, the ones strict.ts mirrors. */
const MIRRORED = new Set(["question-type-family", "contract", "unknown-field"]);

const ITEMS: ConvertedItem[] = [
  ...Object.values(PLANTED),
  {
    ...PLANTED.ready,
    id: "planted-bad-data",
    spec: { ...PLANTED.ready.spec, data: { options: "none" } },
  },
  {
    ...PLANTED.ready,
    id: "planted-other-family",
    spec: { ...PLANTED.ready.spec, question_type: "production" },
  },
  {
    ...PLANTED.ready,
    id: "planted-loose-help",
    spec: { ...PLANTED.ready.spec, help: { look: { text: "Policz." }, nope: 1 } },
  },
  {
    ...PLANTED.ready,
    id: "planted-help",
    spec: { ...PLANTED.ready.spec, help: { look: { text: "Policz." }, twin: { say: "x" } } },
  },
  {
    ...PLANTED.ready,
    id: "planted-good-twin",
    spec: {
      ...PLANTED.ready.spec,
      help: {
        twin: {
          say: "Wybierz.",
          family: "choose",
          data: PLANTED.ready.spec.data,
          key: { correct: ["o2"] },
        },
      },
    },
  },
];

function checkRules(items: readonly ConvertedItem[]): Record<string, string[]> {
  const dir = mkdtempSync(join(tmpdir(), "conformance-strict-"));
  try {
    const file = join(dir, "lesson.json");
    writeFileSync(file, JSON.stringify(lessonFileOf(items)));
    const run = spawnSync("bun", [CHECK, file, "--json"], { encoding: "utf8" });
    const result = JSON.parse(run.stdout) as {
      findings: { step_id: string | null; level: string; rule: string }[];
    };
    const out: Record<string, string[]> = Object.fromEntries(items.map((i) => [i.id, []]));
    for (const f of result.findings) {
      if (f.level !== "error" || !MIRRORED.has(f.rule) || f.step_id === null) continue;
      // A twin's problems are its step's: compile.ts names the twin `<step id>t`.
      const id = f.step_id in out ? f.step_id : f.step_id.slice(0, -1);
      out[id] = [...new Set([...(out[id] ?? []), f.rule])].sort();
    }
    return out;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("strict.ts, the page's mirror of the strict compile", () => {
  it("finds on each planted item the rules lesson-import's check finds", () => {
    const mirror = Object.fromEntries(
      ITEMS.map((i) => [i.id, [...new Set(compileStrictly(i).findings.map((f) => f.rule))].sort()]),
    );
    const source = checkRules(ITEMS);
    expect(mirror).toEqual(source);
    // The planted ones must disagree with "nothing found" somewhere, or the test proves little.
    expect(source[PLANTED.loose.id]).toEqual(["unknown-field"]);
    expect(source["planted-other-family"]).toEqual(["question-type-family"]);
    expect(source["planted-bad-data"]).toEqual(["contract"]);
    expect(source["planted-help"]).toEqual(["question-type-family"]);
    expect(source["planted-good-twin"]).toEqual([]);
    expect(source[PLANTED.ready.id]).toEqual([]);
  }, 30_000);
});
