/**
 * What an error may say once it leaves our code (the owner's 2026-11-04 error tracking decision,
 * dl-w0b4.148): its type, its stack and a scrubbed message. Messages can hold a learner's name or
 * answer, so anything quoted goes, along with ids, emails and long numbers. This works on patterns:
 * a name in an unquoted message of our own still passes, so never write one into an error.
 * Pure on purpose: the browser's before_send and the server's report share it.
 */

/** Path segments that follow these words are ids; they become `:id`. */
const ID_AFTER = new Set(["play", "children", "attempts", "assignments", "lessons", "history"]);

/** An id-looking segment: a prefixed id (`lrn_…`), a uuid, or a long run of digits or hex. */
const ID_SEGMENT = /^([a-z]{2,5}_[0-9A-Za-z]+|[0-9a-f-]{16,}|\d{4,})$/;

/** A prefixed id (`lrn_…`) or a uuid anywhere in a value, such as `data-learner-card`'s. */
export const ID_ANYWHERE =
  /\b[a-z]{2,5}_[0-9A-Za-z]{10,}\b|\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/g;

/** Cuts ids out of a path or a URL, and drops its query and hash (`?claim=`, `?for=` carry ids).
 * A value that is neither, such as PostHog's `$direct` referrer, passes unchanged. */
export function cutPath(value: string): string {
  if (!value.startsWith("/") && !/^[a-z]+:\/\//i.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value, "https://x.invalid");
  } catch {
    return "";
  }
  const parts = url.pathname.split("/");
  const cut = parts.map((part, i) =>
    (i > 0 && ID_AFTER.has(parts[i - 1] ?? "")) || ID_SEGMENT.test(part) ? ":id" : part,
  );
  const path = cut.join("/");
  return /^[a-z]+:\/\//i.test(value) ? `${url.origin}${path}` : path;
}

/** The severities the SDKs send. */
const LEVELS = new Set(["fatal", "error", "warning", "log", "info", "debug"]);

export function isExceptionLevel(value: unknown): value is string {
  return typeof value === "string" && LEVELS.has(value);
}

/** The longest message that leaves. */
const MESSAGE_CHARS = 200;

/** Read at most this much: a very long message is cut before any pattern walks it. */
const READ_CHARS = 2000;

/**
 * A quoted run, to its closing quote or the end. A backslash escapes the next character, so a JSON
 * body's `"flagged: \\"Zosia\\""` goes whole. Typographic quotes count: Polish writes „kot”. An
 * apostrophe inside a word (`doesn't`) opens nothing.
 */
const QUOTED =
  /"(?:\\.|[^"\\])*(?:"|$)|`(?:\\.|[^`\\])*(?:`|$)|(?<![\p{L}\p{N}])'(?:\\.|[^'\\])*(?:'|$)|„[^”“"]*(?:[”“"]|$)|“[^”]*(?:”|$)|‘[^’]*(?:’|$)|«[^»]*(?:»|$)|‹[^›]*(?:›|$)/gu;
const URLS = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'`<>)]+/gi;
const EMAILS = /[^\s"'`<>()]+@[^\s"'`<>()]+/g;
const LONG_NUMBERS = /\d{4,}/g;

/** The SDKs' words for a thrown value that is no Error: what follows is the value, or its keys. */
const SDK_VALUE = /\bcaptured\b[^:]*:.*$/is;

/** A message with what could be a person's taken out, at most 200 characters. */
export function scrubMessage(message: string): string {
  return message
    .slice(0, READ_CHARS)
    .replace(SDK_VALUE, 'captured: "…"')
    .replace(QUOTED, '"…"')
    .replace(URLS, (url) => cutPath(url))
    .replace(EMAILS, ":email")
    .replace(ID_ANYWHERE, ":id")
    .replace(LONG_NUMBERS, ":n")
    .slice(0, MESSAGE_CHARS);
}

/** A class name that says it is an error. A thrown `{ name: "Zosia" }` would otherwise be a type. */
const ERROR_TYPE = /^(?:[A-Z][A-Za-z0-9]*)?(?:Error|Exception|Failed|Rejection)$/;

export function scrubType(type: string): string {
  return ERROR_TYPE.test(type) ? type : "Error";
}

/** A frame's file: a web URL or a path is cut, and anything else loses its query and hash. */
function cutFilename(filename: string): string {
  if (/^data:/i.test(filename)) return "data:";
  if (/^https?:\/\//i.test(filename) || filename.startsWith("/")) return cutPath(filename);
  return filename.split(/[?#]/)[0] ?? "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Copies the listed keys that hold a value of the listed type. */
function pick(
  from: Record<string, unknown>,
  keys: Readonly<Record<string, "string" | "number" | "boolean">>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, type] of Object.entries(keys)) {
    if (typeof from[key] === type) out[key] = from[key];
  }
  return out;
}

/** `chunk_id` is how PostHog finds a frame's source map. Source context lines and `vars` hold
 * the program's data, so they never leave. */
const FRAME_KEYS = {
  function: "string",
  module: "string",
  lineno: "number",
  colno: "number",
  in_app: "boolean",
  platform: "string",
  resolved: "boolean",
  chunk_id: "string",
} as const;

const MECHANISM_KEYS = {
  handled: "boolean",
  type: "string",
  synthetic: "boolean",
  exception_id: "number",
  parent_id: "number",
} as const;

function scrubFrame(frame: Record<string, unknown>): Record<string, unknown> {
  const out = pick(frame, FRAME_KEYS);
  if (typeof frame["filename"] === "string") out["filename"] = cutFilename(frame["filename"]);
  if (typeof frame["abs_path"] === "string") out["abs_path"] = cutFilename(frame["abs_path"]);
  return out;
}

/** What a thrown string or object says instead of itself: its text is whatever the code threw,
 * with no shape a pattern could know, so none of it leaves. The SDKs mark these `synthetic`. */
export const THROWN_VALUE = "A value that is not an Error was thrown";

function scrubException(exception: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const mechanism = exception["mechanism"];
  const thrownValue = isRecord(mechanism) && mechanism["synthetic"] === true;
  if (typeof exception["type"] === "string") out["type"] = scrubType(exception["type"]);
  if (typeof exception["value"] === "string")
    out["value"] = thrownValue ? THROWN_VALUE : scrubMessage(exception["value"]);
  if (isRecord(mechanism)) out["mechanism"] = pick(mechanism, MECHANISM_KEYS);
  const stack = exception["stacktrace"];
  if (isRecord(stack) && Array.isArray(stack["frames"]))
    out["stacktrace"] = {
      ...pick(stack, { type: "string" }),
      frames: stack["frames"].filter(isRecord).map(scrubFrame),
    };
  return out;
}

/** An `$exception_list` with only what the allowlists name, or null when it is not a list. */
export function scrubExceptionList(list: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(list)) return null;
  return list.filter(isRecord).map(scrubException);
}

/** Not our bug and nothing to act on: a harmless browser notice, or a script of another origin. */
const NOISE_MESSAGE = /^(ResizeObserver loop|Script error\.?$)/;
const EXTENSION_FILE = /^(chrome|moz|safari|safari-web|ms-browser)-extension:\/\//;

/** An exception that would only bury real issues: browser noise, or a visitor's extension. */
export function isNoise(list: unknown): boolean {
  if (!Array.isArray(list)) return false;
  return list.filter(isRecord).some((exception) => {
    if (typeof exception["value"] === "string" && NOISE_MESSAGE.test(exception["value"]))
      return true;
    const stack = exception["stacktrace"];
    if (!isRecord(stack) || !Array.isArray(stack["frames"])) return false;
    return stack["frames"]
      .filter(isRecord)
      .some(
        (frame) => typeof frame["filename"] === "string" && EXTENSION_FILE.test(frame["filename"]),
      );
  });
}
