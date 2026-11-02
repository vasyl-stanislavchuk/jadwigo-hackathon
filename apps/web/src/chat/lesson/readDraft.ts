/**
 * A lesson draft read in its own language, by the chat's lesson pane and the lesson builder alike.
 * It imports only lesson-import's browser-safe entry, so the dev server can read it too.
 */

import {
  type LessonFile,
  parseLessonFileLenient,
  type SkippedStep,
} from "@jadwigo/lesson-import/file";

const LANGUAGES = ["pl", "uk", "en"] as const;

/** A line in each language the lesson file can carry, `{pl, uk, en}` and nothing else. */
function isTr(value: unknown): value is Record<(typeof LANGUAGES)[number], unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === LANGUAGES.length && LANGUAGES.every((l) => keys.includes(l));
}

/** `value` with every `{pl, uk, en}` line in it put in `language`, as lesson-import's parse does. */
function inLanguage(value: unknown, language: string): unknown {
  if (isTr(value)) return value[language as (typeof LANGUAGES)[number]];
  if (Array.isArray(value)) return value.map((v) => inLanguage(v, language));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, inLanguage(v, language)]));
}

/** A draft as the adapter reads it: lesson-import's lenient parse, which puts every line in the
 * draft's language and leaves out, with the reason, each step that does not parse. */
export type ReadDraft = { file: LessonFile; skipped: SkippedStep[] };

/** A draft read, or why it cannot be read yet: its frame (id, title, language, parts) does not
 * parse. A step that does not parse is not a reason; it comes back in `skipped`. */
export function readDraft(raw: unknown): ReadDraft | { error: string } {
  if (raw === null || typeof raw !== "object") return { error: "the draft is not an object" };
  try {
    return parseLessonFileLenient(raw);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** A draft's title in its own language, for the picker; "" when it has none yet. */
export function titleOf(raw: unknown): string {
  if (raw === null || typeof raw !== "object") return "";
  const { title, language } = raw as { title?: unknown; language?: unknown };
  const resolved = inLanguage(title, typeof language === "string" ? language : "en");
  return typeof resolved === "string" ? resolved : "";
}
