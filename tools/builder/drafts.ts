// The files the live lesson builder shares under JADWIGO_DRAFTS_DIR (dl-a38n.2). jw mcp serve writes
// <draft_id>.json and .check.json; the page appends asks; this channel consumes them and appends
// replies. Each file has one writer, and every JSONL file is append-only.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Work } from "./activity.ts";

const INTENTS = ["change", "question", "note"] as const;
export type Intent = (typeof INTENTS)[number];

export const REPLY_KINDS = ["progress", "done", "question", "note"] as const;
export type ReplyKind = (typeof REPLY_KINDS)[number];

/** One comment from the page, pinned to a step. `ask_ts` is its id. */
export type Ask = {
  ask_ts: string;
  draft_id: string;
  step_id: string;
  intent: Intent;
  text: string;
  author: string;
};

export type Reply = {
  ts: string;
  draft_id: string;
  in_reply_to: string;
  kind: ReplyKind;
  text: string;
  /** On an answer (done or question): what the session did for it, frozen when it replied. */
  work?: Work;
};

/** What the channel says about itself, rewritten on every poll; the page calls it gone when stale. */
export type Heartbeat = {
  at: string;
  pid: number;
  session_id: string;
  loaded: boolean | null;
};

/**
 * The session `make builder` started (JADWIGO_DRAFTS_DIR/.builder/session.json), rewritten at each launch.
 * `transcript` is where Claude Code writes that session's log, which the activity panel tails.
 */
export type BuilderSession = {
  session_id: string;
  started_at: string;
  cwd: string;
  transcript: string;
};

// A draft id names files, so it never carries a path separator or starts with a dot.
const DRAFT_ID = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,127}$/;

export function isDraftId(value: string): boolean {
  return DRAFT_ID.test(value);
}

// Files beside each draft that are not drafts: jw's check file, the page's render file
// (dl-a38n.28) and jw's publish file (dl-a38n wave 3: `<draft_id>.publish.json`, written by
// `lesson_publish` as `{draft_id, request, lesson_id, version, assignment_id, play_url, verified,
// target, published_at, timings}`; the page shows it as the publish state).
const BESIDE = [".check.json", ".render.json", ".publish.json"];

/**
 * The draft id that one file in the drafts directory holds, or null: `<draft_id>.json`, never
 * dotfiles, check files or render files. The page's listing (apps/web/dev/draft-watch.ts) skips
 * the same.
 */
export function draftIdOf(name: string): string | null {
  if (name.startsWith(".") || !name.endsWith(".json")) return null;
  if (BESIDE.some((suffix) => name.endsWith(suffix))) return null;
  const id = name.slice(0, -".json".length);
  return isDraftId(id) ? id : null;
}

export const ASKS_SUFFIX = ".asks.jsonl";

export const asksFile = (dir: string, draftId: string) => join(dir, `${draftId}${ASKS_SUFFIX}`);
export const consumedFile = (dir: string, draftId: string) =>
  join(dir, `${draftId}.consumed.jsonl`);
export const repliesFile = (dir: string, draftId: string) => join(dir, `${draftId}.replies.jsonl`);
// The builder's own files sit in a hidden folder, so the page never lists one as a draft.
export const heartbeatFile = (dir: string) => join(dir, ".builder", "channel.heartbeat.json");
export const sessionFile = (dir: string) => join(dir, ".builder", "session.json");

/** Every parseable object row of a JSONL file; a torn last line, mid-append, is skipped. */
export function readRows(path: string): Record<string, unknown>[] {
  if (!existsSync(path)) return [];
  const rows: Record<string, unknown>[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const row: unknown = JSON.parse(line);
      if (row && typeof row === "object" && !Array.isArray(row)) {
        rows.push(row as Record<string, unknown>);
      }
    } catch {
      // A line still being written; the next read has it whole.
    }
  }
  return rows;
}

export function appendRow(path: string, row: object): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(row)}\n`);
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

export function readAsks(dir: string, draftId: string): Ask[] {
  const asks: Ask[] = [];
  for (const row of readRows(asksFile(dir, draftId))) {
    const intent = text(row["intent"]);
    const ask = {
      ask_ts: text(row["ask_ts"]),
      draft_id: draftId,
      step_id: text(row["step_id"]),
      intent: (INTENTS as readonly string[]).includes(intent) ? (intent as Intent) : "note",
      text: text(row["text"]),
      author: text(row["author"]),
    };
    if (ask.ask_ts && ask.text.trim()) asks.push(ask);
  }
  return asks;
}

export function consumedTs(dir: string, draftId: string): Set<string> {
  return new Set(readRows(consumedFile(dir, draftId)).map((row) => text(row["ask_ts"])));
}

// The channel rewrites its heartbeat at least every 5 seconds; 3 missed beats is a channel gone
// (apps/web/dev/ask.ts reads it the same way).
export const STALE_MS = 15_000;

export function readHeartbeat(dir: string): Heartbeat | null {
  try {
    const beat: unknown = JSON.parse(readFileSync(heartbeatFile(dir), "utf8"));
    if (!beat || typeof beat !== "object") return null;
    const { at, pid } = beat as Partial<Heartbeat>;
    return typeof at === "string" && typeof pid === "number" ? (beat as Heartbeat) : null;
  } catch {
    return null;
  }
}

/** Whether a process is running: signal 0 checks without sending anything. */
export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as { code?: string }).code === "EPERM";
  }
}

/**
 * The heartbeat of another channel that is serving this directory now, or null: fresh, written by
 * a running process other than `self`, from a session that loaded the channel (dl-a38n.38). Two
 * channels on one directory would each consume asks, so a comment reaches only one session.
 */
export function otherLiveChannel(
  beat: Heartbeat | null,
  self: number,
  now: Date,
  alive: (pid: number) => boolean = pidAlive,
): Heartbeat | null {
  if (!beat || beat.pid === self || beat.loaded === false) return null;
  const at = Date.parse(beat.at);
  if (!Number.isFinite(at) || now.getTime() - at > STALE_MS) return null;
  return alive(beat.pid) ? beat : null;
}
