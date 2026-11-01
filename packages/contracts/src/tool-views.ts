import { z } from "zod";
import type { ToolView, VerbName } from "./run.ts";

/**
 * Each verb's `tool_result.view.data`, the shape its widget draws (dl-z5ja.69, dl-z5ja.71): the
 * verb parses its view through these before writing it, and the chat pane parses it through them
 * before drawing, so neither side keeps its own copy of the shape.
 *
 * The words here are the lesson file's (`steps`, `step_id`, a finding's fields), which the verbs
 * answer and `jw mcp serve` shares (`apps/cli/mcp-tools.json`); RULES.md rule 3 governs the
 * records in `run.ts`, which call a lesson file's step a question. Not exported from `run.ts` for
 * that reason: `@jadwigo/contracts` carries them.
 *
 * To add a verb: add it to `VerbName` in `run.ts`, then its schema here and its entry in
 * `TOOL_VIEW_DATA`. Typecheck fails until every verb has one.
 */

/** JSON the contracts treat as opaque: the lesson file. */
const LessonFile = z.record(z.string(), z.unknown());

/** How bad a finding is: an error blocks publishing, a warning does not. */
export const FindingLevel = z.enum(["error", "warn"]);
export type FindingLevel = z.infer<typeof FindingLevel>;

/** One thing a lesson check found (dl-a38n, lesson-import's `Finding`). */
export const Finding = z.object({
  /** The step it is about, or null for the lesson as a whole. */
  step_id: z.string().nullable(),
  /** A path into the lesson file, e.g. `script.parts[1].steps[2].question.help.boost`. */
  path: z.string(),
  level: FindingLevel,
  /** A short name the reader can cite, e.g. `empty-rung`. */
  rule: z.string(),
  text: z.string(),
  fix: z.string(),
});
export type Finding = z.infer<typeof Finding>;

/** lesson_draft's and lesson_edit's view: the steps the revision changed, none for a no-op. */
export const LessonRevisionView = z.object({ changed_step_ids: z.array(z.string()) });
export type LessonRevisionView = z.infer<typeof LessonRevisionView>;

/** lesson_show's view: the lesson file as it stands. */
export const LessonShowView = z.object({ lesson: LessonFile });
export type LessonShowView = z.infer<typeof LessonShowView>;

/** lesson_check's view: whether a parent may publish the draft, and every finding. */
export const LessonCheckView = z.object({ publishable: z.boolean(), findings: z.array(Finding) });
export type LessonCheckView = z.infer<typeof LessonCheckView>;

/** One question set as question_search found it: what the model reads to choose. */
export const SearchSet = z.object({
  set_id: z.string(),
  title: z.string(),
  grades: z.array(z.string()),
  skills: z.array(z.string()),
  questions: z.int().min(0),
  why_found: z.string(),
});
export type SearchSet = z.infer<typeof SearchSet>;

/** question_search's view: the sets it found, best first. */
export const QuestionSearchView = z.object({ sets: z.array(SearchSet) });
export type QuestionSearchView = z.infer<typeof QuestionSearchView>;

/** Each verb's view schema, one per `VerbName`: a verb without one fails typecheck here. */
export const TOOL_VIEW_DATA = {
  lesson_draft: LessonRevisionView,
  lesson_show: LessonShowView,
  lesson_edit: LessonRevisionView,
  lesson_check: LessonCheckView,
  question_search: QuestionSearchView,
} as const satisfies { [V in VerbName]: z.ZodObject };

/** A verb's view data, typed by its verb. */
export type ToolViewData<V extends VerbName> = z.infer<(typeof TOOL_VIEW_DATA)[V]>;

/** The view a verb writes, its data parsed through its schema: throws on a shape that drifted. */
export function toolView<V extends VerbName>(kind: V, data: ToolViewData<V>): ToolView {
  return { kind, data: TOOL_VIEW_DATA[kind].parse(data) };
}

/** A view's data read as its verb's shape, or null when it does not fit (the widget's plain card). */
export function toolViewData<V extends VerbName>(kind: V, data: unknown): ToolViewData<V> | null {
  const parsed = TOOL_VIEW_DATA[kind].safeParse(data);
  return parsed.success ? (parsed.data as ToolViewData<V>) : null;
}
