import { enAdult } from "./en.adult.ts";
import { en } from "./en.ts";
import { plAdult } from "./pl.adult.ts";
import { pl } from "./pl.ts";
import type {
  Category,
  CopyEntry,
  CopyKey,
  CopyTable,
  Language,
  PartialCopyTable,
} from "./types.ts";

export type { Category, CopyKey, Language } from "./types.ts";

/** The child tables: every key, in every language. A category with no line of its own reads these. */
export const TABLES: Record<Language, CopyTable> = { pl, en };

/**
 * A category's own lines, per language (dl-i952.17, owner 2026-10-07). An adult reads the adult
 * line where one exists and the child line otherwise;
 */
export const CATEGORY_TABLES: Partial<
  Record<Category, Partial<Record<Language, PartialCopyTable>>>
> = {
  adult: { pl: plAdult, en: enAdult },
};

type Vars = Record<string, string | number>;

/** The line(s) for `key`: the category's own table, then the child table. */
export function lookup(
  language: Language,
  key: CopyKey,
  category: Category = "child",
): CopyEntry | CopyEntry[] {
  return CATEGORY_TABLES[category]?.[language]?.[key] ?? TABLES[language][key];
}

function fill(entry: CopyEntry, language: Language, vars: Vars): string {
  const rules = new Intl.PluralRules(language);
  return entry.text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const plural = entry.plural?.[name];
    if (plural) {
      const n = Number(vars[plural.count]);
      const category = rules.select(n) as keyof typeof plural.forms;
      return plural.forms[category] ?? plural.forms.other;
    }
    return name in vars ? String(vars[name]) : whole;
  });
}

/** One line of copy in `language` for a learner of `category`, with `{name}` placeholders filled from `vars`. */
export function copy(
  language: Language,
  key: CopyKey,
  vars: Vars = {},
  category: Category = "child",
): string {
  const value = lookup(language, key, category);
  const entry = Array.isArray(value) ? value[0] : value;
  if (entry === undefined) throw new Error(`copy: ${key} has no line in ${language}`);
  return fill(entry, language, vars);
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
  const list = Array.isArray(value) ? value : [value];
  const entry = list[((index % list.length) + list.length) % list.length];
  if (entry === undefined) throw new Error(`copy: ${key} has no line in ${language}`);
  return fill(entry, language, vars);
}
