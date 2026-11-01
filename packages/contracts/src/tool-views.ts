import { z } from "zod";
import { AttemptId, GoalId, LearnerId } from "./ids.ts";
import { Brief, BriefEntry, BriefList, Citation, Language, Skill, SkillId } from "./records.ts";
import type { ToolView, VerbName } from "./run.ts";
import { GoalView } from "./wire.ts";

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

// The learner verbs (dl-z5ja.25): one learner of the run's pod, read by code. What they may say is
// the owner's answer on dl-z5ja.27: everything the record holds, each claim cited, and never a
// level, a score, a comparison or a diagnosis. So no view here carries a `MasteryLevel`, a ratio or
// a percentage: a goal's status word, the brief's lists, counts and the child's own answers.

/** The learner a view is about: its id and the first name the family gave it. */
export const LearnerRef = z.object({ id: LearnerId, first_name: z.string().min(1) });
export type LearnerRef = z.infer<typeof LearnerRef>;

/**
 * learner_skills' view: each goal as the learner page shows it, the brief, and the catalogue rows
 * those name, so the widget words each code with its can-do line (GoalLists).
 */
export const LearnerSkillsView = z.object({
  learner: LearnerRef,
  goals: z.array(GoalView),
  brief: Brief,
  skills: z.array(Skill),
});
export type LearnerSkillsView = z.infer<typeof LearnerSkillsView>;

/** One Monday-to-Sunday week (Warsaw) of the learner's: counts only, as the week strip shows them. */
export const LearnerWeekCounts = z.object({
  /** The week's Monday, `YYYY-MM-DD`. */
  monday: z.iso.date(),
  lessons: z.int().min(0),
  /** The skills that moved forward that week, by the reports' digests. */
  moved_up: z.int().min(0),
  /** What needed attention by the week's newest report; null for a week no report ended in. */
  attention: z.int().min(0).nullable(),
});
export type LearnerWeekCounts = z.infer<typeof LearnerWeekCounts>;

/** One lesson the learner played in the weeks asked for. */
export const LearnerWeekLesson = z.object({
  attempt_id: AttemptId,
  title: z.string().min(1),
  language: Language,
  started_at: z.iso.datetime(),
  finished: z.boolean(),
  /** The questions the learner was asked in it. */
  questions: z.int().min(0),
});
export type LearnerWeekLesson = z.infer<typeof LearnerWeekLesson>;

/** learner_week's view: the weeks, oldest first, and the lessons played in them, newest first. */
export const LearnerWeekView = z.object({
  learner: LearnerRef,
  weeks: z.array(LearnerWeekCounts),
  lessons: z.array(LearnerWeekLesson),
});
export type LearnerWeekView = z.infer<typeof LearnerWeekView>;

/** One mistake class, how many answers made it, and the attempts they were in. */
export const LearnerMistake = z.object({
  mistake_class: z.string().min(1),
  times: z.int().min(1),
  citations: z.array(Citation),
});
export type LearnerMistake = z.infer<typeof LearnerMistake>;

/**
 * One question the learner missed or skipped: what it said, the mistake classes, and the child's
 * own answers as text, in try order. The answers are what a child wrote: the verb fences them in
 * what the model reads (`src/fence` in packages/jadwigo-ai), and the page shows them as text.
 */
export const LearnerMissedQuestion = z.object({
  attempt_id: AttemptId,
  seq: z.int().min(1),
  say: z.string(),
  mistake_classes: z.array(z.string()),
  tries: z.int().min(0),
  skipped: z.boolean(),
  answers: z.array(z.string()),
});
export type LearnerMissedQuestion = z.infer<typeof LearnerMissedQuestion>;

/** learner_mistakes' view: the mistake classes, most made first, and the questions behind them. */
export const LearnerMistakesView = z.object({
  learner: LearnerRef,
  mistakes: z.array(LearnerMistake),
  questions: z.array(LearnerMissedQuestion),
});
export type LearnerMistakesView = z.infer<typeof LearnerMistakesView>;

/** One outcome of the curriculum, its skills, and the learner's goals that hold any of them. */
export const CurriculumTopicRow = z.object({
  code: z.string().min(1),
  area: z.string().min(1),
  text: z.string().min(1),
  skill_codes: z.array(SkillId),
  goal_ids: z.array(GoalId),
});
export type CurriculumTopicRow = z.infer<typeof CurriculumTopicRow>;

/** curriculum_topics' view: the curriculum, and its topics that meet the words asked for. */
export const CurriculumTopicsView = z.object({
  curriculum: z.object({ code: z.string().min(1), name: z.string().min(1) }),
  learner: LearnerRef.nullable(),
  topics: z.array(CurriculumTopicRow),
});
export type CurriculumTopicsView = z.infer<typeof CurriculumTopicsView>;

/** One idea for the next lesson: one list of the brief, its skills and goals, and why code put them there. */
export const LessonIdea = z.object({
  /** `i1` to `i3`, the order to offer them in. */
  id: z.string().regex(/^i[1-3]$/, "an idea id is i and 1 to 3"),
  list: BriefList,
  why: BriefEntry.shape.why,
  skill_codes: z.array(SkillId).min(1),
  goal_ids: z.array(GoalId),
  citations: z.array(Citation).min(1),
});
export type LessonIdea = z.infer<typeof LessonIdea>;

/** lesson_ideas' view: up to 3 ideas from the brief, none when it holds nothing. */
export const LessonIdeasView = z.object({
  learner: LearnerRef,
  ideas: z.array(LessonIdea).max(3),
});
export type LessonIdeasView = z.infer<typeof LessonIdeasView>;

/** Each verb's view schema, one per `VerbName`: a verb without one fails typecheck here. */
export const TOOL_VIEW_DATA = {
  lesson_draft: LessonRevisionView,
  lesson_show: LessonShowView,
  lesson_edit: LessonRevisionView,
  lesson_check: LessonCheckView,
  question_search: QuestionSearchView,
  learner_skills: LearnerSkillsView,
  learner_week: LearnerWeekView,
  learner_mistakes: LearnerMistakesView,
  curriculum_topics: CurriculumTopicsView,
  lesson_ideas: LessonIdeasView,
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
