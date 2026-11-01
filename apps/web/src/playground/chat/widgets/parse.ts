/**
 * Each verb's `tool_result.view.data` read into the shape its widget draws (dl-z5ja.24), or null
 * when it does not fit: the widget never parses text and never draws half a payload, and a miss
 * falls back to the plain card (`docs/research/posthog-ai-ux-patterns.md` section 6). One function
 * per verb, so moving these to Zod schemas in `packages/contracts` replaces this file only.
 */

import { FINDING_LEVELS, type Finding } from "@jadwigo/lesson-import/file";

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

function finding(value: unknown): Finding | null {
  if (!isFields(value)) return null;
  const { step_id, path, level, rule, text, fix } = value;
  if (step_id !== null && !isString(step_id)) return null;
  if (!isString(path) || !isString(rule) || !isString(text) || !isString(fix)) return null;
  if (!(FINDING_LEVELS as readonly unknown[]).includes(level)) return null;
  return { step_id, path, level: level as Finding["level"], rule, text, fix };
}

/** Every element read, or null when one does not fit. */
function all<T>(value: unknown, read: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  const out: T[] = [];
  for (const item of value) {
    const read_ = read(item);
    if (read_ === null) return null;
    out.push(read_);
  }
  return out;
}

export interface CheckView {
  ok: boolean;
  findings: Finding[];
}

export function checkView(data: unknown): CheckView | null {
  if (!isFields(data) || typeof data["ok"] !== "boolean") return null;
  const findings = all(data["findings"], finding);
  return findings === null ? null : { ok: data["ok"], findings };
}

export interface EditView extends CheckView {
  step_id: string;
}

export function editView(data: unknown): EditView | null {
  const check = checkView(data);
  if (check === null || !isFields(data) || !isString(data["step_id"])) return null;
  return { ...check, step_id: data["step_id"] };
}

export interface SearchView {
  sets: { set_id: string; title: string }[];
}

export function searchView(data: unknown): SearchView | null {
  if (!isFields(data)) return null;
  const sets = all(data["sets"], (s) =>
    isFields(s) && isString(s["set_id"]) && isString(s["title"])
      ? { set_id: s["set_id"], title: s["title"] }
      : null,
  );
  return sets === null ? null : { sets };
}
