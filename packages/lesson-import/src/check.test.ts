import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { QUESTION_TYPE_FAMILY } from "@jadwigo/contracts";
import { LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { featuredAssignmentId } from "./ids.ts";

const script = fileURLToPath(new URL("./check.ts", import.meta.url));
const lessons = fileURLToPath(new URL("../../testing/src/lessons/", import.meta.url));

/** `bun packages/lesson-import/src/check.ts <file> --json`, as jw runs it: the exit code and the JSON. */
function check(file: string): { status: number | null; out: Record<string, unknown> } {
  const run = spawnSync("bun", [script, file, "--json"], { encoding: "utf8" });
  return { status: run.status, out: JSON.parse(run.stdout) as Record<string, unknown> };
}

type Step = Record<string, unknown> & { question?: { family?: string; help?: object } };

/** A copy of equal-groups with `change` applied to step s02 and `title`, written to a temp file. */
function planted(change: (step: Step) => void, title?: string): string {
  const raw = structuredClone(
    LESSON_FILES.find((f) => (f as { id: string }).id === "equal-groups"),
  ) as { script: { parts: { steps: Step[] }[] } };
  const step = raw.script.parts.flatMap((p) => p.steps).find((s) => s["id"] === "s02");
  if (step === undefined) throw new Error("no step s02 in equal-groups");
  change(step);
  if (title !== undefined) Object.assign(raw, { title });
  const file = join(mkdtempSync(join(tmpdir(), "lesson-check-")), "planted.json");
  writeFileSync(file, JSON.stringify(raw));
  return file;
}

describe("check.ts --json", () => {
  const names = readdirSync(lessons).filter((f) => f.endsWith(".json"));

  it("passes every fixture lesson file, with its play path", () => {
    expect(names).toHaveLength(5);
    for (const name of names) {
      const { status, out } = check(join(lessons, name));
      const id = name.replace(/\.json$/, "");
      expect({ name, status, ok: out["ok"], errors: out["errors"] }).toEqual({
        name,
        status: 0,
        ok: true,
        errors: [],
      });
      expect(out["play_path"]).toBe(`/play/${featuredAssignmentId(id)}`);
      expect(out["lesson_id"]).toMatch(/^les_/);
      expect(out["questions"]).toBeGreaterThan(0);
    }
  });

  it("prints exactly the keys jw reads", () => {
    const { out } = check(join(lessons, "equal-groups.json"));
    expect(Object.keys(out).sort()).toEqual([
      "errors",
      "lesson_id",
      "ok",
      "play_path",
      "questions",
    ]);
  });

  it("fails a step whose question_type is another family's, naming the step", () => {
    const file = planted((step) => {
      const family = step.question?.family;
      const other = Object.entries(QUESTION_TYPE_FAMILY).find(([, f]) => f !== family);
      if (other === undefined) throw new Error("every question type is one family");
      step["question_type"] = other[0];
    });
    const { status, out } = check(file);
    expect(status).toBe(1);
    expect(out["ok"]).toBe(false);
    expect(out["errors"]).toEqual([
      { step_id: "s02", message: expect.stringContaining("is a") as unknown },
    ]);
    expect(out["play_path"]).toBe(`/play/${featuredAssignmentId("equal-groups")}`);
  });

  it("fails a help field the contract lacks, naming the step", () => {
    const file = planted((step) => {
      if (step.question !== undefined) step.question.help = { ...step.question.help, hint: "x" };
    });
    const { status, out } = check(file);
    expect(status).toBe(1);
    expect(out["errors"]).toEqual([
      { step_id: "s02", message: expect.stringContaining("no field for hint") as unknown },
    ]);
  });

  it("names the step of each schema problem, and none for the file's own", () => {
    const file = planted((step) => {
      step["question_type"] = "not-a-type";
    }, "");
    const { status, out } = check(file);
    expect(status).toBe(1);
    const steps = (out["errors"] as { step_id: string | null }[]).map((e) => e.step_id);
    expect(steps.sort()).toEqual([null, "s02"].sort());
  });

  it("fails a file that is not JSON, with no step", () => {
    const file = join(mkdtempSync(join(tmpdir(), "lesson-check-")), "broken.json");
    writeFileSync(file, "{");
    const { status, out } = check(file);
    expect(status).toBe(1);
    expect(out).toMatchObject({ ok: false, play_path: null, lesson_id: null, questions: 0 });
    expect((out["errors"] as { step_id: unknown }[])[0]?.step_id).toBeNull();
  });
});
