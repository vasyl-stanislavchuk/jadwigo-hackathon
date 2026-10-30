import { LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { parseLessonFile, questionSteps } from "./file.ts";

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
});
