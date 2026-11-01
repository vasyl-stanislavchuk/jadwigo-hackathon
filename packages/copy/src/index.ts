import { m } from "./paraglide/messages.js";
import {
  type Category,
  type CopyEntry,
  type CopyKey,
  type Language,
  MISTAKE_CLASSES,
} from "./types.ts";
import { CATEGORY_TABLES, TABLES } from "./view.ts";

export { harshWordsIn } from "./harsh.ts";
export type { Category, CopyKey, Language, MistakeClass } from "./types.ts";
export { MISTAKE_CLASSES } from "./types.ts";
export { CATEGORY_TABLES, TABLES } from "./view.ts";

type Vars = Record<string, string | number>;
type Message = (inputs: Record<string, unknown>, options: { locale: Language }) => string;
const MESSAGES = m as unknown as Record<CopyKey, Message>;

/** The line(s) for `key`: the category's own table, then the child table. */
export function lookup(
  language: Language,
  key: CopyKey,
  category: Category = "child",
): CopyEntry | CopyEntry[] {
  return CATEGORY_TABLES[category]?.[language]?.[key] ?? TABLES[language][key];
}

/**
 * The compiled message, called as the tables were: a placeholder `vars` does not name stays
 * `{name}`, so a missing value shows where it goes instead of "undefined".
 */
function say(
  language: Language,
  key: CopyKey,
  line: number,
  vars: Vars,
  category: Category,
): string {
  const message = MESSAGES[key];
  if (message === undefined) throw new Error(`copy: ${key} has no message`);
  const own: Record<string, unknown> = { ...vars, category, line };
  const inputs = new Proxy(own, {
    get: (target, name) =>
      typeof name === "string" && !(name in target) ? `{${name}}` : Reflect.get(target, name),
  });
  return message(inputs, { locale: language });
}

/**
 * One line of copy in `language` for a learner of `category`, with `{name}` placeholders filled
 * from `vars`. A thin wrapper over the Paraglide messages until the call sites use them directly
 * (dl-uukj.35).
 */
export function copy(
  language: Language,
  key: CopyKey,
  vars: Vars = {},
  category: Category = "child",
): string {
  return say(language, key, 0, vars, category);
}

/** The `index`-th line of a list key, cycling (praise, try_again). */
export function copyAt(
  language: Language,
  key: CopyKey,
  index: number,
  vars: Vars = {},
  category: Category = "child",
): string {
  const value = lookup(language, key, category);
  const length = Array.isArray(value) ? value.length : 1;
  return say(language, key, ((index % length) + length) % length, vars, category);
}

/**
 * The copy key that names a mistake class in plain words for the parent (dl-uukj.30): null for no
 * class, and `parent_mistake_other` for a class with no line yet, so the raw id never shows.
 */
export function mistakeCopyKey(mistakeClass: string | null): CopyKey | null {
  if (mistakeClass === null) return null;
  return (MISTAKE_CLASSES as readonly string[]).includes(mistakeClass)
    ? (`parent_mistake_${mistakeClass}` as CopyKey)
    : "parent_mistake_other";
}
