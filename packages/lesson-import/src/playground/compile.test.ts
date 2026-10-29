import { QuestionType } from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { describe, expect, it } from "vitest";
import { FEATURED_POD } from "../ids.ts";
import { compileExamples } from "./compile.ts";
import { importExamples } from "./import.ts";
import { EXAMPLES } from "./index.ts";

describe("the playground's examples", () => {
  it("compile to the same ids twice, and to other ids in the other language", () => {
    const pl = compileExamples(EXAMPLES, "pl");
    expect(compileExamples(EXAMPLES, "pl")).toEqual(pl);
    const en = new Set(compileExamples(EXAMPLES, "en").questions.map((q) => q.id));
    expect(pl.questions.some((q) => en.has(q.id))).toBe(false);
  });

  it("number each type's examples from 1, the showcase first, and link each twin", () => {
    const { questions, examples } = compileExamples(EXAMPLES, "en");
    const byId = new Map(questions.map((q) => [q.id, q]));
    for (const type of QuestionType.options) {
      const own = examples.filter((e) => byId.get(e.lesson_question_id)?.question_type === type);
      expect(
        own.map((e) => e.position),
        type,
      ).toEqual(own.map((_, i) => i + 1));
      if (own.some((e) => e.showcase)) expect(own[0]?.showcase, type).toBe(true);
    }
    for (const e of examples.filter((x) => x.twin !== null)) {
      expect(byId.get(e.twin ?? ("" as never))?.twin_of).toBe(e.lesson_question_id);
    }
  });

  it("write every example in both languages, and a 2nd import changes nothing", async () => {
    const store = new InMemoryStore();
    const first = await importExamples(store);
    expect(first.pl.length).toBe(EXAMPLES.length);
    expect(first.en.length).toBe(EXAMPLES.length);
    await importExamples(store);
    const listed = await store.listExamples(FEATURED_POD.id, "pl");
    expect(listed).toHaveLength(EXAMPLES.length);
    expect(new Set(listed.map((e) => e.question.id))).toEqual(
      new Set(first.pl.map((e) => e.lesson_question_id)),
    );
  });
});
