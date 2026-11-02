/**
 * What the draft watcher (dev/draft-watch.ts) sends the lesson builder over Vite's HMR socket, and
 * the draft read in its own language. Shared by the dev server and the page, so it imports only
 * lesson-import's browser-safe entry.
 *
 *   page    -> builder:hello {draft_id}   on load, on a pick and on every reconnect
 *   server  -> builder:draft DraftMessage  to that page at once, and again on every change in the dir
 */

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

export { titleOf } from "../../chat/lesson/readDraft.ts";
