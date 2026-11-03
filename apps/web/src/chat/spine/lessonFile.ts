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

/** A step's place in the lesson from 1, as the parent counts it ("zadanie 4"), or null. */
export function positionOf(file: unknown, id: string): number | null {
  const at = stepIds(file).indexOf(id);
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

/** What the lesson card says about one revision: the questions the preview can show. */
export interface LessonFacts {
  /** The lesson file's own id, "" when it has none. */
  id: string;
  title: string;
  /** Question steps the preview can show: 0 while the draft does not read. */
  count: number;
  /** The first question's words, "" when none reads. */
  first: string;
}

/** The card's facts from a revision's file, counted as the preview counts them. */
export function lessonFacts(file: unknown): LessonFacts {
  const id = isFields(file) && typeof file["id"] === "string" ? file["id"] : "";
  const title = titleOf(file);
  const read = readDraft(file);
  if ("error" in read) return { id, title, count: 0, first: "" };
  const questions = lessonFileToSpecs(read.file, undefined, read.skipped)
    .flatMap((p) => p.steps)
    .flatMap((s) => (s.kind === "question" ? [s] : []));
  const first = questions.find((q) => q.spec.say.trim() !== "")?.spec.say.trim() ?? "";
  return { id, title, count: questions.length, first };
}
