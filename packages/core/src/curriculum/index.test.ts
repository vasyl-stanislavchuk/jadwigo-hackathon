import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PodId } from "@jadwigo/contracts";
import { LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { resolveSkill } from "../mastery/index.ts";
import { catalogue } from "./index.ts";

const POD = PodId.parse("pod_6et2fhbnwvb45aw9atcfzs33za");
const ROOT = join(import.meta.dirname, "../../../..");

/**
 * The way a code reaches a lesson: the bank's `proposed:` is dropped (decision 2026-10-29, a
 * drafted lesson's skill ids drop it), then the lesson import's dialect: a slash becomes a dot, ł
 * becomes l, marks go (lesson-file.ts).
 */
function skillIdOf(raw: string): string {
  return raw
    .replace(/^proposed:/, "")
    .replaceAll("/", ".")
    .replaceAll("ł", "l")
    .replaceAll("Ł", "L")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Every string under a `skill_ids` key, however deep. */
function skillIdsIn(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) for (const v of value) skillIdsIn(v, out);
  else if (value !== null && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      if (k === "skill_ids" && Array.isArray(v))
        out.push(...v.filter((x) => typeof x === "string"));
      else skillIdsIn(v, out);
    }
  return out;
}

function jsonFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".json"))
    .map((f) => join(dir, f));
}

/** The codes the repo's fixtures carry: the lesson files, the bank fixture, the cli's JSON fixtures. */
function fixtureCodes(): string[] {
  const lessons = skillIdsIn(LESSON_FILES);
  const bank = [
    ...readFileSync(join(ROOT, "packages/bank/src/fixture.ts"), "utf8").matchAll(
      /skill_ids: \[([^\]]*)\]/g,
    ),
  ].flatMap((m) => [...(m[1] ?? "").matchAll(/"([^"]+)"/g)].map((x) => x[1] ?? ""));
  const cli = jsonFiles(join(ROOT, "apps/cli/tests/fixtures")).flatMap((f) =>
    skillIdsIn(JSON.parse(readFileSync(f, "utf8"))),
  );
  return [...new Set([...lessons, ...bank, ...cli].map(skillIdOf))].sort();
}

describe("catalogue", () => {
  const { curriculum, topics, skills } = catalogue();
  const asSkills = skills.map((s) => ({
    ...s,
    pod_id: POD,
    created_at: "2026-10-30T00:00:00.000Z",
    topic_id: null,
  }));

  it("is the 2017 podstawa with its 26 outcomes, and every bank id plus the fixtures' codes", () => {
    expect(curriculum).toMatchObject({
      code: "pl-2017",
      country: "PL",
      version: "2017",
      language: "pl",
    });
    expect(topics).toHaveLength(26);
    expect(skills.filter((s) => s.source === "bank:enrichment")).toHaveLength(138);
    expect(skills.every((s) => s.status === "proposed")).toBe(true);
  });

  it("resolves every fixture code to a catalogue code, directly or by alias", () => {
    const codes = new Set(skills.map((s) => s.code));
    const found = fixtureCodes();
    expect(found.length).toBeGreaterThan(20);
    const unresolved = found.filter((c) => !codes.has(resolveSkill(c, asSkills)));
    expect(unresolved).toEqual([]);
  });

  it("keeps codes unique, aliases apart from every code and from each other, prerequisites known", () => {
    const codes = skills.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    const aliases = skills.flatMap((s) => s.aliases);
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(aliases.filter((a) => codes.includes(a))).toEqual([]);
    expect(skills.flatMap((s) => s.prerequisites).filter((p) => !codes.includes(p))).toEqual([]);
  });

  it("files every skill under an outcome the podstawa holds, or none", () => {
    const outcomes = new Set(topics.map((t) => t.code));
    expect(skills.filter((s) => s.topic_code !== null && !outcomes.has(s.topic_code))).toEqual([]);
  });

  it("gives Polish can-do lines, unreviewed, to the 18 known ids only, and speed to the 10 rows", () => {
    const lined = skills.filter((s) => s.can_do !== null);
    expect(lined).toHaveLength(18);
    expect(
      lined.every((s) => s.can_do?.pl?.reviewed === false && s.can_do.pl.child.startsWith("Umiem")),
    ).toBe(true);
    expect(
      skills
        .filter((s) => s.kind === "speed")
        .map((s) => s.code)
        .sort(),
    ).toEqual(Array.from({ length: 10 }, (_, i) => `maths.multiplication.row-${i + 1}`).sort());
  });

  it("has no prerequisite cycle", () => {
    const prereqs = new Map(skills.map((s) => [s.code, s.prerequisites]));
    const done = new Set<string>();
    const visit = (code: string, path: Set<string>): void => {
      expect(path.has(code), `${[...path].join(" > ")} > ${code}`).toBe(false);
      if (done.has(code)) return;
      path.add(code);
      for (const p of prereqs.get(code) ?? []) visit(p, path);
      path.delete(code);
      done.add(code);
    };
    for (const s of skills) visit(s.code, new Set());
  });
});
