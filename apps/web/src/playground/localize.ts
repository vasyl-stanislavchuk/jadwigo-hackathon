/**
 * A line written in both languages, and picking one. Ported from david-learns
 * frontend/src/playground/sim/localize.ts, Polish and English only. Keys, ids and numbers are the
 * same in both; only the words differ.
 */

import type { Language } from "@jadwigo/copy";

export const LANGUAGES: readonly Language[] = ["pl", "en"];

/** A line in each language. */
export type Tr = { readonly pl: string; readonly en: string };

/** A line written once, or in each language. */
export type Text = string | Tr;

/** A shape as written, where any string may be a Tr, a number a per-language number, and so on. */
export type Authored<T> = T extends string
  ? Text
  : T extends readonly (infer U)[]
    ? readonly Authored<U>[]
    : T extends object
      ? { readonly [K in keyof T]: Authored<T[K]> }
      : T | { readonly pl: T; readonly en: T };

function isTr(value: unknown): value is { pl: unknown; en: unknown } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((k) => k === "pl" || k === "en");
}

/** `value` in one language: every Tr in it, at any depth, becomes its `language` side. */
export function resolve<T>(value: Authored<T> | T, language: Language): T {
  if (isTr(value)) return value[language] as T;
  if (Array.isArray(value)) return value.map((v) => resolve(v, language)) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolve(v, language)]),
    ) as T;
  }
  return value as T;
}
