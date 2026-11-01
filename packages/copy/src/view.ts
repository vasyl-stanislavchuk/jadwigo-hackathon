/**
 * The typed tables, read back from the Paraglide messages (dl-5ssh.34.22). messages/<locale>.json
 * is the source; this view keeps the old table shape for the readers that walk every line (the
 * playground's design system page, the conformance items, the tests). A `category=<c>` variant is
 * that category's line and `category=*` the child's; a `line=<n>` variant is a list's n-th line. A
 * counted noun's `plural[<selector>].forms[<form>]` is the whole line with that form and every
 * other noun in `other`; `text` is the line with every noun in `other`.
 */
import en from "../messages/en.json" with { type: "json" };
import pl from "../messages/pl.json" with { type: "json" };
import reviewEn from "../messages/review.en.json" with { type: "json" };
import reviewPl from "../messages/review.pl.json" with { type: "json" };
import {
  type Category,
  COPY_KEYS,
  type CopyEntry,
  type CopyTable,
  type Language,
  type PartialCopyTable,
} from "./types.ts";

interface Variant {
  declarations: string[];
  selectors: string[];
  match: Record<string, string>;
}
type Flag = boolean | Record<string, boolean>;

const MESSAGES: Record<Language, Record<string, unknown>> = { pl, en };
const REVIEW: Record<Language, Record<string, Flag>> = { pl: reviewPl, en: reviewEn };

const flagOf = (flag: Flag | undefined, match: string): boolean =>
  typeof flag === "boolean" ? flag : (flag?.[match] ?? false);

/** One key's lines, by category: "*" is the child's. */
function entriesOf(message: unknown, flag: Flag | undefined): Map<string, CopyEntry[]> {
  const out = new Map<string, CopyEntry[]>();
  if (typeof message === "string") {
    out.set("*", [{ text: message, reviewed: flagOf(flag, "") }]);
    return out;
  }
  const variant = (message as Variant[])[0];
  if (!variant) return out;
  const counts = new Map<string, string>();
  for (const d of variant.declarations) {
    const [, slot, count] = /^local (\w+) = (\w+): plural$/.exec(d) ?? [];
    if (slot && count) counts.set(slot, count);
  }
  // Group the variants by category and line; the plural picks stay inside one entry.
  const groups = new Map<
    string,
    { category: string; line: number; picks: [Record<string, string>, string, string][] }
  >();
  for (const [at, text] of Object.entries(variant.match)) {
    const pick: Record<string, string> & { category?: string; line?: string } = Object.fromEntries(
      at.split(", ").map((pair) => pair.split("=") as [string, string]),
    );
    const category = pick.category ?? "*";
    const line = Number(pick.line ?? 0);
    const id = `${category}/${line}`;
    const group = groups.get(id) ?? { category, line, picks: [] };
    group.picks.push([pick, text, at]);
    groups.set(id, group);
  }
  for (const { category, line, picks } of groups.values()) {
    const slots = [...counts.keys()].filter((slot) => picks.some(([p]) => p[slot] !== "*"));
    const isOther = (p: Record<string, string>, except?: string) =>
      slots.every((s) => s === except || p[s] === "other");
    const base = picks.find(([p]) => isOther(p)) ?? picks[0];
    const entry: CopyEntry = {
      text: base?.[1] ?? "",
      reviewed: picks.every(([, , at]) => flagOf(flag, at)),
    };
    if (slots.length > 0)
      entry.plural = Object.fromEntries(
        slots.map((slot) => [
          slot,
          {
            count: counts.get(slot) ?? "",
            forms: {
              other: entry.text,
              ...Object.fromEntries(
                picks.filter(([p]) => isOther(p, slot)).map(([p, text]) => [p[slot], text]),
              ),
            },
          },
        ]),
      );
    const list = out.get(category) ?? [];
    list[line] = entry;
    out.set(category, list);
  }
  return out;
}

const isList = (message: unknown) =>
  Array.isArray(message) && ((message as Variant[])[0]?.selectors.includes("line") ?? false);

function tablesOf(language: Language): {
  child: CopyTable;
  categories: Map<string, PartialCopyTable>;
} {
  const child: Partial<CopyTable> = {};
  const categories = new Map<string, PartialCopyTable>();
  for (const key of COPY_KEYS) {
    const message = MESSAGES[language][key];
    if (message === undefined) continue;
    for (const [category, lines] of entriesOf(message, REVIEW[language][key])) {
      const value = isList(message) ? lines : lines[0];
      if (value === undefined) continue;
      if (category === "*") child[key] = value;
      else {
        const table = categories.get(category) ?? {};
        table[key] = value;
        categories.set(category, table);
      }
    }
  }
  return { child: child as CopyTable, categories };
}

const BUILT = { pl: tablesOf("pl"), en: tablesOf("en") } satisfies Record<Language, unknown>;

/** The child tables: every key, in every language. A category with no line of its own reads these. */
export const TABLES: Record<Language, CopyTable> = { pl: BUILT.pl.child, en: BUILT.en.child };

/**
 * A category's own lines, per language (dl-i952.17, owner 2026-10-07). An adult reads the adult
 * line where one exists and the child line otherwise.
 */
export const CATEGORY_TABLES: Partial<
  Record<Category, Partial<Record<Language, PartialCopyTable>>>
> = {};
for (const language of ["pl", "en"] as const)
  for (const [category, table] of BUILT[language].categories) {
    const byLanguage = CATEGORY_TABLES[category as Category] ?? {};
    byLanguage[language] = table;
    CATEGORY_TABLES[category as Category] = byLanguage;
  }
