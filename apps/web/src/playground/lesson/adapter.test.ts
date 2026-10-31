import type { LessonFile } from "@jadwigo/lesson-import/file";
import { LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { lessonFileToSpecs } from "./adapter.ts";
import { type ReadDraft, readDraft } from "./draft.ts";

/** The fixture as written, `{pl, uk, en}` lines and all, to plant a fault in before the parse. */
const rawTimesFour = () =>
  structuredClone(
    LESSON_FILES.find((f) => (f as { id?: unknown }).id === "multiplication-times-four"),
  ) as { script: { parts: { steps: Record<string, unknown>[] }[] } };

function read(raw: unknown): ReadDraft {
  const out = readDraft(raw);
  if ("error" in out) throw new Error(out.error);
  return out;
}

const timesFour = (): LessonFile => read(rawTimesFour()).file;

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
        id: `${step.id}t`,
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

  it("draws a step the parse left out as a skipped entry at its place, with the reason", () => {
    const raw = rawTimesFour();
    const warmUp = raw.script.parts[0]?.steps ?? [];
    const [, s02, s03] = warmUp;
    if (s02 === undefined || s03 === undefined) throw new Error("the fixture's warm-up changed");
    s02["question_type"] = "riddle";
    s03["question"] = { ...(s03["question"] as object), family: "dance" };

    const { file, skipped } = read(raw);
    const [part] = lessonFileToSpecs(file, "", skipped);
    expect(part?.steps.map((s) => [s.kind, s.step_id])).toEqual([
      ["skipped", "s02"],
      ["skipped", "s03"],
    ]);
    const [first, second] = part?.steps ?? [];
    expect(first?.kind === "skipped" && first.reason).toMatch(
      /\(script\.parts\[0\]\.steps\[1\]\.question_type\)$/,
    );
    expect(second?.kind === "skipped" && second.reason).toMatch(
      /\(script\.parts\[0\]\.steps\[2\]\.question\.family\)$/,
    );
    expect(part?.specs).toEqual([]);
    // The parts after it still draw, in order.
    expect(lessonFileToSpecs(file, "", skipped)[2]?.specs.length).toBeGreaterThan(0);
  });

  it("names a skipped step with no id by its place in its part", () => {
    const raw = rawTimesFour();
    const s03 = raw.script.parts[0]?.steps[2];
    if (s03 === undefined) throw new Error("the fixture's s03 changed");
    delete s03["id"];
    const { file, skipped } = read(raw);
    expect(lessonFileToSpecs(file, "", skipped)[0]?.steps.map((s) => s.step_id)).toEqual([
      "s02",
      "warm_up[2]",
    ]);
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
