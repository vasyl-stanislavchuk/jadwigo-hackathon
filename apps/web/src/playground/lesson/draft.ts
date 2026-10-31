/**
 * What the draft watcher (dev/draft-watch.ts) sends the lesson builder over Vite's HMR socket, and
 * the draft read in its own language. Shared by the dev server and the page, so it imports only
 * lesson-import's browser-safe entry.
 *
 *   page    -> builder:hello {draft_id}   on load, on a pick and on every reconnect
 *   server  -> builder:draft DraftMessage  to that page at once, and again on every change in the dir
 */

import {
  type LessonFile,
  parseLessonFileLenient,
  type SkippedStep,
} from "@jadwigo/lesson-import/file";

export const BUILDER_DRAFT = "builder:draft";
export const BUILDER_HELLO = "builder:hello";

/** One draft in the directory, newest first in a message. */
export interface DraftSummary {
  draft_id: string;
  title: string;
  /** The draft file's last change, in ms since the epoch. */
  mtime: number;
}

/** The page's hello: the draft it shows, or null for the newest. */
export interface HelloMessage {
  draft_id: string | null;
}

export interface DraftMessage {
  /** The directory watched, so an empty page can say where to put a draft. */
  dir: string;
  drafts: DraftSummary[];
  /** The draft sent: the one the page picked, else the newest; null when there is none. */
  draft_id: string | null;
  /** `<draft_id>.json` as written, or null. */
  draft: unknown;
  /** `<draft_id>.check.json` as written, or null when the draft was never checked. */
  check: unknown;
  /** `<draft_id>.render.json`, the page's render findings (dev/render.ts), or null. */
  render: unknown;
  /** `<draft_id>.publish.json`, jw's last `lesson_publish` of the draft, or null (dl-a38n.48). */
  publish: unknown;
  /** Why the draft or its check could not be read (half-written, not JSON), or null. */
  error: string | null;
}

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
