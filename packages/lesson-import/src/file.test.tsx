import { LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import {
  type Finding,
  parseLessonFile,
  parseLessonFileLenient,
  questionSteps,
  worstLevel,
} from "./file.ts";

// In the dom project (happy-dom), so the parse is shown to run where the lesson builder's page does.
const equalGroups = LESSON_FILES.find((f) => (f as { id?: unknown }).id === "equal-groups");

describe("the browser-safe entry", () => {
  it("parses a lesson file in a DOM, every line in the lesson's language", () => {
    expect("document" in globalThis).toBe(true);
    const file = parseLessonFile(equalGroups);
    expect(file.id).toBe("equal-groups");
    expect(file.title).toBe("Równe grupy");
    const steps = questionSteps(file);
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) expect(typeof step.say).toBe("string");
  });

  it("refuses a file that is not a lesson file, naming it", () => {
    expect(() => parseLessonFile({ id: "broken", language: "pl" })).toThrow(/lesson file broken/);
  });

  it("parses a draft with an unknown question type, leaving out only that step", () => {
    const whole = parseLessonFile(equalGroups);
    const raw = structuredClone(equalGroups) as {
      script: { parts: { steps: Record<string, unknown>[] }[] };
    };
    const step = raw.script.parts.flatMap((p) => p.steps).find((s) => s["id"] === "s05");
    if (step === undefined) throw new Error("no step s05 in equal-groups");
    step["question_type"] = "not_a_type";
    expect(() => parseLessonFile(raw)).toThrow();

    const { file, skipped } = parseLessonFileLenient(raw);
    const count = (f: typeof whole) => f.script.parts.flatMap((p) => p.steps).length;
    expect(count(file)).toBe(count(whole) - 1);
    expect(questionSteps(file).map((s) => s.id)).not.toContain("s05");
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toMatchObject({ step_id: "s05" });
    const at = skipped[0];
    if (at === undefined) throw new Error("no skipped step");
    expect(at.path).toBe(`script.parts[${at.part}].steps[${at.index}].question_type`);
    expect(at.message).toMatch(/expected one of/);
  });

  it("still refuses a draft whose frame does not parse", () => {
    expect(() => parseLessonFileLenient({ ...(equalGroups as object), title: "" })).toThrow(
      /lesson file equal-groups/,
    );
  });

  it("carries the check's findings and their worst level", () => {
    const warn: Finding = {
      step_id: "s02",
      path: "script.parts[0].steps[1].question.help.boost",
      level: "warn",
      rule: "empty-rung",
      text: "Rung 2 (boost) is empty.",
      fix: "Write boost.",
    };
    expect(worstLevel([warn])).toBe("warn");
    expect(worstLevel([warn, { ...warn, level: "error" }])).toBe("error");
  });
});
