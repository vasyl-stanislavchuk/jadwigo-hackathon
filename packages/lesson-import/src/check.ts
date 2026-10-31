import { readFileSync } from "node:fs";
import { Language, QUESTION_TYPE_FAMILY } from "@jadwigo/contracts";
import type { z } from "zod";
import { type CompileProblem, compileLessonFile, compileProblems } from "./compile.ts";
import type { Finding } from "./findings.ts";
import { DRAFTS_POD, featuredAssignmentId, lessonIdFor } from "./ids.ts";
import { inItsLanguage, LessonFile, safeParseLessonFile } from "./lesson-file.ts";
import { mistakeClassesByStep, mistakeClassesOf, unknownBoosts } from "./mistakes.ts";

/**
 * Checks one lesson file without writing anything (dl-e8ov.5.38.3): `bun run check <file> [--json]`
 * from this package, or `bun packages/lesson-import/src/check.ts <file> --json` from the repo root,
 * which is how `jw lesson_check` calls it. It parses and compiles the file as the import would, and
 * prints every problem with its step id. Exit 1 on any problem, 0 when clean, 2 on a bad command line.
 *
 * With `--json` it prints one object, a contract with `jw` (Python reads it):
 *
 *     {"ok": boolean,
 *      "findings": [{"step_id", "path", "level": "error" | "warn", "rule", "text", "fix"}],
 *      "errors": [{"step_id": string | null, "message": string}],
 *      "play_path": "/play/<assignment id>" | null,
 *      "lesson_id": "<lesson id>" | null,
 *      "questions": number,
 *      "mistake_classes": {<step id>: [string, ...]}}
 *
 * - `findings` is everything the check finds, each with a path into the file and a fix a parent
 *   can follow (`findings.ts`, dl-a38n.14): every schema problem; every step that does not compile,
 *   the check going on to the next step; a help rung nothing fills (`empty-rung`, a warn, read
 *   only when the file names its language); a `boost_by_mistake` key the question never gives
 *   (`unknown-mistake-class`, naming the valid ones); an answer the key accepts written into `say`
 *   outside a sum or a list (`key-in-say`, a warn: it is a heuristic). `ok` is "no error"; a warn
 *   does not fail the file, so jw's plays-as-copied is never decided by one.
 * - `errors` is the error findings as jw read them before `findings`: one message by step id, a
 *   contract failure one message for the step, unknown boosts one message for the question. Kept
 *   for one release, until jw reads `findings` (dl-a38n.16).
 * - `step_id` is the step's `id` in the file (a twin's ends `t`, as compile names it), or null when
 *   the problem is the file's own (its title, its id, the JSON itself).
 * - `play_path` and `lesson_id` are the assignment's path and the lesson's id in the drafts pod,
 *   where `make lesson-import` puts the file (`DRAFTS_POD`, dl-e8ov.2.59), known before any import
 *   because ids are named from the file id (`ids.ts`). Both are null
 *   only when the file has no usable id.
 * - `questions` counts the planned questions a learner is asked, twins not counted; 0 when the file
 *   does not compile.
 * - `mistake_classes` names, for each question step (a twin under its own step id), every class
 *   its judge can give a miss on that step's own data and key (packages/core `mistakeClassesOf`,
 *   dl-e8ov.5.38.15): the classes for its input and kind, its `near` tables, a rule's classes only
 *   when its key names the rule, and `other_wrong`, sorted. These are all a `boost_by_mistake` key
 *   may name; the import itself does not refuse one. Read from the file as given, so it is there
 *   when the file fails too; a step whose question does not parse is left out.
 */

interface CheckError {
  readonly step_id: string | null;
  readonly message: string;
}

interface CheckResult {
  readonly ok: boolean;
  readonly findings: readonly Finding[];
  readonly errors: readonly CheckError[];
  readonly play_path: string | null;
  readonly lesson_id: string | null;
  readonly questions: number;
  readonly mistake_classes: Readonly<Record<string, readonly string[]>>;
}

/** What one check found: its findings, and the same errors as jw's old messages. */
interface Found {
  findings: Finding[];
  errors: CheckError[];
}

const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** A Zod path as the file writes it: `script.parts[0].steps[2].question_type`. */
function pathOf(path: readonly PropertyKey[]): string {
  return path
    .map((k, i) => (typeof k === "number" ? `[${k}]` : i === 0 ? String(k) : `.${String(k)}`))
    .join("");
}

/** The step at `script.parts[i].steps[j]` of the file as given, by its id. */
function stepIdAt(raw: unknown, path: string): string | null {
  const at = /script\.parts\[(\d+)\]\.steps\[(\d+)\]/.exec(path);
  if (at === null) return null;
  const parts = (raw as { script?: { parts?: { steps?: { id?: unknown }[] }[] } }).script?.parts;
  const id = parts?.[Number(at[1])]?.steps?.[Number(at[2])]?.id;
  return typeof id === "string" ? id : `script.parts[${at[1]}].steps[${at[2]}]`;
}

/** A question step of the file as given, with its path: what the step rules read. */
interface RawStep {
  readonly id: string;
  readonly path: string;
  readonly say: unknown;
  readonly question: Record<string, unknown>;
}

function rawSteps(file: unknown): RawStep[] {
  const parts = record(record(file)?.["script"])?.["parts"];
  return (Array.isArray(parts) ? parts : []).flatMap((part, i) => {
    const steps = record(part)?.["steps"];
    return (Array.isArray(steps) ? steps : []).flatMap((step, j) => {
      const s = record(step);
      const question = record(s?.["question"]);
      const id = s?.["id"];
      if (typeof id !== "string" || question === null) return [];
      return [{ id, path: `script.parts[${i}].steps[${j}]`, say: s?.["say"], question }];
    });
  });
}

/** A field the file leaves out (Zod reports no input unless asked, so its message says so). */
const missing = (issue: z.core.$ZodIssue): boolean =>
  issue.code === "invalid_type" && /received undefined/.test(issue.message);

const article = (word: string): string => `${/^[aeiou]/.test(word) ? "an" : "a"} ${word}`;

/** A Zod issue's fix, in words a parent can follow. */
function fixOf(file: unknown, issue: z.core.$ZodIssue, path: string): string {
  const field = path === "" ? "the file" : path;
  switch (issue.code) {
    case "invalid_value":
      if (issue.path.at(-1) === "question_type") {
        // The step's family narrows the list to the question types that family draws.
        const family = record(record(valueAt(file, issue.path.slice(0, -1)))?.["question"])?.[
          "family"
        ];
        const types = Object.entries(QUESTION_TYPE_FAMILY)
          .filter(([, f]) => f === family)
          .map(([t]) => JSON.stringify(t));
        if (types.length > 0) {
          return `Set ${field} to one of the ${String(family)} question types: ${types.join(", ")}.`;
        }
      }
      return `Set ${field} to one of: ${issue.values.map((v) => JSON.stringify(v)).join(", ")}.`;
    case "invalid_type":
      return missing(issue)
        ? `Add ${field}: it is required, ${article(issue.expected)}.`
        : `Make ${field} ${article(issue.expected)}.`;
    case "too_small":
      return `Write something in ${field}: it cannot be empty.`;
    case "unrecognized_keys":
      return `Remove ${issue.keys.join(", ")} from ${field}: it has no such field.`;
    default:
      return `Change ${field}: ${issue.message}.`;
  }
}

/** The value at a Zod path in `root`. */
function valueAt(root: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<unknown>(
    (at, k) =>
      at !== null && typeof at === "object" ? (at as Record<PropertyKey, unknown>)[k] : undefined,
    root,
  );
}

/**
 * A union's issues: those of the option that came closest, so the fix names the real field. An
 * option is further off for each field the file leaves out, and a step that holds a `question` is
 * a question step, never a teaching step that lacks `teach`.
 */
function flat(file: unknown, issues: readonly z.core.$ZodIssue[]): z.core.$ZodIssue[] {
  const distance = (option: readonly z.core.$ZodIssue[]) =>
    option.length + 100 * option.filter(missing).length;
  return issues.flatMap((issue) => {
    if (issue.code !== "invalid_union" || issue.errors.length === 0) return [issue];
    const value = record(valueAt(file, issue.path));
    const options =
      value !== null && "question" in value
        ? issue.errors.filter((o) => !o.some((i) => i.path[0] === "teach"))
        : issue.errors;
    const closest = (options.length > 0 ? options : issue.errors).reduce((a, b) =>
      distance(b) < distance(a) ? b : a,
    );
    return flat(
      file,
      closest.map((i) => ({ ...i, path: [...issue.path, ...i.path] })),
    );
  });
}

/** Every problem the schema finds, one finding and one jw error each. */
function schemaFindings(raw: unknown, fileId: unknown, issues: readonly z.core.$ZodIssue[]): Found {
  const found: Found = { findings: [], errors: [] };
  const file = inItsLanguage(raw);
  for (const issue of flat(file, issues)) {
    const path = pathOf(issue.path);
    const step_id = stepIdAt(raw, path);
    found.findings.push({
      step_id,
      path,
      level: "error",
      rule: "schema",
      text: issue.message,
      fix: fixOf(file, issue, path),
    });
    const at = path === "" ? "" : ` at ${path}`;
    found.errors.push({ step_id, message: `lesson file ${String(fileId)}: ${issue.message}${at}` });
  }
  return found;
}

/** What to do about each compile rule. */
const COMPILE_FIX: Record<string, string> = {
  "no-question": "Add at least one question step to a part.",
  "explain-first":
    "Move an explain question later: open the lesson with a question the child answers.",
  "question-type-family":
    "Set question_type to one of this family's question types, or change the family to the one the question type names.",
  contract: "Change the field to the shape its family takes.",
  "unknown-field": "Remove the field: the lesson file has no place for it.",
  "skill-id":
    "Write the skill id as lowercase words joined by dots, like math.multiplication.row-2.",
  "skill-id-collision":
    "Rename one of the 2 skills: without its marks it reads the same as the other.",
  "twin-of-twin": "Remove the twin's own twin: only the step's question has one.",
};

/** Where a compile problem is in the file: the step's path, then `at` under it. */
function compileFindings(steps: readonly RawStep[], problems: readonly CompileProblem[]): Found {
  const found: Found = { findings: [], errors: [] };
  const seen = new Set<string>();
  for (const p of problems) {
    if (seen.has(p.message)) continue;
    seen.add(p.message);
    // A twin's problem is named `<step id>t` and sits under its step's `question.help.twin`.
    const ownId = p.at.startsWith("question.help.twin") ? p.step_id?.slice(0, -1) : p.step_id;
    const stepPath = steps.find((s) => s.id === ownId)?.path;
    const base =
      stepPath === undefined
        ? p.at === "skill_ids"
          ? "script.parts[*].steps[*].skill_ids"
          : p.at
        : `${stepPath}.${p.at}`;
    const fix = COMPILE_FIX[p.rule] ?? "Change the step so it compiles.";
    const text = p.message.replace(/^lesson file [^:]*: /, "");
    const each = p.issues.length > 0 ? p.issues : [{ path: "", message: text }];
    for (const issue of each) {
      found.findings.push({
        step_id: p.step_id,
        path: issue.path === "" ? base : `${base}.${issue.path}`,
        level: "error",
        rule: p.rule,
        text: p.issues.length > 0 ? `${issue.message} at ${issue.path || base}` : text,
        fix,
      });
    }
    found.errors.push({ step_id: p.step_id, message: p.message });
  }
  return found;
}

/** A help card with nothing to read on it. */
function emptyCard(card: unknown): boolean {
  const c = record(card);
  return c === null || (typeof c["text"] === "string" ? c["text"].trim() === "" : true);
}

function emptyLines(lines: unknown): boolean {
  return !Array.isArray(lines) || lines.every((l) => typeof l !== "string" || l.trim() === "");
}

/** The rungs a step needs filled, as jw's `NEEDED`: the player skips an empty `almost`. */
const RUNGS = [
  {
    rung: "look",
    n: 1,
    empty: emptyCard,
    write: "one line that says where to look, without the answer",
  },
  {
    rung: "boost",
    n: 2,
    empty: emptyCard,
    write: "a nudge toward the way to solve it, without the answer",
  },
  {
    rung: "worked",
    n: 4,
    empty: emptyLines,
    write: "the solution, one line per step, the last line the answer",
  },
] as const;

/** A rung nothing fills: neither its own field nor Khan's `hints`. Warns, as jw drafts them empty. */
function emptyRungs(step: RawStep): Finding[] {
  const help = record(step.question["help"]) ?? {};
  const hints = help["hints"];
  if (Array.isArray(hints) && hints.length > 0) return [];
  const rungs = RUNGS.filter(
    ({ rung }) => !(rung === "worked" && step.question["family"] === "explain"),
  )
    .filter(({ rung, empty }) => empty(help[rung]))
    .map(({ rung, n, write }) => ({
      step_id: step.id,
      path: `${step.path}.question.help.${rung}`,
      level: "warn" as const,
      rule: "empty-rung",
      text: `Rung ${n} (${rung}) is empty, so a child who asks for help here gets nothing.`,
      fix: `Write ${rung}: ${write}.`,
    }));
  const cards = Object.entries(record(help["boost_by_mistake"]) ?? {})
    .filter(([, card]) => emptyCard(card))
    .map(([cls]) => ({
      step_id: step.id,
      path: `${step.path}.question.help.boost_by_mistake.${cls}`,
      level: "warn" as const,
      rule: "empty-rung",
      text: `The boost card for ${cls} is empty, so a child who makes that mistake gets nothing.`,
      fix: `Write the card for ${cls}: what that mistake usually means and one nudge, or remove the key.`,
    }));
  return [...rungs, ...cards];
}

/** A question and a twin of a step as the boost and say rules read them, with their paths. */
function questionsOf(
  step: RawStep,
): { id: string; path: string; say: unknown; question: Record<string, unknown> }[] {
  const out = [
    { id: step.id, path: `${step.path}.question`, say: step.say, question: step.question },
  ];
  const twin = record(record(step.question["help"])?.["twin"]);
  if (twin !== null) {
    out.push({
      id: `${step.id}t`,
      path: `${step.path}.question.help.twin`,
      say: twin["say"],
      question: { family: step.question["family"], ...twin },
    });
  }
  return out;
}

/** Each `boost_by_mistake` key the question never gives, naming the classes it does. */
function unknownMistakeClasses(fileId: unknown, steps: readonly RawStep[]): Found {
  const found: Found = { findings: [], errors: [] };
  for (const q of steps.flatMap(questionsOf)) {
    const classes = mistakeClassesOf(q.question);
    if (classes === null) continue; // an unknown family is a schema finding already
    const boosts = record(record(q.question["help"])?.["boost_by_mistake"]) ?? undefined;
    const unknown = unknownBoosts(q.question, boosts);
    if (unknown === null) continue;
    const valid = classes.length > 0 ? classes.join(", ") : "none";
    for (const cls of Object.keys(boosts ?? {}).filter((k) => !classes.includes(k))) {
      found.findings.push({
        step_id: q.id,
        path: `${q.path}.help.boost_by_mistake.${cls}`,
        level: "error",
        rule: "unknown-mistake-class",
        text: `boost_by_mistake names ${cls}, a mistake this ${String(q.question["family"])} question never gives, so the card never shows.`,
        fix: `Rename ${cls} to one of ${valid}, or remove the card.`,
      });
    }
    found.errors.push({
      step_id: q.id,
      message: `lesson file ${String(fileId)}, step ${q.id} help: ${unknown}`,
    });
  }
  return found;
}

/** A question's representation: what a twin must keep so it asks the same way (`signatureOf`). */
export interface Signature {
  /** Picture objects (`src`, `alt` and `width`) at any depth, plus a `stem.image` that is not one. */
  readonly pictures: number;
  /** Every picture's `src`, sorted: a twin with the same ones draws the original's pictures. */
  readonly srcs: readonly string[];
  /** The `kind` under each `figure` key at any depth, sorted, once each. */
  readonly figures: readonly string[];
  /** The `content.kind` of each option at any depth, sorted, once each. */
  readonly options: readonly string[];
  /** The `input` kind at any depth, sorted, once each. */
  readonly inputs: readonly string[];
}

/**
 * The representation signature of a question's data: the wave-3 plan's lead decision 3
 * (docs/worklog/dl-a38n/2026-10-31-wave-3.md), held here authoritatively and mirrored in jw's
 * sibling twin draw (apps/cli/src/jw/lesson.py). The count of picture objects (`src` + `alt` +
 * `width`) at any depth plus `stem.image`; the figure `kind` under any `figure` key; the sorted set
 * of option `content.kind`; the `input` kind.
 */
export function signatureOf(data: unknown): Signature {
  const srcs: string[] = [];
  const figures = new Set<string>();
  const options = new Set<string>();
  const inputs = new Set<string>();
  let pictures = 0;
  const isPicture = (v: Record<string, unknown>): boolean =>
    "src" in v && "alt" in v && "width" in v;
  const walk = (value: unknown, key: string | null): void => {
    if (Array.isArray(value)) {
      for (const v of value) {
        if (key === "options") {
          const kind = record(record(v)?.["content"])?.["kind"];
          if (typeof kind === "string") options.add(kind);
        }
        walk(v, null);
      }
      return;
    }
    const v = record(value);
    if (v === null) return;
    if (key === "figure" && typeof v["kind"] === "string") figures.add(v["kind"]);
    if (isPicture(v)) {
      pictures += 1;
      if (typeof v["src"] === "string") srcs.push(v["src"]);
    }
    if (key === "stem") {
      const image = v["image"];
      const picture = record(image);
      if (image !== undefined && image !== null && (picture === null || !isPicture(picture))) {
        pictures += 1;
        const src = typeof image === "string" ? image : picture?.["src"];
        if (typeof src === "string") srcs.push(src);
      }
    }
    for (const [k, child] of Object.entries(v)) {
      if (k === "input" && typeof child === "string") inputs.add(child);
      walk(child, k);
    }
  };
  walk(data, null);
  return {
    pictures,
    srcs: srcs.sort(),
    figures: [...figures].sort(),
    options: [...options].sort(),
    inputs: [...inputs].sort(),
  };
}

/** JSON with its keys sorted, so 2 keys compare by content and not by the order they were written in. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const v = record(value);
  if (v === null) return JSON.stringify(value) ?? "null";
  return `{${Object.keys(v)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
    .join(",")}}`;
}

const listed = (xs: readonly string[]): string => (xs.length > 0 ? xs.join(", ") : "none");

/**
 * A twin that asks another way than its original (`twin-representation`, an error): the original
 * has pictures and the twin none, or their figure kinds or option content kinds differ. A twin that
 * draws the original's very pictures with another key (`twin-same-picture`, a warn): the child sees
 * one picture with 2 answers. The family is compile's (`question-type-family`).
 */
function twinRepresentation(steps: readonly RawStep[]): Finding[] {
  const findings: Finding[] = [];
  for (const step of steps) {
    const twin = record(record(step.question["help"])?.["twin"]);
    if (twin === null) continue;
    const path = `${step.path}.question.help.twin`;
    const original = signatureOf(step.question["data"]);
    const copy = signatureOf(twin["data"]);
    const lost: string[] = [];
    if (original.pictures > 0 && copy.pictures === 0) {
      lost.push(`the original has ${original.pictures} pictures and the twin none`);
    }
    if (canonical(original.figures) !== canonical(copy.figures)) {
      lost.push(
        `its figure is ${listed(copy.figures)}, the original's ${listed(original.figures)}`,
      );
    }
    if (canonical(original.options) !== canonical(copy.options)) {
      lost.push(
        `its options are ${listed(copy.options)}, the original's ${listed(original.options)}`,
      );
    }
    if (lost.length > 0) {
      findings.push({
        step_id: `${step.id}t`,
        path,
        level: "error",
        rule: "twin-representation",
        text: `The twin asks another way than its question: ${lost.join("; ")}.`,
        fix: "Give the twin the same kind of picture, figure and options as its question, with other numbers; or take a sibling item from the same set as the twin.",
      });
    }
    if (
      original.srcs.length > 0 &&
      canonical(original.srcs) === canonical(copy.srcs) &&
      canonical(step.question["key"]) !== canonical(twin["key"])
    ) {
      findings.push({
        step_id: `${step.id}t`,
        path: `${path}.data`,
        level: "warn",
        rule: "twin-same-picture",
        text: "The twin draws its question's pictures with another answer, so the picture shows the other question.",
        fix: "Give the twin pictures that match its own numbers, or a sibling item from the same set with its own pictures.",
      });
    }
  }
  return findings;
}

/** The typed answers a key accepts: an enter key's `accept`, and each enter gap's in slots. */
function typedAnswers(question: Record<string, unknown>): string[] {
  const key = record(question["key"]);
  const accepted = (k: Record<string, unknown> | null): string[] => {
    const accept = k?.["accept"];
    return Array.isArray(accept) ? accept.filter((a): a is string => typeof a === "string") : [];
  };
  if (question["family"] === "enter") return accepted(key);
  if (question["family"] === "slots") {
    return Object.values(record(key?.["gaps"]) ?? {})
      .map(record)
      .filter((gap) => gap?.["kind"] === "enter")
      .flatMap(accepted);
  }
  return [];
}

/**
 * An arithmetic operator, a sign or a word for one. `=` is not one, so an answer after it still
 * gives the answer away.
 */
const OPERATOR = String.raw`(?:[+\-−–×·*:÷/]|(?<!\p{L})(?:x|razy|plus|minus|dodać|odjąć|przez|times)(?!\p{L}))`;
/** What stands on an operator's other side in an expression: a number or the blank to fill. */
const TERM = String.raw`[\p{N}?_□]`;
/** An operand: after a term and an operator, or after a number and a comma (a list `1, 3, 5`). */
const AFTER_OPERAND = new RegExp(String.raw`(?:${TERM}\s*${OPERATOR}|\p{N}\s*[,;])\s*$`, "iu");
/** An operand: before an operator and a term, or before a comma and a number. */
const BEFORE_OPERAND = new RegExp(String.raw`^\s*(?:${OPERATOR}\s*${TERM}|[,;]\s*\p{N})`, "iu");

/**
 * Whether `say` holds `answer` as a word of its own, other than as an operand: in "Ile to jest
 * 10 − 5?" the 5 is the question, not its answer, and so is a number in a list the question
 * continues. A one-letter answer counts only as a digit: Polish has one-letter words (`u`, `w`,
 * `o`) that a spelling gap's answer would match.
 */
function says(say: string, answer: string): boolean {
  const a = answer.trim();
  if (a === "" || (a.length === 1 && !/\p{N}/u.test(a))) return false;
  const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const word = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu");
  for (const m of say.matchAll(word)) {
    const before = say.slice(0, m.index);
    const after = say.slice(m.index + m[0].length);
    if (!AFTER_OPERAND.test(before) && !BEFORE_OPERAND.test(after)) return true;
  }
  return false;
}

/** A `say` line that seems to give the answer away. A warn: it is a heuristic. */
function keyInSay(steps: readonly RawStep[]): Finding[] {
  const findings: Finding[] = [];
  for (const q of steps.flatMap(questionsOf)) {
    if (typeof q.say !== "string") continue;
    const say = q.say;
    const given = typedAnswers(q.question).filter((a) => says(say, a));
    if (given.length === 0) continue;
    const answers = given.map((a) => `"${a}"`).join(", ");
    const sayPath = q.path.endsWith(".twin")
      ? `${q.path}.say`
      : q.path.replace(/\.question$/, ".say");
    findings.push({
      step_id: q.id,
      path: sayPath,
      level: "warn",
      rule: "key-in-say",
      text: `say may give the answer away: it holds ${answers}, which the key accepts.`,
      fix: `Rewrite say so it asks without ${answers}: the child works the answer out. (This check reads only typed answers, an enter key's or an enter gap's, as whole words, outside a sum or a list; a one-letter answer only when it is a digit.)`,
    });
  }
  return findings;
}

/** Findings with each error also as jw's old message, so `errors` agrees with `ok`. */
function errorsAsJw(fileId: unknown, findings: readonly Finding[]): Found {
  return {
    findings: [...findings],
    errors: findings
      .filter((f) => f.level === "error")
      .map((f) => ({
        step_id: f.step_id,
        message: `lesson file ${String(fileId)}, step ${f.step_id}: ${f.text}`,
      })),
  };
}

function check(raw: unknown): CheckResult {
  const fileId = LessonFile.shape.id.safeParse((raw as { id?: unknown } | null)?.id);
  const known = fileId.success
    ? {
        play_path: `/play/${featuredAssignmentId(fileId.data, DRAFTS_POD.id)}`,
        lesson_id: lessonIdFor(DRAFTS_POD.id, fileId.data) as string,
      }
    : { play_path: null, lesson_id: null };
  const id = (raw as { id?: unknown } | null)?.id;
  const mistake_classes = mistakeClassesByStep(raw);
  const steps = rawSteps(inItsLanguage(raw));
  // With no language the lines are still `{pl, uk, en}`, never a rung's text: no rung is read.
  const resolved = Language.safeParse((raw as { language?: unknown } | null)?.language).success;
  const parsed = safeParseLessonFile(raw);
  const found: Found[] = [];
  let questions = 0;
  if (!parsed.success) {
    found.push(schemaFindings(raw, id, parsed.issues));
  } else {
    const problems = compileProblems(parsed.data);
    found.push(compileFindings(steps, problems));
    if (problems.length === 0) {
      questions = compileLessonFile(raw).questions.filter((q) => q.role === "planned").length;
    }
  }
  // Stricter than the import, which keeps the playground's lessons as exported: a boost for a
  // class its question never gives never reaches the child (dl-e8ov.5.38.11).
  found.push(unknownMistakeClasses(id, steps));
  found.push({ findings: keyInSay(steps), errors: [] });
  found.push(errorsAsJw(id, twinRepresentation(steps)));
  found.push({ findings: resolved ? steps.flatMap(emptyRungs) : [], errors: [] });
  const findings = found.flatMap((f) => f.findings);
  const errors = found.flatMap((f) => f.errors);
  const ok = !findings.some((f) => f.level === "error");
  return { ok, findings, errors, ...known, questions, mistake_classes };
}

function read(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

/** The command line: one file, `--json` for jw. Run only as a script, so a test can import the rules. */
function main(): void {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const files = args.filter((a) => a !== "--json");
  if (files.length !== 1 || files[0] === undefined) {
    process.stderr.write("usage: bun run check <lesson file> [--json]\n");
    process.exitCode = 2;
    return;
  }
  const file = files[0];
  let result: CheckResult;
  try {
    result = check(read(file));
  } catch (e) {
    const message = `${file}: ${e instanceof Error ? e.message : String(e)}`;
    result = {
      ok: false,
      findings: [
        {
          step_id: null,
          path: "",
          level: "error",
          rule: "json",
          text: message,
          fix: "Make the file valid JSON: check for a missing comma, quote or bracket near the place named.",
        },
      ],
      errors: [{ step_id: null, message }],
      play_path: null,
      lesson_id: null,
      questions: 0,
      mistake_classes: {},
    };
  }
  if (json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else {
    for (const f of result.findings) {
      const step = f.step_id === null ? "" : `step ${f.step_id}: `;
      process.stdout.write(
        `${file}: ${step}${f.level} ${f.rule} at ${f.path}: ${f.text}\n  fix: ${f.fix}\n`,
      );
    }
    if (result.ok) {
      process.stdout.write(
        `${file}: ok, ${result.questions} questions, play ${result.play_path}\n`,
      );
    }
  }
  // Not process.exit: it can cut a long answer off before a pipe has read it all.
  process.exitCode = result.ok ? 0 : 1;
}

if (import.meta.main) main();
