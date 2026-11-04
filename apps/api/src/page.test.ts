// The page's credit for a question asked as a spare (dl-1eieq.6.2): a twin stored with no credit
// of its own, as lessons imported before the fix were, shows its question's credit, adapted.
import { ID_PREFIXES, idOf } from "@jadwigo/contracts";
import { FEATURED_POD, importLessonFile } from "@jadwigo/lesson-import";
import { InMemoryStore, type LessonVersionWithQuestions } from "@jadwigo/store";
import { FIXED_NOW, LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { pageQuestion } from "./page.ts";

// Made up: no bank item has this ref.
const CREDIT = {
  source: "khan",
  ref: "x0000000000000001",
  licence: "Khan Academy's licence was checked by the owner on 2026-10-18",
  original_lang: "pl",
  checked: "2026-10-18",
} as const;

/** equal-groups with a Khan credit on s02, stored as before the fix: the twin with none. */
async function storedVersion(): Promise<LessonVersionWithQuestions> {
  const raw = structuredClone(
    LESSON_FILES.find((f) => (f as { id: string }).id === "equal-groups"),
  ) as {
    script: { parts: { steps: Record<string, unknown>[] }[] };
  };
  const s02 = raw.script.parts.flatMap((p) => p.steps).find((s) => s["id"] === "s02");
  if (s02 === undefined) throw new Error("fixture");
  Object.assign(s02, { credit: CREDIT, based_on: { question: `khan:${CREDIT.ref}`, changes: [] } });
  const store = new InMemoryStore({ now: () => FIXED_NOW });
  const { version } = await importLessonFile(store, raw);
  const stored = await store.getLessonVersion(FEATURED_POD.id, version.id);
  return {
    ...stored,
    questions: stored.questions.map((v) =>
      v.question.twin_of === null
        ? v
        : { ...v, question: { ...v.question, credit: null, based_on: null } },
    ),
  };
}

function asked(version: LessonVersionWithQuestions, role: "planned" | "spare", seq: number) {
  const found = version.questions.find(
    (v) => v.role === role && (role === "spare" || v.question.credit !== null),
  );
  if (found === undefined) throw new Error("fixture");
  return {
    attempt_id: idOf(ID_PREFIXES.attempt, "00000000-0000-4000-8000-000000000001"),
    seq,
    pod_id: FEATURED_POD.id,
    lesson_question_id: found.lesson_question_id,
    added: role === "planned" ? "planned" : "twin",
    placed: null,
    added_for: role === "planned" ? null : 1,
    help_released: 0,
    ended: null,
    asked_at: FIXED_NOW.toISOString(),
  } as Parameters<typeof pageQuestion>[1];
}

describe("a question's credit on the page", () => {
  it("shows the planned Khan question's credit with its licence as an id", async () => {
    const version = await storedVersion();
    expect(pageQuestion(version, asked(version, "planned", 1), [], false).credit).toEqual({
      source: "khan",
      ref: CREDIT.ref,
      licence: "cc-by-nc-sa-4.0",
      original_lang: "pl",
      adapted: false,
    });
  });

  it("gives a stored twin with no credit its question's credit, adapted", async () => {
    const version = await storedVersion();
    const twin = version.questions.find((v) => v.role === "spare" && v.question.twin_of !== null);
    const original = version.questions.find((v) => v.question.id === twin?.question.twin_of);
    expect(original?.question.credit).not.toBeNull();
    const question = {
      ...asked(version, "spare", 2),
      lesson_question_id: twin?.lesson_question_id,
    };
    expect(
      pageQuestion(version, question as Parameters<typeof pageQuestion>[1], [], false).credit,
    ).toEqual({
      source: "khan",
      ref: CREDIT.ref,
      licence: "cc-by-nc-sa-4.0",
      original_lang: "pl",
      adapted: true,
    });
  });
});
