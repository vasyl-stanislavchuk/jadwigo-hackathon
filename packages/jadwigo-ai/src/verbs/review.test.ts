import { describe, expect, it } from "vitest";
import { contextFor, runId } from "../testing/context.ts";
import { createVerbs, fixtureBank } from "./index.ts";
import { HARSH_WORD_RULE, review } from "./review.ts";
import type { VerbContext } from "./types.ts";

/**
 * AI-written lesson text passes the checks a hand-written lesson passes before a parent can publish
 * it (Lead decision 25, `dl-z5ja.31`): every revision a verb writes is reviewed by check() and the
 * harsh-word check, and one with an error finding is marked not publishable.
 */

const DRAFT = { request: "a short lesson", grade: "1", names: [], topic: "addition" };

async function drafted() {
  const verbs = createVerbs({ bank: fixtureBank() });
  const run = runId();
  const effect = await verbs.lesson_draft.run(contextFor(run, "call_1"), DRAFT);
  const lesson_file = effect.lesson_file;
  if (lesson_file === undefined) throw new Error("lesson_draft answered no file");
  const at = (call_id: string): VerbContext =>
    contextFor(run, call_id, { revision: 1, lesson_file });
  return { verbs, run, effect, at };
}

const harsh = expect.objectContaining({ step_id: "s02", level: "error", rule: HARSH_WORD_RULE });

describe("a lesson revision is reviewed before it can be published", () => {
  it("a drafted lesson from the bank is publishable", async () => {
    const { effect } = await drafted();
    expect(effect.output).toMatchObject({ publishable: true, findings: [] });
  });

  it("a bare 'źle' in an AI hint is an error finding on its question, and blocks publish", async () => {
    const { verbs, run, at } = await drafted();
    const effect = await verbs.lesson_check.run(at("call_2"), {
      draft_id: run,
      names: [],
      help: { s02: { boost_by_mistake: { other_wrong: { text: "Źle. Policz jeszcze raz." } } } },
    });
    expect(effect.lesson_file).toBeDefined();
    expect(effect.output).toMatchObject({ ok: false, publishable: false, card: null });
    expect(effect.output["findings"]).toEqual([
      expect.objectContaining({
        step_id: "s02",
        path: "script.parts[0].steps[1].question.help.boost_by_mistake.other_wrong.text",
        level: "error",
        rule: HARSH_WORD_RULE,
        text: expect.stringContaining('"źle"'),
      }),
    ]);
    expect(effect.view).toEqual({
      kind: "lesson_check",
      data: { publishable: false, findings: [harsh] },
    });
  });

  it("a bare 'wrong' in an edited hint blocks too, and a kind 'Jeszcze nie' passes", async () => {
    const { verbs, run, at } = await drafted();
    const edit = (call_id: string, text: string) =>
      verbs.lesson_edit.run(at(call_id), {
        draft_id: run,
        names: [],
        step_id: "s02",
        patch: { question: { help: { look: { text } } } },
        why: "the parent asked for a shorter hint",
      });
    const blocked = await edit("call_2", "Wrong! Look again.");
    expect(blocked.output).toMatchObject({ ok: false, lesson_ok: false, publishable: false });
    expect(blocked.output["findings"]).toEqual([harsh]);

    const kind = await edit("call_3", "Jeszcze nie. Spójrz jeszcze raz na znak.");
    expect(kind.output).toMatchObject({
      ok: true,
      lesson_ok: true,
      publishable: true,
      findings: [],
    });
  });

  it("a check() error blocks publish as a harsh word does", async () => {
    const { verbs, run, at } = await drafted();
    const effect = await verbs.lesson_check.run(at("call_2"), {
      draft_id: run,
      names: [],
      help: { s01: { boost_by_mistake: { no_such_class: { text: "Policz jeszcze raz." } } } },
    });
    expect(effect.output).toMatchObject({ ok: false, publishable: false });
    const data = effect.view?.data as { findings: { rule: string; level: string }[] } | undefined;
    const findings = data?.findings ?? [];
    expect(findings.some((f) => f.level === "error" && f.rule !== HARSH_WORD_RULE)).toBe(true);
    expect(findings.some((f) => f.rule === HARSH_WORD_RULE)).toBe(false);
  });

  it("lesson_show draws a harsh finding on its step, and a check with help {} writes nothing", async () => {
    const { verbs, run, at } = await drafted();
    const edited = await verbs.lesson_edit.run(at("call_2"), {
      draft_id: run,
      names: [],
      step_id: "s02",
      patch: { say: "Ile to? Nie zgaduj, bo będzie źle." },
      why: "the parent asked for another prompt",
    });
    const next = contextFor(run, "call_3", { revision: 2, lesson_file: edited.lesson_file ?? {} });
    const shown = await verbs.lesson_show.run(next, { draft_id: run, step_id: "s02" });
    expect(shown.output).toMatchObject({ lesson_ok: false, steps: [{ findings: [harsh] }] });
    const checked = await verbs.lesson_check.run(contextFor(run, "call_4", next.lesson), {
      draft_id: run,
      names: [],
      help: {},
    });
    expect(checked.lesson_file).toBeUndefined();
    expect(checked.view).toEqual({
      kind: "lesson_check",
      data: { publishable: false, findings: [harsh] },
    });
    expect(checked.output).toMatchObject({ ok: false, findings: [harsh] });
  });

  it("reads only what a child reads: not the key, an option's id, the parent's reason or test taps", () => {
    const file = {
      title: "Dodawanie",
      script: {
        parts: [
          {
            steps: [
              {
                id: "s01",
                reason: { why: { en: "The child gets this wrong often." } },
                scenarios: [{ try: { en: "Tap the wrong answer" } }],
                question: {
                  family: "choose",
                  data: { options: [{ id: "wrong", content: { kind: "text", text: "7" } }] },
                  key: { correct: ["7"], near: { "8": "mistake" } },
                },
              },
            ],
          },
        ],
      },
    };
    const found = review(file).findings.filter((f) => f.rule === HARSH_WORD_RULE);
    expect(found).toEqual([]);
    file.title = "Bad maths";
    expect(review(file).findings.filter((f) => f.rule === HARSH_WORD_RULE)).toEqual([
      expect.objectContaining({ step_id: null, path: "title" }),
    ]);
  });
});
