import type { RunId } from "@jadwigo/contracts/run";
import { check } from "@jadwigo/lesson-import/check";
import { parseLessonFileLenient } from "@jadwigo/lesson-import/file";
import { describe, expect, it } from "vitest";
import { contextFor, runId } from "../testing/context.ts";
import { type BankPort, createVerbs, fixtureBank } from "./index.ts";
import { type VerbContext, type VerbEffect, VerbError } from "./types.ts";

const DRAFT = { request: "a short lesson", grade: "1", names: [], topic: "addition" };

/** A bank that counts what it is asked, around the fixture. */
function countingBank() {
  const inner = fixtureBank();
  const asked = { search: 0, sources: 0 };
  const bank: BankPort = {
    search: (q) => {
      asked.search += 1;
      return inner.search(q);
    },
    sources: (q) => {
      asked.sources += 1;
      return inner.sources(q);
    },
  };
  return { bank, asked };
}

/** A run with a drafted lesson at revision 1, as the runner hands it to the next verb. */
async function drafted(input: Record<string, unknown> = DRAFT) {
  const verbs = createVerbs({ bank: fixtureBank() });
  const run = runId();
  const effect = await verbs.lesson_draft.run(contextFor(run, "call_1"), input);
  const lesson_file = effect.lesson_file;
  if (lesson_file === undefined) throw new Error("lesson_draft answered no file");
  const at = (call_id: string): VerbContext =>
    contextFor(run, call_id, { revision: 1, lesson_file });
  return { verbs, run, effect, lesson_file, at };
}

function stepsOf(file: Record<string, unknown> | undefined) {
  return parseLessonFileLenient(file).file.script.parts.flatMap((p) => p.steps);
}

describe("lesson_draft", () => {
  it("drafts a lesson file the page reads whole and check() passes", async () => {
    const { effect, lesson_file, run } = await drafted();
    const parsed = parseLessonFileLenient(lesson_file);
    expect(parsed.skipped).toEqual([]);
    expect(stepsOf(lesson_file)).toHaveLength(6);
    expect(check(lesson_file)).toMatchObject({ ok: true, findings: [], questions: 6 });
    expect(effect.output).toMatchObject({ draft_id: run, language: "pl", left_out: [] });
    expect((effect.output["steps"] as { you_write: string[] }[])[0]?.you_write).toEqual([]);
  });

  it("drafts in the language asked for, with the count asked for", async () => {
    const { lesson_file } = await drafted({
      ...DRAFT,
      language: "en",
      count: 3,
      topic: "subtraction",
    });
    expect(lesson_file["language"]).toBe("en");
    const steps = stepsOf(lesson_file);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatchObject({ say: "What is 12 - 5?" });
    expect(check(lesson_file).ok).toBe(true);
  });

  it("refuses input it does not take, a pod above all", async () => {
    const verbs = createVerbs({ bank: fixtureBank() });
    const context = contextFor(runId(), "call_1");
    await expect(verbs.lesson_draft.run(context, { ...DRAFT, pod: "pod_x" })).rejects.toMatchObject(
      {
        type: "input",
      },
    );
    await expect(verbs.lesson_draft.run(context, { ...DRAFT, grade: 1 })).rejects.toBeInstanceOf(
      VerbError,
    );
    await expect(
      verbs.lesson_draft.run(context, { ...DRAFT, language: "de" }),
    ).rejects.toBeInstanceOf(VerbError);
  });

  it("refuses when the bank has nothing", async () => {
    const empty: BankPort = { search: async () => ({ sets: [] }), sources: async () => [] };
    const verbs = createVerbs({ bank: empty });
    await expect(
      verbs.lesson_draft.run(contextFor(runId(), "call_1"), DRAFT),
    ).rejects.toMatchObject({
      type: "no-questions",
    });
  });
});

describe("a verb is idempotent by call_id", () => {
  it("a second call with one call id answers the first effect and reads the bank once", async () => {
    const { bank, asked } = countingBank();
    const verbs = createVerbs({ bank });
    const run = runId();
    const first = await verbs.lesson_draft.run(contextFor(run, "call_1"), DRAFT);
    const again = await verbs.lesson_draft.run(contextFor(run, "call_1"), DRAFT);
    expect(again).toEqual(first);
    expect(asked.sources).toBe(1);
    await verbs.lesson_draft.run(contextFor(run, "call_2"), DRAFT);
    expect(asked.sources).toBe(2);
  });

  it("an edit replayed on the lesson it already wrote writes the same file", async () => {
    const { lesson_file, run } = await drafted();
    const patch = { question: { help: { look: { text: "Policz na palcach." } } } };
    const input = { draft_id: run, step_id: "s01", patch, why: "the parent asked" };
    const once = await createVerbs({ bank: fixtureBank() }).lesson_edit.run(
      contextFor(run, "call_2", { revision: 1, lesson_file }),
      input,
    );
    // Another process, after the crash: the log already holds the edit's revision.
    const replayed = await createVerbs({ bank: fixtureBank() }).lesson_edit.run(
      contextFor(run, "call_2", { revision: 2, lesson_file: once.lesson_file ?? {} }),
      input,
    );
    expect(stepsOf(replayed.lesson_file)[0]).toEqual(stepsOf(once.lesson_file)[0]);
  });

  it("a refusal is not remembered", async () => {
    const verbs = createVerbs({ bank: fixtureBank() });
    const context = contextFor(runId(), "call_1");
    await expect(verbs.lesson_draft.run(context, { ...DRAFT, grade: 1 })).rejects.toBeInstanceOf(
      VerbError,
    );
    await expect(verbs.lesson_draft.run(context, DRAFT)).resolves.toHaveProperty("lesson_file");
  });
});

describe("lesson_check", () => {
  it("answers check()'s findings and a card, and writes nothing for help {}", async () => {
    const { verbs, run, at } = await drafted();
    const effect = await verbs.lesson_check.run(at("call_2"), { draft_id: run, help: {} });
    expect(effect.lesson_file).toBeUndefined();
    expect(effect.output).toMatchObject({ ok: true, findings: [], questions: 6 });
    expect((effect.output["card"] as { steps: unknown[] }).steps).toHaveLength(6);
  });

  it("puts the model's words on a step and answers the whole file", async () => {
    const { verbs, run, at } = await drafted();
    const effect = await verbs.lesson_check.run(at("call_2"), {
      draft_id: run,
      help: { s02: { boost_by_mistake: { other_wrong: { text: "Policz jeszcze raz." } } } },
      title: "Dodawanie do 20",
    });
    expect(effect.lesson_file?.["title"]).toBe("Dodawanie do 20");
    expect(stepsOf(effect.lesson_file)[1]).toMatchObject({
      question: { help: { boost_by_mistake: { other_wrong: { text: "Policz jeszcze raz." } } } },
    });
    expect(effect.output["ok"]).toBe(true);
  });

  it("reports an error finding by step id", async () => {
    const { verbs, run, at } = await drafted();
    const effect = await verbs.lesson_check.run(at("call_2"), {
      draft_id: run,
      help: { s01: { boost_by_mistake: { no_such_class: { text: "?" } } } },
    });
    expect(effect.output["ok"]).toBe(false);
    expect(effect.output["findings"]).toEqual(
      expect.arrayContaining([expect.objectContaining({ step_id: "s01", level: "error" })]),
    );
    expect(effect.output["card"]).toBeNull();
  });

  it("refuses another run's draft, a missing draft, a missing step and words it does not take", async () => {
    const { verbs, run, at } = await drafted();
    const refusal = (context: VerbContext, input: Record<string, unknown>) =>
      verbs.lesson_check.run(context, input).then(
        () => null,
        (e: VerbError) => e.type,
      );
    expect(await refusal(at("call_2"), { draft_id: runId(), help: {} })).toBe("unknown-draft");
    expect(await refusal(contextFor(run, "call_3"), { draft_id: run, help: {} })).toBe("no-draft");
    expect(await refusal(at("call_4"), { draft_id: run, help: { s99: {} } })).toBe("unknown-step");
    expect(await refusal(at("call_5"), { draft_id: run, help: { s01: { say: "x" } } })).toBe(
      "input",
    );
  });
});

describe("lesson_edit", () => {
  it("applies a JSON merge patch to one step and records a change to the copy", async () => {
    const { verbs, run, at, lesson_file } = await drafted();
    const effect = await verbs.lesson_edit.run(at("call_2"), {
      draft_id: run,
      step_id: "s01",
      patch: { say: "Ile to razem: 7 + 5?", question: { help: { boost: null } } },
      why: "the parent asked for other words",
    });
    const [edited, untouched] = stepsOf(effect.lesson_file);
    expect(edited).toMatchObject({
      say: "Ile to razem: 7 + 5?",
      based_on: {
        changes: [{ change: "wording", why: "the parent asked for other words", reviewed: false }],
      },
    });
    expect(edited && "question" in edited ? edited.question.help : null).not.toHaveProperty(
      "boost",
    );
    expect(untouched).toEqual(stepsOf(lesson_file)[1]);
    expect(effect.output).toMatchObject({ ok: true, step_id: "s01", lesson_ok: true });
    expect((effect.output["card"] as { you_write: string[] }).you_write).toEqual(["boost"]);
  });

  it("refuses a change to the copy without why, a part it does not set, and a step that would not parse", async () => {
    const { verbs, run, at } = await drafted();
    const type = (patch: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
      verbs.lesson_edit
        .run(at(`call_${JSON.stringify(patch)}`), {
          draft_id: run,
          step_id: "s01",
          patch,
          ...extra,
        })
        .then(
          () => null,
          (e: VerbError) => e.type,
        );
    expect(await type({ say: "x" })).toBe("why-needed");
    expect(await type({ id: "s09" })).toBe("edit");
    expect(await type({ question: { family: "choose" } })).toBe("edit");
    expect(await type({ question: { help: "none" } }, { why: "w" })).toBe("edit");
  });

  it("needs no why for a rung the copy left empty", async () => {
    const { verbs, run, lesson_file } = await drafted();
    const bare = await verbs.lesson_edit.run(
      contextFor(run, "call_2", { revision: 1, lesson_file }),
      {
        draft_id: run,
        step_id: "s01",
        patch: { question: { help: { boost: null } } },
        why: "the parent asked for no boost",
      },
    );
    const effect = await verbs.lesson_edit.run(
      contextFor(run, "call_3", { revision: 2, lesson_file: bare.lesson_file ?? {} }),
      {
        draft_id: run,
        step_id: "s01",
        patch: { question: { help: { boost: { text: "Dolicz po jednym." } } } },
      },
    );
    // One change, the removal's: writing the rung back into an empty place needed no why.
    expect(stepsOf(effect.lesson_file)[0]).toMatchObject({
      based_on: { changes: [{ why: "the parent asked for no boost" }] },
    });
  });
});

describe("lesson_show and question_search", () => {
  it("shows every step or one, each with its findings", async () => {
    const { verbs, run, at } = await drafted();
    const all = await verbs.lesson_show.run(at("call_2"), { draft_id: run });
    expect((all.output["steps"] as unknown[]).length).toBe(6);
    expect(all.lesson_file).toBeUndefined();
    const one: VerbEffect = await verbs.lesson_show.run(at("call_3"), {
      draft_id: run,
      step_id: "s02",
    });
    expect(one.output["steps"]).toEqual([
      expect.objectContaining({ step: expect.objectContaining({ id: "s02" }), findings: [] }),
    ]);
    await expect(
      verbs.lesson_show.run(at("call_4"), { draft_id: run, step_id: "s77" }),
    ).rejects.toMatchObject({
      type: "unknown-step",
    });
  });

  it("finds the set that meets the need first", async () => {
    const verbs = createVerbs({ bank: fixtureBank() });
    const context = contextFor(runId() as RunId, "call_1");
    const found = await verbs.question_search.run(context, {
      grade: "2",
      words: "odejmowanie",
      language: "pl",
    });
    const sets = found.output["sets"] as { set_id: string }[];
    expect(sets.map((s) => s.set_id)).toEqual(["set_fixture-sub-20", "set_fixture-add-20"]);
    await expect(
      verbs.question_search.run(contextFor(runId(), "call_2"), { words: "x" }),
    ).rejects.toMatchObject({
      type: "input",
    });
  });
});

describe("the fixture bank", () => {
  it("holds made-up questions only", async () => {
    const questions = await fixtureBank().sources({
      grade: "1",
      words: null,
      language: "en",
      skills: [],
      limit: 50,
    });
    expect(questions.every((q) => q.source.startsWith("authored:fixture-"))).toBe(true);
  });
});
