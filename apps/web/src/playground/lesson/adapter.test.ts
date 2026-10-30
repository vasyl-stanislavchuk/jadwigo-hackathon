import { LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { type DraftLessonFile, lessonFileToSpecs } from "./adapter.ts";
import { readDraft } from "./draft.ts";

function lessonFile(id: string): DraftLessonFile {
  const read = readDraft(LESSON_FILES.find((f) => (f as { id?: unknown }).id === id));
  if ("error" in read) throw new Error(read.error);
  return read.file;
}

const timesFour = (): DraftLessonFile => lessonFile("multiplication-times-four");

describe("lessonFileToSpecs", () => {
  it("draws every question step of multiplication-times-four, its twin on rung 4", () => {
    const file = timesFour();
    const parts = lessonFileToSpecs(file, "");
    expect(parts.map((p) => p.part)).toEqual(file.script.parts.map((p) => p.part));

    const questions = file.script.parts.flatMap((p) => p.steps.filter((s) => "question" in s));
    const specs = parts.flatMap((p) => p.specs);
    expect(specs.map((s) => s.id)).toEqual(questions.map((s) => s.id));
    expect(parts.flatMap((p) => p.steps).every((s) => s.kind === "question")).toBe(true);

    for (const step of questions) {
      const spec = specs.find((s) => s.id === step.id);
      const written = "question" in step ? step.question.help?.["twin"] : undefined;
      if (written === undefined) {
        expect(spec?.help?.twin, step.id).toBeUndefined();
        continue;
      }
      expect(spec?.help?.twin, step.id).toMatchObject({
        id: `${step.id}-twin`,
        question_type: spec?.question_type,
        family: spec?.family,
      });
      expect(spec?.help?.twin, step.id).not.toHaveProperty("help");
    }
    // s15 is an explain question with no twin; every other question step has one.
    expect(specs.filter((s) => s.help?.twin !== undefined)).toHaveLength(questions.length - 1);
  });

  it("keeps a question's say, key and help rungs as written, and leaves teaching steps out", () => {
    const [warmUp] = lessonFileToSpecs(timesFour(), "");
    expect(warmUp?.specs.map((s) => s.id)).toEqual(["s02", "s03"]);
    const s02 = warmUp?.specs[0];
    expect(s02).toMatchObject({
      say: "Ile to jest 2 razy 7? Napisz albo powiedz.",
      question_type: "production",
      family: "enter",
      key: { accept: ["14"] },
    });
    expect(Object.keys(s02?.help ?? {}).sort()).toEqual(
      ["almost", "boost", "boost_by_mistake", "look", "twin", "worked"].sort(),
    );
  });

  it("returns a planted unknown type or family as a skipped entry with its reason", () => {
    const file = timesFour();
    const [warmUp] = file.script.parts;
    const [, s02, s03] = warmUp?.steps ?? [];
    if (s02 === undefined || !("question" in s02) || s03 === undefined || !("question" in s03))
      throw new Error("the fixture's warm-up changed");
    s02.question_type = "riddle";
    s03.question = { ...s03.question, family: "dance" };

    const [part] = lessonFileToSpecs(file, "");
    expect(part?.steps).toEqual([
      { kind: "skipped", step_id: "s02", reason: "step s02: unknown question type riddle" },
      { kind: "skipped", step_id: "s03", reason: "step s03: unknown family dance" },
    ]);
    expect(part?.specs).toEqual([]);
  });

  it("skips a step whose question type is another family's, or whose twin cannot be drawn", () => {
    const file = timesFour();
    const s02 = file.script.parts[0]?.steps[1];
    if (s02 === undefined || !("question" in s02)) throw new Error("the fixture's s02 changed");
    s02.question_type = "order";
    const steps = lessonFileToSpecs(file, "")[0]?.steps;
    expect(steps?.[0]).toEqual({
      kind: "skipped",
      step_id: "s02",
      reason: "step s02: order is a sequence question, not enter",
    });

    const again = timesFour();
    const s03 = again.script.parts[0]?.steps[2];
    if (s03 === undefined || !("question" in s03)) throw new Error("the fixture's s03 changed");
    s03.question.help = { ...s03.question.help, twin: { say: "?", family: "choose" } };
    expect(lessonFileToSpecs(again, "")[0]?.steps[1]).toEqual({
      kind: "skipped",
      step_id: "s03",
      reason: "step s03 twin: no data",
    });
  });

  it("puts every picture ref, in the data, the help and the twin, through the media URL", () => {
    const ref = `${"a".repeat(64)}.png`;
    const file = timesFour();
    const s02 = file.script.parts[0]?.steps[1];
    if (s02 === undefined || !("question" in s02)) throw new Error("the fixture's s02 changed");
    const twin = s02.question.help?.["twin"] as { data: Record<string, unknown> };
    s02.question = {
      ...s02.question,
      data: { ...(s02.question.data as object), image: ref },
      help: {
        ...s02.question.help,
        look: { text: "Look.", picture: `media:${ref}` },
        twin: { ...twin, data: { ...twin.data, image: ref } },
      },
    };
    const spec = lessonFileToSpecs(file, "https://media.test/")[0]?.specs[0];
    const at = `https://media.test/${ref}`;
    expect(spec?.data).toMatchObject({ image: at });
    expect(spec?.help?.look).toMatchObject({ picture: at });
    expect(spec?.help?.twin?.data).toMatchObject({ image: at });
  });
});
