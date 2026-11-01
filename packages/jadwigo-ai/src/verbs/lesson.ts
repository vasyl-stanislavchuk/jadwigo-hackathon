import { isDeepStrictEqual } from "node:util";
import { ID_PREFIXES, uuidOf } from "@jadwigo/contracts";
import { type CheckResult, check } from "@jadwigo/lesson-import/check";
import { type Finding, parseLessonFileLenient } from "@jadwigo/lesson-import/file";
import type { BankLanguage, BankPort, BankQuery } from "./bank.ts";
import { Input, isObject, type Json, mergePatch } from "./input.ts";
import type { VerbContext, VerbEffect } from "./types.ts";
import { VerbError } from "./types.ts";

/**
 * The bodies of the 5 verbs (Lead decisions 4, 11 and 21). Each reads the lesson from
 * `VerbContext.lesson`, the log's highest `lesson_revision`, and one that changes it answers the
 * whole file. A `draft_id` the model passes is the run's id. Before a verb answers a file, the
 * lenient parse the page runs must read every step of it; a change that would lose a step is
 * refused and changes nothing, as `jw lesson_edit` refuses it (`apps/cli/src/jw/lesson_edit.py`).
 */

const LANGUAGES = ["pl", "uk", "en"] as const satisfies readonly BankLanguage[];
const KINDS = ["practice", "review", "check", "diagnostic"] as const;
const CHANGES = ["numbers", "context", "wording", "tutor_notes"] as const;
/** What lesson_draft draws when the model names no count. */
const DEFAULT_COUNT = 6;
/** The rungs a step's help may hold, and its twin: what `you_write` lists when one is missing. */
const RUNGS = ["look", "boost", "almost", "worked", "twin"] as const;

const PART: Record<BankLanguage, string> = { pl: "Ćwiczenie", uk: "Вправа", en: "Practice" };
const REASONING: Record<BankLanguage, (topic: string, grade: string) => string> = {
  pl: (t, g) => `Szkic z czatu: ${t}, klasa ${g}. Pytania skopiowane z banku w całości.`,
  uk: (t, g) => `Чернетка з чату: ${t}, клас ${g}. Питання скопійовано з банку повністю.`,
  en: (t, g) => `A draft from the chat: ${t}, grade ${g}. Questions copied whole from the bank.`,
};

type Step = Json & { id: string };

function steps(file: Json): Step[] {
  const script = isObject(file["script"]) ? file["script"] : {};
  const parts = Array.isArray(script["parts"]) ? script["parts"] : [];
  return parts.flatMap((p: unknown) =>
    isObject(p) && Array.isArray(p["steps"])
      ? p["steps"].filter((s: unknown): s is Step => isObject(s) && typeof s["id"] === "string")
      : [],
  );
}

/** The lesson file with one step replaced, by id. */
function withStep(file: Json, step: Step): Json {
  const out = structuredClone(file);
  for (const s of steps(out)) {
    if (s.id === step.id) {
      for (const k of Object.keys(s)) delete s[k];
      Object.assign(s, structuredClone(step));
    }
  }
  return out;
}

/** The run's lesson, refusing a draft_id that is not this run's and a run with no draft yet. */
function draftOf(context: VerbContext, input: Input): Json {
  const draft_id = input.string("draft_id");
  if (draft_id !== context.run_id) {
    throw new VerbError(
      "unknown-draft",
      `no draft ${draft_id} in this conversation turn; it is ${context.run_id}`,
    );
  }
  if (context.lesson === null) {
    throw new VerbError("no-draft", "there is no lesson yet: call lesson_draft first");
  }
  return structuredClone(context.lesson.lesson_file);
}

function stepOf(file: Json, step_id: string): Step {
  const found = steps(file).find((s) => s.id === step_id);
  if (found === undefined) {
    const ids = steps(file).map((s) => s.id);
    throw new VerbError("unknown-step", `no step ${step_id}; the steps are ${ids.join(", ")}`);
  }
  return found;
}

/** The file as it will be written: the page's lenient parse must read every step of it. */
function writable(file: Json): Json {
  let skipped: ReturnType<typeof parseLessonFileLenient>["skipped"];
  try {
    skipped = parseLessonFileLenient(file).skipped;
  } catch (e) {
    throw new VerbError(
      "edit",
      `the lesson would not parse: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const first = skipped[0];
  if (first !== undefined) {
    throw new VerbError(
      "edit",
      `step ${first.step_id ?? `${first.part}.${first.index}`} would not parse at ${first.path}: ${first.message}; nothing changed`,
    );
  }
  return file;
}

/** A step's findings: its own and its twin's (compile names a twin `<id>t`). */
function findingsFor(result: CheckResult, step_id: string): Finding[] {
  return result.findings.filter((f) => f.step_id === step_id || f.step_id === `${step_id}t`);
}

/** What the model and the parent read of a step: its words and its key, not the whole JSON. */
function card(step: Step) {
  const question = isObject(step["question"]) ? step["question"] : {};
  const help = isObject(question["help"]) ? question["help"] : {};
  return {
    step_id: step.id,
    prompt: step["say"] ?? null,
    key: question["key"] ?? null,
    rungs: RUNGS.filter((r) => help[r] !== undefined),
    you_write: RUNGS.filter((r) => help[r] === undefined),
  };
}

function checked(file: Json) {
  const result = check(file);
  return {
    ok: result.ok,
    findings: result.findings,
    play_path: result.play_path,
    lesson_id: result.lesson_id,
    questions: result.questions,
    mistake_classes: result.mistake_classes,
  };
}

export async function lessonDraft(
  bank: BankPort,
  context: VerbContext,
  raw: Json,
): Promise<VerbEffect> {
  const input = new Input("lesson_draft", raw, [
    "request",
    "grade",
    "names",
    "topic",
    "language",
    "kind",
    "count",
    "skills",
    "verbose",
  ]);
  input.string("request");
  input.flag("verbose"); // jw's switch; the engine answers its compact form either way
  input.strings("names", true);
  const grade = input.string("grade");
  const topic = input.string("topic");
  const language = input.oneOf("language", LANGUAGES, "pl");
  const kind = input.oneOf("kind", KINDS, "practice");
  const count = input.optionalInt("count", 1, 20) ?? DEFAULT_COUNT;
  const query: BankQuery = {
    grade,
    words: topic,
    language,
    skills: input.strings("skills", false),
    limit: count,
  };
  const questions = await bank.sources(query);
  const first = questions[0];
  if (first === undefined) {
    throw new VerbError("no-questions", `the bank has no question for "${topic}", grade ${grade}`);
  }
  const drawn: Step[] = questions.map((q, i) => ({
    id: `s${String(i + 1).padStart(2, "0")}`,
    question_type: q.question_type,
    skill_ids: [...q.skill_ids],
    based_on: { question: q.source, changes: [] },
    say: q.say,
    question: structuredClone(q.question),
  }));
  const title = topic.charAt(0).toUpperCase() + topic.slice(1);
  const lesson_file = writable({
    // The file id is the run's: one draft per turn, and `check()` names its play path from it.
    id: `draft-${uuidOf(ID_PREFIXES.run, context.run_id).replaceAll("-", "")}`,
    title,
    language,
    category: "child",
    subject: first.subject,
    reasoning: REASONING[language](topic, grade),
    kind,
    script: { parts: [{ part: PART[language], steps: drawn }] },
  });
  return {
    output: {
      draft_id: context.run_id,
      title,
      language,
      steps: drawn.map((s, i) => ({
        ...card(s),
        twin_source:
          questions[i]?.question.help["twin"] === undefined
            ? null
            : `the bank ${questions[i]?.source}`,
        why_drawn: questions[i]?.set_id ?? null,
      })),
      left_out: [],
      rule_settled: false,
    },
    lesson_file,
  };
}

export function lessonShow(context: VerbContext, raw: Json): Promise<VerbEffect> {
  const input = new Input("lesson_show", raw, ["draft_id", "step_id"]);
  const file = draftOf(context, input);
  const step_id = input.optionalString("step_id");
  const result = check(file);
  const shown = step_id === null ? steps(file) : [stepOf(file, step_id)];
  return Promise.resolve({
    output: {
      draft_id: context.run_id,
      revision: context.lesson?.revision ?? null,
      title: file["title"] ?? null,
      steps: shown.map((step) => ({ step, findings: findingsFor(result, step.id) })),
      lesson_ok: result.ok,
    },
  });
}

/** The words lesson_check takes for a step: what `you_write` lists, under `question.help`. */
const HELP_WORDS = ["twin", "boost_by_mistake", "look", "boost", "almost", "worked"];

export function lessonCheck(context: VerbContext, raw: Json): Promise<VerbEffect> {
  const input = new Input("lesson_check", raw, [
    "draft_id",
    "help",
    "title",
    "reasoning",
    "names",
    "full",
    "verbose",
  ]);
  // jw's switches for a longer answer; the engine answers its compact form either way.
  input.flag("full");
  input.flag("verbose");
  let file = draftOf(context, input);
  const help = input.object("help");
  input.strings("names", false);
  const title = input.optionalString("title");
  const reasoning = input.optionalString("reasoning");
  for (const [step_id, words] of Object.entries(help)) {
    const step = stepOf(file, step_id);
    if (!isObject(words))
      throw new VerbError("input", `lesson_check: help.${step_id} is an object`);
    const unknown = Object.keys(words).filter((k) => !HELP_WORDS.includes(k));
    if (unknown.length > 0) {
      throw new VerbError(
        "input",
        `lesson_check: help.${step_id} takes ${HELP_WORDS.join(", ")}; to change ${unknown.join(", ")} use lesson_edit`,
      );
    }
    const after = mergePatch(step, { question: { help: words } }) as Step;
    const copied = copiedChanges(step, after);
    if (copied.length > 0) {
      throw new VerbError(
        "copied-rung",
        `step ${step_id}: ${copied.join(", ")} is copied from the bank; lesson_check fills only what the copy leaves empty, so edit the copied part with lesson_edit and a why; nothing changed`,
      );
    }
    file = withStep(file, after);
  }
  if (title !== null) file["title"] = title;
  if (reasoning !== null) file["reasoning"] = reasoning;
  const changed = Object.keys(help).length > 0 || title !== null || reasoning !== null;
  const result = checked(changed ? writable(file) : file);
  const output = {
    draft_id: context.run_id,
    ...result,
    card: result.ok ? { title: file["title"] ?? null, steps: steps(file).map(card) } : null,
  };
  return Promise.resolve(changed ? { output, lesson_file: file } : { output });
}

/** The parts a patch may set: `say`, and the question's `data`, `key` and `help`. */
const QUESTION_PARTS = ["data", "key", "help"];
/** The rungs of a step's help, and its twin: a part the step already holds is the bank's copy. */
const COPIED_HELP = ["look", "boost", "almost", "worked", "twin"];

function partsOf(step: Step) {
  const question = isObject(step["question"]) ? step["question"] : {};
  const help = isObject(question["help"]) ? question["help"] : {};
  const cards = isObject(help["boost_by_mistake"]) ? help["boost_by_mistake"] : {};
  return { question, help, cards };
}

/**
 * The parts of the bank's copy a change would alter: `say`, the question's `data` and `key`, a
 * rung or the twin the step holds, and a mistake card it holds. Read from the step before and
 * after, so removing a part (a null rung, a null help) counts as much as replacing it, and a
 * replay that changes nothing alters nothing. Changing one needs `why`, the parent's ask.
 */
function copiedChanges(before: Step, after: Step): string[] {
  const was = partsOf(before);
  const now = partsOf(after);
  const differs = (a: unknown, b: unknown) => a !== undefined && !isDeepStrictEqual(a, b);
  return [
    ...(differs(before["say"], after["say"]) ? ["say"] : []),
    ...["data", "key"].filter((k) => differs(was.question[k], now.question[k])),
    ...COPIED_HELP.filter((k) => differs(was.help[k], now.help[k])),
    ...Object.keys(was.cards)
      .filter((k) => differs(was.cards[k], now.cards[k]))
      .map((k) => `boost_by_mistake.${k}`),
  ];
}

export function lessonEdit(context: VerbContext, raw: Json): Promise<VerbEffect> {
  const input = new Input("lesson_edit", raw, [
    "draft_id",
    "step_id",
    "patch",
    "why",
    "change",
    "names",
  ]);
  const file = draftOf(context, input);
  const step_id = input.string("step_id");
  const patch = input.object("patch");
  const why = input.optionalString("why");
  const change = input.oneOf("change", CHANGES, "wording");
  input.strings("names", false);
  const step = stepOf(file, step_id);

  const refused = Object.keys(patch).filter((k) => k !== "say" && k !== "question");
  const question = patch["question"];
  if (question !== undefined && !isObject(question)) refused.push("question");
  if (isObject(question)) {
    refused.push(
      ...Object.keys(question)
        .filter((k) => !QUESTION_PARTS.includes(k))
        .map((k) => `question.${k}`),
    );
  }
  if (refused.length > 0) {
    throw new VerbError(
      "edit",
      `a patch sets say and question's data, key and help, not ${refused.join(", ")}; nothing changed`,
    );
  }

  const edited = mergePatch(step, patch) as Step;
  edited.id = step.id;
  const copied = copiedChanges(step, edited);
  if (copied.length > 0 && (why === null || why.trim() === "")) {
    throw new VerbError(
      "why-needed",
      `changing ${copied.join(", ")} changes the bank's copy: pass why, the parent's ask; nothing changed`,
    );
  }
  // A patch that changes nothing records nothing: a replay on the lesson it already wrote.
  const changes = !isDeepStrictEqual(edited, step);
  if (
    changes &&
    copied.length > 0 &&
    isObject(edited["based_on"]) &&
    Array.isArray(edited["based_on"]["changes"])
  ) {
    edited["based_on"]["changes"] = [
      ...edited["based_on"]["changes"],
      { change, why, reviewed: false },
    ];
  }
  const lesson_file = writable(withStep(file, edited));
  const result = check(lesson_file);
  const findings = findingsFor(result, step_id);
  return Promise.resolve({
    output: {
      draft_id: context.run_id,
      ok: !findings.some((f) => f.level === "error"),
      step_id,
      findings,
      card: card(edited),
      lesson_ok: result.ok,
    },
    lesson_file,
  });
}

export async function questionSearch(bank: BankPort, raw: Json): Promise<VerbEffect> {
  const input = new Input("question_search", raw, [
    "grade",
    "words",
    "words_en",
    "skills",
    "mistakes",
    "language",
    "limit",
    "arm",
    "stage",
  ]);
  input.strings("mistakes", false);
  input.optionalString("arm");
  input.optionalString("stage");
  const query: BankQuery = {
    grade: input.string("grade"),
    words: input.optionalString("words") ?? input.optionalString("words_en"),
    language: input.oneOf("language", LANGUAGES, "pl"),
    skills: input.strings("skills", false),
    limit: input.optionalInt("limit", 1, 50) ?? 20,
  };
  const { sets } = await bank.search(query);
  return { output: { sets } };
}
