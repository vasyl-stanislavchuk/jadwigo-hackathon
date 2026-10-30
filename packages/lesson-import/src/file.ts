/**
 * The browser-safe entry, `@jadwigo/lesson-import/file` (dl-a38n.11): the lesson file's parse and
 * types, with nothing that needs Node. The lesson builder's page parses a draft with it; the compile
 * and the import stay behind `src/index.ts`, because their uuid v5 and content hashes use
 * `node:crypto`. Keep this file's imports free of `compile.ts`, `ids.ts` and `node:*`. It also
 * carries the check's `Finding` and `worstLevel` and a lenient parse (dl-a38n.20), so the page
 * needs nothing from `src/index.ts`.
 */
export { FINDING_LEVELS, type Finding, type FindingLevel, worstLevel } from "./findings.ts";
export {
  type FileQuestion,
  type LessonFile,
  type LessonPart,
  type LessonStep,
  parseLessonFile,
  parseLessonFileLenient,
  type QuestionStep,
  questionSteps,
  type SkippedStep,
  safeParseLessonFile,
  type TeachingStep,
} from "./lesson-file.ts";
