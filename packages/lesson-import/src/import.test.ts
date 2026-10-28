import { ID_PREFIXES, idOf, PodId } from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { FIXED_NOW, LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { compileLessonFile, contentHash } from "./compile.ts";
import { FEATURED_POD, featuredAssignmentId, uuidV5 } from "./ids.ts";
import { importLessonFile } from "./import.ts";
import { skillIdOf } from "./lesson-file.ts";

const newStore = () => new InMemoryStore({ now: () => FIXED_NOW });

/** A lesson file by its id, deep-copied so a test may change it. */
function file(id: string): Record<string, unknown> {
  const found = LESSON_FILES.find((f) => (f as { id: string }).id === id);
  if (found === undefined) throw new Error(`no lesson file ${id}`);
  return structuredClone(found) as Record<string, unknown>;
}

type Step = Record<string, unknown> & {
  say?: unknown;
  skill_ids?: string[];
  question_type?: string;
};

/** A step of a lesson file by its id. */
function step(raw: Record<string, unknown>, id: string): Step {
  const parts = (raw as { script: { parts: { steps: Step[] }[] } }).script.parts;
  const found = parts.flatMap((p) => p.steps).find((s) => s["id"] === id);
  if (found === undefined) throw new Error(`no step ${id}`);
  return found;
}

function keysIn(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysIn);
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => [k, ...keysIn(v)]);
  }
  return [];
}

describe("uuid v5", () => {
  it("gives the RFC's answer for www.example.com in the DNS namespace", () => {
    expect(uuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8" as never, "www.example.com")).toBe(
      "2ed6657d-e927-568b-95e1-2665a8aea6a2",
    );
  });
});

describe("compiling a lesson file", () => {
  it("compiles every exported file in its own language", () => {
    for (const raw of LESSON_FILES) {
      const compiled = compileLessonFile(raw);
      const language = (raw as { language: string }).language;
      expect(compiled.lesson.language).toBe(language);
      expect(compiled.questions.length).toBeGreaterThan(0);
      for (const { question } of compiled.questions) expect(typeof question.say).toBe("string");
    }
  });

  it("keeps the questions and drops teaching steps, can_do, reasons, scenarios and clip words", () => {
    const raw = file("equal-groups");
    const compiled = compileLessonFile(raw);
    const keys = keysIn(compiled);
    for (const gone of ["teach", "can_do", "reason", "scenarios", "audio_text", "twin", "phase"]) {
      expect(keys).not.toContain(gone);
    }
    expect(JSON.stringify(compiled)).not.toMatch(/"uk"|"en":/);
    const steps = compiled.questions.filter((q) => q.role === "planned").map((q) => q.step_id);
    expect(steps).toEqual(["s02", "s05", "s06", "s07"]);
  });

  it("turns each help twin into a spare after the planned questions, with twin_of", () => {
    const compiled = compileLessonFile(file("equal-groups"));
    const roles = compiled.questions.map((q) => q.role);
    expect(roles.lastIndexOf("planned")).toBeLessThan(roles.indexOf("spare"));
    const byStep = new Map(compiled.questions.map((q) => [q.step_id, q.question]));
    const twin = byStep.get("s02t");
    expect(twin?.twin_of).toBe(byStep.get("s02")?.id);
    expect(twin?.question_type).toBe(byStep.get("s02")?.question_type);
    expect(twin?.say).toBe("Ile to jest dwa razy cztery? Napisz albo powiedz.");
    expect(twin?.credit).toBeNull();
    expect(twin?.based_on).toBeNull();
  });

  it("carries a step's credit, with its licence, onto its question", () => {
    const raw = file("equal-groups");
    const credit = {
      source: "jadwigo",
      ref: "equal-groups-s05",
      licence: "cc-by-4.0",
      original_lang: "pl",
      checked: "2026-10-28",
    };
    step(raw, "s05")["credit"] = credit;
    const compiled = compileLessonFile(raw);
    const byStep = new Map(compiled.questions.map((q) => [q.step_id, q.question]));
    expect(byStep.get("s05")?.credit).toEqual(credit);
    expect(byStep.get("s02")?.credit).toBeNull();
  });

  it("gives the lesson the union of its questions' skill ids, in the contract's form", () => {
    const compiled = compileLessonFile(file("fives-everywhere"));
    expect(compiled.lesson.skill_ids).toContain("curriculum.math.multiplication.row-5");
    expect(new Set(compiled.lesson.skill_ids).size).toBe(compiled.lesson.skill_ids.length);
    expect(skillIdOf("draft.ortografia.l-ł")).toBe("draft.ortografia.l-l");
  });

  it("refuses 2 playground skill ids that become one", () => {
    const raw = file("equal-groups");
    step(raw, "s02").skill_ids = ["draft.ortografia.l-ł"];
    step(raw, "s05").skill_ids = ["draft.ortografia.l-l"];
    expect(() => compileLessonFile(raw)).toThrow(
      /draft\.ortografia\.l-ł and draft\.ortografia\.l-l both become draft\.ortografia\.l-l/,
    );
  });

  it("names the same ids every time, and a new id for a question whose content changed", () => {
    const a = compileLessonFile(file("equal-groups"));
    expect(compileLessonFile(file("equal-groups"))).toEqual(a);
    const changed = file("equal-groups") as { script: { parts: { steps: { say: unknown }[] }[] } };
    const step = changed.script.parts[0]?.steps[1];
    if (step === undefined) throw new Error("equal-groups has no step s02");
    step.say = "Ile to jest 2 × 5?";
    const b = compileLessonFile(changed);
    expect(b.lesson.id).toBe(a.lesson.id);
    expect(b.assignment.id).toBe(a.assignment.id);
    expect(b.questions[0]?.question.id).not.toBe(a.questions[0]?.question.id);
    expect(b.questions[1]?.question.id).toBe(a.questions[1]?.question.id);
  });

  it("hashes content whatever order its keys were written in", () => {
    expect(contentHash({ a: 1, b: [{ c: 2, d: 3 }] })).toBe(
      contentHash({ b: [{ d: 3, c: 2 }], a: 1 }),
    );
  });

  it("refuses a field the contract has no place for, rather than dropping it", () => {
    const raw = file("equal-groups") as {
      script: { parts: { steps: { question?: { data: Record<string, unknown> } }[] }[] };
    };
    const question = raw.script.parts[0]?.steps[1]?.question;
    if (question === undefined) throw new Error("equal-groups has no step s02");
    question.data["sparkle"] = true;
    expect(() => compileLessonFile(raw)).toThrow(/s02.*sparkle/);
  });

  it("refuses a question type of another family", () => {
    const raw = file("equal-groups") as {
      script: { parts: { steps: { question_type?: string }[] }[] };
    };
    const step = raw.script.parts[0]?.steps[1];
    if (step === undefined) throw new Error("equal-groups has no step s02");
    step.question_type = "true_false";
    expect(() => compileLessonFile(raw)).toThrow(/true_false is a choose question, not enter/);
  });
});

describe("importing a lesson file", () => {
  it("writes the lesson, its questions, a published version and the featured assignment", async () => {
    const store = newStore();
    const result = await importLessonFile(store, file("equal-groups"));
    const pod = FEATURED_POD.id;
    expect(result.published).toBe(true);
    expect(result.version.version).toBe(1);
    expect(result.assignment).toMatchObject({
      id: featuredAssignmentId("equal-groups"),
      audience: "anyone",
      identity: "none",
      lesson_version_id: null,
    });
    const { version, questions } = await store.getLessonVersion(pod, result.version.id);
    expect(version.published_at).toBe(FIXED_NOW.toISOString());
    expect(questions.map((q) => q.role)).toEqual([
      ...Array(4).fill("planned"),
      ...Array(4).fill("spare"),
    ]);
    expect((await store.getAssignment(pod, result.assignment.id)).lesson_id).toBe(result.lesson.id);
  });

  it("imports every exported lesson file", async () => {
    const store = newStore();
    for (const raw of LESSON_FILES) {
      expect((await importLessonFile(store, raw)).version.version).toBe(1);
    }
  });

  it("makes no new version when the content is the same", async () => {
    const store = newStore();
    const first = await importLessonFile(store, file("equal-groups"));
    const again = await importLessonFile(store, file("equal-groups"));
    expect(again.published).toBe(false);
    expect(again.version).toEqual(first.version);
    expect(again.assignment).toEqual(first.assignment);
  });

  it("keeps the stored lesson row when a re-import changes only the lesson's own fields", async () => {
    const store = newStore();
    const first = await importLessonFile(store, file("equal-groups"));
    const retitled = file("equal-groups");
    retitled["title"] = "Grupy po równo, nowy tytuł";
    const again = await importLessonFile(store, retitled);
    expect(again.lesson).toMatchObject({ id: first.lesson.id, title: first.lesson.title });
    expect(again.published).toBe(false);
  });

  it("publishes version 2 when a question changed, revising version 1", async () => {
    const store = newStore();
    const first = await importLessonFile(store, file("equal-groups"));
    const changed = file("equal-groups") as { script: { parts: { steps: { say: unknown }[] }[] } };
    const step = changed.script.parts[0]?.steps[1];
    if (step === undefined) throw new Error("equal-groups has no step s02");
    step.say = "Ile to jest 2 × 5?";
    const second = await importLessonFile(store, changed);
    expect(second.published).toBe(true);
    expect(second.version).toMatchObject({ version: 2, revises: first.version.id });
    expect(second.assignment.id).toBe(first.assignment.id);
  });

  it("starts an attempt on the featured assignment at the first planned question", async () => {
    const store = newStore();
    const { assignment, version } = await importLessonFile(store, file("equal-groups"));
    const record = await store.startAttempt(FEATURED_POD.id, { assignment_id: assignment.id });
    const listed = await store.getLessonVersion(FEATURED_POD.id, version.id);
    expect(record.attempt.lesson_version_id).toBe(version.id);
    expect(record.questions[0]?.lesson_question_id).toBe(listed.questions[0]?.lesson_question_id);
  });

  it("names its ids under the pod it imports into", async () => {
    const store = newStore();
    const pod = {
      id: PodId.parse(idOf(ID_PREFIXES.pod, crypto.randomUUID())),
      name: "Pod of foxes",
      language: "pl" as const,
    };
    const result = await importLessonFile(store, file("equal-groups"), pod);
    expect(result.lesson.pod_id).toBe(pod.id);
    expect(result.assignment.id).toBe(featuredAssignmentId("equal-groups", pod.id));
    expect(result.assignment.id).not.toBe(featuredAssignmentId("equal-groups"));
  });
});
