/**
 * What the spine reads from a lesson revision's file (handoff §2 items 7 and 8): where each step
 * sits, what a step's help says, and the card's facts. The file is opaque JSON from the run log,
 * so every read here is defensive and answers "nothing" rather than throwing.
 */

import { lessonFileToSpecs } from "../lesson/adapter.ts";
import { readDraft, titleOf } from "../lesson/readDraft.ts";

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Each step of the file in lesson order: its id and the step object. */
function steps(file: unknown): { id: string; step: Fields }[] {
  const script = isFields(file) ? file["script"] : undefined;
  const parts = isFields(script) && Array.isArray(script["parts"]) ? script["parts"] : [];
  const found: { id: string; step: Fields }[] = [];
  for (const part of parts) {
    const list = isFields(part) && Array.isArray(part["steps"]) ? part["steps"] : [];
    for (const step of list)
      if (isFields(step) && typeof step["id"] === "string") found.push({ id: step["id"], step });
  }
  return found;
}

/** The step ids of the file, in lesson order. */
export const stepIds = (file: unknown): string[] => steps(file).map((s) => s.id);

/** The file's question steps in lesson order, as the preview modal lists them; none unread. */
function questionsOf(file: unknown) {
  const read = readDraft(file);
  if ("error" in read) return [];
  return lessonFileToSpecs(read.file, undefined, read.skipped)
    .flatMap((p) => p.steps)
    .flatMap((s) => (s.kind === "question" ? [s] : []));
}

/**
 * A question's number from 1, the one the parent and the child see: its place among the lesson's
 * questions, as the preview modal (LessonPane) numbers its rows, so a narration step before it never
 * moves it (dl-uukj.47.71.32). Null for a step that is no question, or not in the file.
 */
export function positionOf(file: unknown, id: string): number | null {
  const at = questionsOf(file).findIndex((q) => q.step_id === id);
  return at === -1 ? null : at + 1;
}

/** A step without its question's help, as JSON: two steps equal here differ only in their help. */
function withoutHelp(step: Fields): string {
  const question = step["question"];
  if (!isFields(question)) return JSON.stringify(step);
  const { help: _help, ...rest } = question;
  return JSON.stringify({ ...step, question: rest });
}

/**
 * Whether `next` changed only the help of step `id` against `previous` (S2's "Poprawiłam
 * podpowiedzi"). False when either file lacks the step or anything besides the help moved.
 */
export function onlyHelpChanged(previous: unknown, next: unknown, id: string): boolean {
  const before = steps(previous).find((s) => s.id === id)?.step;
  const after = steps(next).find((s) => s.id === id)?.step;
  if (before === undefined || after === undefined) return false;
  if (JSON.stringify(before) === JSON.stringify(after)) return false;
  return withoutHelp(before) === withoutHelp(after);
}

/** How many prompts the card shows before "+{n} więcej" (lesson card delta C3). */
const PREVIEW = 3;

/** TeX macros that name a sign, read as the sign (as the lesson's own plain TeX reads). */
const SIGNS: Readonly<Record<string, string>> = {
  "\\times": "×",
  "\\cdot": "·",
  "\\div": "÷",
  "\\mathbin{:}": ":",
  "\\,": " ",
  "\\;": " ",
  "\\square": "…",
  "{,}": ",",
};

/**
 * A prompt as plain text, as the child reads it (delta C3): no bold, italics or code marks, a
 * term or link as its word, a picture as nothing, TeX with its sign macros as signs and its other
 * markup dropped, a gap ({id} or \square) as "…", and one line.
 */
export function plainPrompt(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\$\$?([^$]*)\$?\$/g, (_m, tex: string) =>
      tex
        .replace(
          /\\(?:times|cdot|div|square|mathbin\{:\}|,|;)|\{,\}/g,
          (sign) => SIGNS[sign] ?? sign,
        )
        .replace(/\\[A-Za-z]+/g, "")
        .replace(/[{}]/g, ""),
    )
    .replace(/\*\*|__|(?<![\w*])[*_](?=\S)|(?<=\S)[*_](?![\w*])|`/g, "")
    .replace(/\{[A-Za-z0-9_-]+\}/g, "…")
    .replace(/\s+/g, " ")
    .trim();
}

/** What the lesson card says about one revision: the questions the preview can show. */
export interface LessonFacts {
  /** The lesson file's own id, "" when it has none. */
  id: string;
  title: string;
  /** Question steps the preview can show: 0 while the draft does not read. */
  count: number;
  /** The first 3 questions with words, each with its number (`positionOf`) and plain prompt. */
  preview: { place: number; prompt: string }[];
}

/** The card's facts from a revision's file, counted as the preview counts them. */
export function lessonFacts(file: unknown): LessonFacts {
  const id = isFields(file) && typeof file["id"] === "string" ? file["id"] : "";
  const title = titleOf(file);
  const questions = questionsOf(file);
  // Each row keeps its question's own number, so a prompt with no words never renumbers the rest.
  const preview = questions
    .map((q, i) => ({ place: i + 1, prompt: plainPrompt(q.spec.say) }))
    .filter((row) => row.prompt !== "")
    .slice(0, PREVIEW);
  return { id, title, count: questions.length, preview };
}
