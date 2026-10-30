import {
  BasedOn,
  Category,
  Credit,
  Family,
  Language,
  LessonKind,
  QuestionType,
  Subject,
} from "@jadwigo/contracts";
import { z } from "zod";

/**
 * A playground lesson file as david-learns `frontend/src/playground/sim/exportLessonFiles.ts`
 * writes it: the LessonFile of `sim/types.ts`, its clips and Polish letter rows done, and a
 * `credit` on each step based on a borrowed item. Read after `resolve` has put every line in the
 * lesson's language. Only what the import keeps is named: a step's `reason` and `scenarios`, the
 * file's `can_do`, `flavour` and `reviewed` are dropped by the parse.
 */

const LANGUAGES = ["pl", "uk", "en"] as const;

/** A line in every language the playground speaks: `{pl, uk, en}` and nothing else. */
function isTr(value: unknown): value is Record<(typeof LANGUAGES)[number], string> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length === LANGUAGES.length &&
    LANGUAGES.every((l) => typeof (value as Record<string, unknown>)[l] === "string")
  );
}

/** Any value with every `{pl, uk, en}` line inside resolved to `language`, as `sim/localize.ts` does. */
function resolve(value: unknown, language: Language): unknown {
  if (isTr(value)) return value[language];
  if (Array.isArray(value)) return value.map((v) => resolve(v, language));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, language)]));
  }
  return value;
}

/**
 * A skill id as the contract writes it (`SkillId`: lowercase words joined by dots). The playground
 * also names a skill by its brain page, `curriculum/math/multiplication/row-2`, and a draft one in
 * Polish, `draft.ortografia.l-ł`: a slash becomes a dot, and a letter with a mark loses the mark.
 * The slash is lossless and the mark is not, so `compile.ts` refuses 2 ids that meet.
 */
export function skillIdOf(raw: string): string {
  return raw
    .replaceAll("/", ".")
    .replaceAll("ł", "l")
    .replaceAll("Ł", "L")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** A question as the file holds it: its family's data and key, and the ladder with the twin. */
const FileQuestion = z.looseObject({
  family: Family,
  data: z.unknown(),
  key: z.unknown(),
  help: z.record(z.string(), z.unknown()).optional(),
});
export type FileQuestion = z.infer<typeof FileQuestion>;

const QuestionStep = z.object({
  id: z.string().min(1),
  question_type: QuestionType,
  /** As the playground writes them; `compile.ts` maps them with `skillIdOf`. */
  skill_ids: z.array(z.string().min(1)),
  based_on: BasedOn.nullable(),
  say: z.string(),
  question: FileQuestion,
  credit: Credit.optional(),
});
export type QuestionStep = z.infer<typeof QuestionStep>;

/** A teaching step: a stem to look at. A v0 lesson is questions only, so it is dropped. */
const TeachingStep = z.object({ id: z.string().min(1), teach: z.looseObject({}) });
export type TeachingStep = z.infer<typeof TeachingStep>;

export const LessonFile = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "a lesson file id is lowercase words and dashes"),
  title: z.string().min(1),
  language: Language,
  category: Category,
  subject: Subject,
  reasoning: z.string(),
  kind: LessonKind.optional(),
  script: z.object({
    parts: z.array(
      z.object({
        part: z.string(),
        steps: z.array(z.union([TeachingStep, QuestionStep])),
      }),
    ),
  }),
});
export type LessonFile = z.infer<typeof LessonFile>;
/** A part of the script: its name and its steps in order. */
export type LessonPart = LessonFile["script"]["parts"][number];
/** A step of a part: a question step, or a teaching step the import drops. */
export type LessonStep = LessonPart["steps"][number];

/** The file with every `{pl, uk, en}` line in its language, or as given when it names none. */
export function inItsLanguage(raw: unknown): unknown {
  const language = Language.safeParse((raw as { language?: unknown } | null)?.language);
  return language.success ? resolve(raw, language.data) : raw;
}

/**
 * The file in its own language, or every problem the schema finds with its path into the file:
 * what `check.ts` reports one finding each, where `parseLessonFile` throws them as one message.
 */
export function safeParseLessonFile(
  raw: unknown,
): { success: true; data: LessonFile } | { success: false; issues: z.core.$ZodIssue[] } {
  const language = Language.safeParse((raw as { language?: unknown } | null)?.language);
  if (!language.success) {
    return {
      success: false,
      issues: language.error.issues.map((i) => ({ ...i, path: ["language", ...i.path] })),
    };
  }
  const parsed = LessonFile.safeParse(resolve(raw, language.data));
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, issues: parsed.error.issues };
}

/** The file in its own language, checked. */
export function parseLessonFile(raw: unknown): LessonFile {
  const language = Language.parse((raw as { language?: unknown } | null)?.language);
  const parsed = LessonFile.safeParse(resolve(raw, language));
  if (!parsed.success) {
    const id = (raw as { id?: unknown }).id;
    throw new Error(`lesson file ${String(id)}: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

/** The question steps in script order: every step but the teaching ones. */
export function questionSteps(file: LessonFile): QuestionStep[] {
  return file.script.parts.flatMap((p) =>
    p.steps.filter((s): s is QuestionStep => "question" in s),
  );
}
