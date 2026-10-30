/**
 * The browser-safe entry, `@jadwigo/lesson-import/file` (dl-a38n.11): the lesson file's parse and
 * types, with nothing that needs Node. The lesson builder's page parses a draft with it; the compile
 * and the import stay behind `src/index.ts`, because their uuid v5 and content hashes use
 * `node:crypto`. Keep this file's imports free of `compile.ts`, `ids.ts` and `node:*`.
 */
export {
  type FileQuestion,
  type LessonFile,
  type LessonPart,
  type LessonStep,
  parseLessonFile,
  type QuestionStep,
  questionSteps,
  type TeachingStep,
} from "./lesson-file.ts";
