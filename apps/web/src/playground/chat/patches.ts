/**
 * The patches the lesson pane sends (dl-z5ja.111, the page's half of dl-z5ja.76): a parent's own
 * change to a step's words, and "Cofnij", each as a JSON merge patch (RFC 7386) on the opaque lesson
 * file the fold keeps. The runner applies it as a `lesson_revision` with no model call. Pure.
 *
 * A merge patch replaces an array whole, and a lesson's steps sit in `script.parts[].steps[]`, so a
 * step's change carries `script.parts` whole. A merge patch cannot set a key to `null` either, so
 * a revert that would need one is not a patch: the caller falls back to asking in words.
 */

import type { LessonPatch } from "@jadwigo/contracts/run";

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** RFC 7386 applied, the target unchanged: what the runner does with the patch. */
export function applyPatch(target: unknown, patch: unknown): unknown {
  if (!isFields(patch)) return patch;
  const out: Fields = isFields(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete out[key];
    else out[key] = applyPatch(out[key], value);
  }
  return out;
}

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => same(v, b[i]));
  if (isFields(a) && isFields(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => k in b && same(a[k], b[k]));
  }
  return false;
}

/** The smallest merge patch from `from` to `to`, both objects; it may not express a `null`. */
function diff(from: Fields, to: Fields): Fields {
  const out: Fields = {};
  for (const key of Object.keys(from)) if (!(key in to)) out[key] = null;
  for (const [key, value] of Object.entries(to)) {
    const was = from[key];
    if (same(was, value)) continue;
    if (isFields(was) && isFields(value)) out[key] = diff(was, value);
    else out[key] = value;
  }
  return out;
}

/**
 * The patch that turns the lesson the pane draws (`current`) back into `previous`: what "Cofnij"
 * sends. Null when nothing differs, or when no merge patch can say it (a `null` the patch would
 * have to set), checked by applying it.
 */
export function revertPatch(current: unknown, previous: unknown): LessonPatch | null {
  if (!isFields(current) || !isFields(previous)) return null;
  const patch = diff(current, previous);
  if (Object.keys(patch).length === 0) return null;
  return same(applyPatch(current, patch), previous) ? patch : null;
}

/** A step's `say` in `language`: a `{pl, uk, en}` line's entry, or the plain string. */
function sayIn(say: unknown, language: string): string {
  if (typeof say === "string") return say;
  if (isFields(say) && typeof say[language] === "string") return say[language];
  return "";
}

/** Each step of the file, by its id. */
function stepsOf(file: unknown): Fields[] {
  const script = isFields(file) ? file["script"] : undefined;
  const parts = isFields(script) && Array.isArray(script["parts"]) ? script["parts"] : [];
  return parts.flatMap((part) =>
    isFields(part) && Array.isArray(part["steps"]) ? part["steps"].filter(isFields) : [],
  );
}

/** What a step says to the child, in the lesson's language, as the pane's word editor shows it. */
export function wordsOf(file: unknown, step: string, language: string): string {
  const found = stepsOf(file).find((s) => s["id"] === step);
  return found === undefined ? "" : sayIn(found["say"], language);
}

/**
 * The patch for a parent's own words in one step: its `say` in the lesson's language set to
 * `words`, its other languages kept. Null when the step is not in the file or nothing changes.
 */
export function wordsPatch(
  file: unknown,
  step: string,
  language: string,
  words: string,
): LessonPatch | null {
  if (wordsOf(file, step, language) === words) return null;
  const script = isFields(file) ? file["script"] : undefined;
  if (!isFields(script) || !Array.isArray(script["parts"])) return null;
  let found = false;
  const parts = script["parts"].map((part) => {
    if (!isFields(part) || !Array.isArray(part["steps"])) return part;
    return {
      ...part,
      steps: part["steps"].map((s) => {
        if (!isFields(s) || s["id"] !== step) return s;
        found = true;
        const say = s["say"];
        return { ...s, say: isFields(say) ? { ...say, [language]: words } : words };
      }),
    };
  });
  return found ? { script: { parts } } : null;
}
