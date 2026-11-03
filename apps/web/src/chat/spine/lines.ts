/**
 * A tool line in the parent's words (dl-uukj.47.30; research §15.3, "each line is a sentence in the
 * parent's language, never a verb name or JSON"): each verb's icon, and its sentence built from the
 * call's typed input ("Szukanie zadań o: odejmowanie do 20"), or the verb's plain sentence when the
 * input gives nothing to say. Icons are decorative: the sentence and the state are the text.
 *
 * The spine's done lines live here too (wave dl-uukj.47.71, handoff §2 items 4 and 8, S2): what a
 * finished call did, as a copy key with values, one line per verb per stage visit with the calls
 * merged. The engine's own text never reaches them; a call whose result says too little falls back
 * to the verb's sentence above.
 */

import type { VerbName } from "@jadwigo/contracts/run";
import type { CopyKey } from "@jadwigo/copy";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Eye,
  LayoutList,
  Lightbulb,
  ListFilter,
  type LucideIcon,
  NotebookPen,
  PencilLine,
  Search,
  Target,
} from "lucide-react";
import type { ObjectRef } from "../objects/ref.ts";
import { TOOL_KEY } from "../tools.ts";
import { lessonFacts, onlyHelpChanged, positionOf } from "./lessonFile.ts";
import type { SpineTag, Words } from "./types.ts";

export const TOOL_ICON: Readonly<Record<VerbName, LucideIcon>> = {
  question_search: Search,
  question_types: ListFilter,
  lesson_draft: LayoutList,
  lesson_edit: PencilLine,
  lesson_check: ClipboardCheck,
  lesson_show: Eye,
  learner_skills: Target,
  learner_week: CalendarDays,
  learner_mistakes: NotebookPen,
  curriculum_topics: BookOpen,
  lesson_ideas: Lightbulb,
};

/** What a line's sentence may draw on besides the call's input. */
export interface LineContext {
  /** A learner's first name by id, from the parent's family; null when it is not one of theirs. */
  nameOf?: (learner: string) => string | null;
  /** Sends words as the parent's message: a widget's "Ułóż tę lekcję" (dl-z5ja.129). */
  onAsk?: (text: string) => void;
  /** Opens a thing beside the chat (objects/ref.ts, dl-uukj.47.58). */
  onOpen?: (object: ObjectRef) => void;
  /** The answers given in this page to an approval's choose form, by its call (dl-uukj.47.35). */
  chosen?: (call_id: string) => readonly (string | null)[] | undefined;
}

interface Sentence {
  key: CopyKey;
  vars: Record<string, string>;
}

/** A non-empty string field of the input, trimmed, or null. */
function field(input: Record<string, unknown> | undefined, name: string): string | null {
  const value = input?.[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** The sentence for one call: built from its input where the input says enough. */
function sentenceOf(
  verb: VerbName,
  input: Record<string, unknown> | undefined,
  context: LineContext = {},
): Sentence {
  const plain: Sentence = { key: TOOL_KEY[verb], vars: {} };
  const about = (key: CopyKey, name: string, value: string | null): Sentence =>
    value === null ? plain : { key, vars: { [name]: value } };
  const child = (): string | null => {
    const id = field(input, "learner_id");
    return id === null ? null : (context.nameOf?.(id) ?? null);
  };
  switch (verb) {
    case "lesson_draft":
      return about("chat_tool_lesson_draft_about", "topic", field(input, "topic"));
    case "question_search":
      return about("chat_tool_question_search_about", "topic", field(input, "words"));
    case "question_types":
      return plain;
    case "lesson_edit":
      return about("chat_tool_lesson_edit_step", "step", field(input, "step_id"));
    case "lesson_show":
      return about("chat_tool_lesson_show_step", "step", field(input, "step_id"));
    case "lesson_check":
      return about("chat_tool_lesson_check_about", "title", field(input, "title"));
    case "curriculum_topics":
      return about("chat_tool_curriculum_topics_about", "topic", field(input, "words"));
    case "learner_skills":
      return about("chat_tool_learner_skills_about", "child", child());
    case "learner_week":
      return about("chat_tool_learner_week_about", "child", child());
    case "learner_mistakes":
      return about("chat_tool_learner_mistakes_about", "child", child());
    case "lesson_ideas":
      return about("chat_tool_lesson_ideas_about", "child", child());
  }
}

/**
 * The pass-through key: words that are already the parent's or the lesson's, never the engine's (the
 * model's own sentence on the now line, D4; a bank set's title on a search tag, S14).
 */
export const SAY_KEY: CopyKey = "chat_line_say";
/** "Poprawiłam zadania {list}": an edit that did more than the help. */
const EDIT_CHANGED_KEY: CopyKey = "chat_line_edit_changed";
/** "Szukałam „{query}”: {n} zestawy": a search with no grade. */
const SEARCH_ANY_KEY: CopyKey = "chat_line_search_any";

/** The done line of a verb whose result the spine does not count: what it did, in one sentence. */
const DONE_KEY: Partial<Readonly<Record<VerbName, CopyKey>>> = {
  question_types: "chat_line_types",
  learner_skills: "chat_line_skills",
  learner_week: "chat_line_week",
  learner_mistakes: "chat_line_mistakes",
  curriculum_topics: "chat_line_topics",
  lesson_ideas: "chat_line_ideas",
};

/** Words that are already the parent's or the lesson's, through the pass-through key. */
export const sayWords = (text: string): Words => ({ copyKey: SAY_KEY, values: { text } });

/** Verbs whose sentence names a step by its id, which never reaches the parent (S3). */
const NAMES_A_STEP: ReadonlySet<VerbName> = new Set(["lesson_edit", "lesson_show"]);

/**
 * The verb's sentence from its input, as Words: the now line of a call with no sentence of its
 * own, and a done line's fallback. A step's id is never one of the values.
 */
export function plainWords(verb: VerbName, input: Record<string, unknown> | undefined): Words {
  if (NAMES_A_STEP.has(verb)) return { copyKey: TOOL_KEY[verb], values: {} };
  const { key, vars } = sentenceOf(verb, input);
  return { copyKey: key, values: vars };
}

/** A lesson_check's output read leniently: a log may leave out `publishable` when nothing was found. */
export interface CheckRead {
  publishable: boolean;
  findings: readonly { step_id: string | null; level: string }[];
}

export function checkOf(output: Record<string, unknown> | null | undefined): CheckRead | null {
  if (output == null || !Array.isArray(output["findings"])) return null;
  const findings = output["findings"].flatMap((f: unknown) => {
    if (typeof f !== "object" || f === null) return [];
    const { step_id, level } = f as { step_id?: unknown; level?: unknown };
    return [
      {
        step_id: typeof step_id === "string" ? step_id : null,
        level: typeof level === "string" ? level : "error",
      },
    ];
  });
  const stated = output["publishable"];
  const publishable =
    typeof stated === "boolean" ? stated : findings.every((f) => f.level !== "error");
  return { publishable, findings };
}

/** One finished call, with what the log says about the lesson around it. */
export interface DoneCall {
  verb: VerbName;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  /** The lesson file this call wrote (its `lesson_revision`), when it wrote one. */
  wrote?: unknown;
  /** The lesson file just before this call, when the turn had one. */
  before?: unknown;
  /** Step ids the turn knew to be in the lesson before this call, from revisions and reads. */
  known: ReadonlySet<string>;
}

/** What one verb's calls in one stage visit add up to: the merge of S2. */
export interface Merge {
  verb: VerbName;
  /** The latest call's input: the fallback sentence reads it. */
  input: Record<string, unknown>;
  query: string | null;
  grade: string | null;
  /** Search sets by id, first seen first: the engine lists them by fit. */
  sets: Map<string, string>;
  /** Edits: the steps' places in the lesson, by what changed. */
  added: Set<number>;
  hints: Set<number>;
  changed: Set<number>;
  /** An edit whose steps could not be placed in the lesson. */
  unplaced: boolean;
  title: string;
  count: number | null;
  topic: string | null;
  check: CheckRead | null;
}

export const emptyMerge = (verb: VerbName): Merge => ({
  verb,
  input: {},
  query: null,
  grade: null,
  sets: new Map(),
  added: new Set(),
  hints: new Set(),
  changed: new Set(),
  unplaced: false,
  title: "",
  count: null,
  topic: null,
  check: null,
});

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/** Folds one more finished call of the merge's verb into it. */
export function mergeCall(merge: Merge, call: DoneCall): void {
  merge.input = call.input;
  const out = call.output ?? {};
  switch (call.verb) {
    case "question_search": {
      merge.query = text(call.input["query"]) ?? text(call.input["words"]) ?? merge.query;
      merge.grade = text(call.input["grade"]) ?? merge.grade;
      const sets = Array.isArray(out["sets"]) ? out["sets"] : [];
      for (const set of sets) {
        if (typeof set !== "object" || set === null) continue;
        const { set_id, title } = set as { set_id?: unknown; title?: unknown };
        const id = text(set_id);
        const name = text(title);
        if (id !== null && name !== null && !merge.sets.has(id)) merge.sets.set(id, name);
      }
      return;
    }
    case "lesson_draft": {
      merge.topic = text(call.input["topic"]);
      merge.count = call.wrote === undefined ? null : lessonFacts(call.wrote).count;
      return;
    }
    case "lesson_edit": {
      const listed = out["changed_step_ids"];
      const ids = Array.isArray(listed)
        ? listed.flatMap((id) => (typeof id === "string" ? [id] : []))
        : [text(call.input["step_id"])].flatMap((id) => (id === null ? [] : [id]));
      if (call.wrote === undefined) {
        merge.unplaced = true;
        return;
      }
      merge.title = lessonFacts(call.wrote).title;
      for (const id of ids) {
        const at = positionOf(call.wrote, id);
        if (at === null) merge.unplaced = true;
        else if (call.known.size > 0 && !call.known.has(id)) merge.added.add(at);
        else if (onlyHelpChanged(call.before, call.wrote, id)) merge.hints.add(at);
        else merge.changed.add(at);
      }
      return;
    }
    case "lesson_check":
      merge.check = checkOf(call.output);
      return;
    case "lesson_show": {
      const steps = out["steps"];
      merge.count = Array.isArray(steps) ? steps.length : null;
      return;
    }
    default:
      return;
  }
}

const list = (places: Iterable<number>): string => [...places].sort((a, b) => a - b).join(", ");

/** The merge as one done line's words and, for a search, its tags (S14). */
export function mergeWords(merge: Merge): { words: Words; tags?: SpineTag[] } {
  const plain = { words: plainWords(merge.verb, merge.input) };
  switch (merge.verb) {
    case "question_search": {
      if (merge.query === null) return plain;
      const tags = [...merge.sets].map(([id, title]) => ({ id, ...sayWords(title) }));
      const n = tags.length;
      const words: Words =
        merge.grade === null
          ? { copyKey: SEARCH_ANY_KEY, values: { query: merge.query, n } }
          : { copyKey: "chat_line_search", values: { query: merge.query, grade: merge.grade, n } };
      return { words, tags };
    }
    case "lesson_draft":
      return merge.count === null || merge.count === 0 || merge.topic === null
        ? plain
        : { words: { copyKey: "chat_line_draft", values: { n: merge.count, topic: merge.topic } } };
    case "lesson_edit": {
      const all = new Set([...merge.added, ...merge.hints, ...merge.changed]);
      if (merge.unplaced || all.size === 0) return plain;
      const [only] = merge.added;
      if (merge.added.size === 1 && all.size === 1 && only !== undefined && merge.title !== "")
        return {
          words: { copyKey: "chat_line_edit_added", values: { n: only, topic: merge.title } },
        };
      if (merge.hints.size === all.size)
        return { words: { copyKey: "chat_line_edit_hints", values: { list: list(all) } } };
      return { words: { copyKey: EDIT_CHANGED_KEY, values: { list: list(all) } } };
    }
    case "lesson_check": {
      const check = merge.check;
      if (check === null) return plain;
      return check.publishable && check.findings.length === 0
        ? { words: { copyKey: "chat_line_check_ok", values: {} } }
        : { words: { copyKey: "chat_line_check_found", values: { n: check.findings.length } } };
    }
    case "lesson_show":
      return merge.count === null || merge.count === 0
        ? plain
        : { words: { copyKey: "chat_line_read", values: { n: merge.count } } };
    default: {
      const key = DONE_KEY[merge.verb];
      return key === undefined ? plain : { words: { copyKey: key, values: {} } };
    }
  }
}
