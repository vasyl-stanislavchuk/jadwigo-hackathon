// What the builder session did, read from its own transcript (dl-a38n.15), never from a prompt:
// one plain line per tool call, from Claude Code's ~/.claude/projects/<slug>/<session>.jsonl.
// The rules are md's (share_review_ops.py describe_tool, read_activity, work_summary):
// - only a file's basename reaches the page, and never a command's text;
// - repeated lines fold into one, but a failed call never folds into a success, and it reads
//   "Couldn't …";
// - the summary on a reply covers only what the transcript shows inside its window, so the page
//   claims no work it cannot see.
// The channel freezes that summary onto each answer when the session replies; the web dev server
// pushes the live lines to the page. The transcript format is undocumented: this file is where a
// change in Claude Code lands.
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";

// The tail is enough for the steps of one answer; a longer session keeps its newest rows.
const TAIL_BYTES = 256 * 1024;
// A result too big for the turn is saved beside the transcript; past this, it is not read.
const SAVED_MAX_BYTES = 2 * 1024 * 1024;
// The most steps a finished answer keeps; its call count still says how many there were.
const WORK_STEPS_MAX = 20;

const READ = new Set(["Read", "NotebookRead"]);
const SEARCH = new Set(["Grep", "Glob", "LS"]);
const EDIT = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const LOOKUP = new Set(["WebFetch", "WebSearch"]);
const HELPER = new Set(["Task", "Agent"]);
const DRAFT = "mcp__jadwigo__lesson_draft";
const CHECK = "mcp__jadwigo__lesson_check";
const BANK = "mcp__jadwigo__question_";
const REPLY = "mcp__jadwigo-builder__reply";

/** One line of what the session did, folded. `open` while its call has no result yet. */
type Step = { at: string; text: string; failed: boolean; open: boolean };

export type Activity = {
  steps: Step[];
  /** Every call that gave a line, folded or not, by when it started. */
  calls: string[];
  read: { at: string; name: string }[];
  changed: { at: string; name: string }[];
};

/** What one answer took, frozen onto the reply when it is written. */
export type Work = {
  steps: { text: string; ok: boolean }[];
  calls: number;
  failed: number;
  read: string[];
  changed: string[];
};

type Result = { error: boolean; text: string };

function name(path: unknown): string {
  return typeof path === "string" && path ? basename(path) : "";
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function json(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** "Drew 6 questions from 2 sets", from lesson_draft's result, or null when it cannot be read. */
function drewLine(result: Record<string, unknown> | null): string | null {
  const questions = result?.["questions"];
  if (!Array.isArray(questions)) return null;
  const sets = new Set(
    questions.map((q) => (q && typeof q === "object" ? (q as { set_id?: unknown }).set_id : null)),
  );
  sets.delete(null);
  sets.delete(undefined);
  return `Drew ${plural(questions.length, "question", "questions")} from ${plural(sets.size, "set", "sets")}`;
}

/** "Check: 2 errors, 1 warning", from lesson_check's result (findings, else the older errors). */
function checkLine(result: Record<string, unknown> | null): string | null {
  if (!result) return null;
  const findings = result["findings"];
  if (Array.isArray(findings)) {
    const level = (f: unknown) =>
      f && typeof f === "object" ? (f as { level?: unknown }).level : "";
    const errors = findings.filter((f) => level(f) === "error").length;
    const warnings = findings.filter((f) => level(f) === "warn").length;
    return `Check: ${plural(errors, "error", "errors")}, ${plural(warnings, "warning", "warnings")}`;
  }
  const errors = result["errors"];
  if (Array.isArray(errors))
    return `Check: ${plural(errors.length, "error", "errors")}, 0 warnings`;
  return result["ok"] === true ? "Check: 0 errors, 0 warnings" : null;
}

/** The line a call shows, and the file it read or changed. A call nobody needs to see gives "". */
function describe(
  tool: string,
  input: Record<string, unknown>,
  result: Record<string, unknown> | null,
): { text: string; read?: string; changed?: string } {
  if (READ.has(tool)) {
    const file = name(input["file_path"] ?? input["notebook_path"]);
    return file ? { text: `Reading ${file}`, read: file } : { text: "Reading the code" };
  }
  if (SEARCH.has(tool)) return { text: "Searching the code" };
  if (EDIT.has(tool)) {
    const file = name(input["file_path"] ?? input["notebook_path"]);
    return file ? { text: `Editing ${file}`, changed: file } : { text: "Editing the code" };
  }
  if (tool === "Bash") return { text: "Running a command" };
  if (LOOKUP.has(tool)) return { text: "Looking something up" };
  if (HELPER.has(tool)) return { text: "Handing part of it to a helper" };
  if (tool === DRAFT) return { text: drewLine(result) ?? "Drawing questions from the bank" };
  if (tool === CHECK) return { text: checkLine(result) ?? "Check: running" };
  if (tool.startsWith(BANK)) return { text: "Looking in the question bank" };
  if (tool === REPLY) return { text: "Replied" };
  return { text: "" };
}

/** The words for a call that errored, from the line it would have shown. */
function failedLine(tool: string, text: string): string {
  if (text.startsWith("Reading ")) return `Couldn't read ${text.slice("Reading ".length)}`;
  if (text.startsWith("Editing ")) return `Couldn't edit ${text.slice("Editing ".length)}`;
  if (tool === DRAFT) return "Couldn't draw the questions";
  if (tool === CHECK) return "Couldn't run the check";
  if (tool === REPLY) return "Couldn't reply";
  const known: Record<string, string> = {
    "Searching the code": "A search failed",
    "Looking something up": "A lookup failed",
    "Handing part of it to a helper": "A helper failed",
    "Looking in the question bank": "A bank lookup failed",
  };
  return known[text] ?? "A command failed";
}

/** The newest rows of a transcript, whole lines only; [] when it is not there. */
export function readTail(path: string, bytes = TAIL_BYTES): string[] {
  if (!existsSync(path)) return [];
  const size = statSync(path).size;
  const start = Math.max(0, size - bytes);
  const buffer = Buffer.alloc(size - start);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buffer, 0, buffer.length, start);
  } finally {
    closeSync(fd);
  }
  const lines = buffer.toString("utf8").split("\n");
  // A tail that starts mid-row drops that row.
  return start > 0 ? lines.slice(1) : lines;
}

const SAVED = /Output has been saved to (\S+?)\.?(?:\n|$)/;

/**
 * A result's text. Claude Code swaps a result too big for the turn for a notice naming the file it
 * saved it in, beside the transcript; that file is read only from that session's own folder.
 */
function resultText(content: unknown, transcript: string): string {
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((part) =>
              part && typeof part === "object" ? (part as { text?: unknown }).text : "",
            )
            .filter((part): part is string => typeof part === "string")
            .join("\n")
        : "";
  const saved = SAVED.exec(text)?.[1];
  if (!saved || !transcript) return text;
  const own = join(dirname(transcript), basename(transcript, ".jsonl"));
  const inside = relative(own, saved);
  if (inside.startsWith("..") || inside.startsWith(sep)) return text;
  try {
    return statSync(saved).size <= SAVED_MAX_BYTES ? readFileSync(saved, "utf8") : text;
  } catch {
    return text;
  }
}

type Row = { type?: unknown; timestamp?: unknown; message?: { content?: unknown } };

function rowsOf(lines: readonly string[]): Row[] {
  const rows: Row[] = [];
  for (const line of lines) {
    if (!line.includes('"tool_use"') && !line.includes('"tool_result"')) continue;
    try {
      const row: unknown = JSON.parse(line);
      if (row && typeof row === "object") rows.push(row as Row);
    } catch {
      // A row still being written.
    }
  }
  return rows;
}

function blocks(row: Row): Record<string, unknown>[] {
  const content = row.message?.content;
  return Array.isArray(content)
    ? content.filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
    : [];
}

/** Every tool call in the rows, oldest first, as the page words it, repeats folded. */
export function mapTranscript(lines: readonly string[], transcript = ""): Activity {
  const rows = rowsOf(lines);
  const results = new Map<string, Result>();
  for (const row of rows) {
    if (row.type !== "user") continue;
    for (const block of blocks(row)) {
      if (block["type"] !== "tool_result") continue;
      results.set(String(block["tool_use_id"] ?? ""), {
        error: block["is_error"] === true,
        text: resultText(block["content"], transcript),
      });
    }
  }
  const activity: Activity = { steps: [], calls: [], read: [], changed: [] };
  for (const row of rows) {
    if (row.type !== "assistant" || typeof row.timestamp !== "string") continue;
    const at = row.timestamp;
    for (const block of blocks(row)) {
      if (block["type"] !== "tool_use") continue;
      const tool = String(block["name"] ?? "");
      const input = (block["input"] ?? {}) as Record<string, unknown>;
      const result = results.get(String(block["id"] ?? ""));
      const said = describe(tool, input, result ? json(result.text) : null);
      if (!said.text) continue;
      activity.calls.push(at);
      if (said.read) activity.read.push({ at, name: said.read });
      if (said.changed) activity.changed.push({ at, name: said.changed });
      const failed = result?.error === true;
      const text = failed ? failedLine(tool, said.text) : said.text;
      const last = activity.steps.at(-1);
      if (last && last.text === text && last.failed === failed) {
        last.open = !result;
        continue;
      }
      activity.steps.push({ at, text, failed, open: !result });
    }
  }
  return activity;
}

/**
 * What the session did between `since` and `until`, or null when the transcript shows nothing
 * there. Written onto a reply when it is sent, because the transcript keeps growing after it.
 */
export function workSummary(activity: Activity, since: string, until: string): Work | null {
  const inside = (at: string) => since <= at && at <= until;
  const steps = activity.steps.filter((step) => inside(step.at));
  const calls = activity.calls.filter(inside).length;
  if (steps.length === 0 && calls === 0) return null;
  const unique = (names: { at: string; name: string }[]) =>
    [...new Set(names.filter((n) => inside(n.at)).map((n) => n.name))].sort();
  return {
    steps: steps.slice(-WORK_STEPS_MAX).map((step) => ({ text: step.text, ok: !step.failed })),
    calls,
    failed: steps.filter((step) => step.failed).length,
    read: unique(activity.read),
    changed: unique(activity.changed),
  };
}
