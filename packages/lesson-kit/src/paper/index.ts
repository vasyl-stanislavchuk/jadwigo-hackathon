// The print sheet's builder (dl-1eieq.8.1), as `@jadwigo/lesson-kit/paper`: pure TypeScript and
// KaTeX, no React view and no CSS, so the API builds a sheet on the server.

export {
  buildPrintSheet,
  LessonNotPrintable,
  PAPER_ACTIONS,
  type PrintInput,
  type PrintSource,
  paperSay,
  SCREEN_VERB,
} from "./sheet.ts";
