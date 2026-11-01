// The codemod that ports packages/copy's typed tables into Paraglide messages (dl-5ssh.34.22,
// jadwigo-marketing/decisions/2026-11-01-for-the-hackathon-jadwigo-is-live-in-polish-and-english-on-jadwi).
// It reads src/<locale>.ts (the child table) and src/<locale>.<category>.ts (a category's own lines,
// such as adult) and writes, per locale:
// - messages/<locale>.json: keys unchanged. A key with a category line gets a `category` selector
//   (`category=adult`, and `category=*` for the child line); a list key a `line` selector (0, 1, …);
//   each counted noun its own `plural` selector, with a variant for every CLDR form of the locale.
// - messages/review.<locale>.json: the reviewed flag, one boolean per key, or one per variant
//   where the variants differ.
// - messages/baseline.<locale>.json, for a live locale only: every line unreviewed at the port. The
//   owner's call (2026-11-01): a prod build fails on an unreviewed line that is not in it
//   (tools/src/check-copy.ts).
// `site_*` keys belong to apps/site (lane i18n-site) and are kept as they are. The output is
// Biome-formatted, so a second run on the same tables writes the same bytes.
// Run: bun tools/src/copy-to-messages.ts [--from <git-ref>]   (then: bun run --cwd packages/copy messages)
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { languages } from "./check-languages.ts";

const COPY = "packages/copy";
const SCHEMA = "https://inlang.com/schema/inlang-message-format";
/** The key prefix apps/site owns in the same files. */
const SITE_PREFIX = "site_";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
interface Entry {
  text: string;
  reviewed: boolean;
  plural?: Record<string, { count: string; forms: Forms }>;
}
type Table = Record<string, Entry | Entry[]>;
/** One locale's tables: the child table, and each category's own lines. */
export interface LocaleTables {
  child: Table;
  categories: Record<string, Table>;
}
export interface VariantMessage {
  declarations: string[];
  selectors: string[];
  match: Record<string, string>;
}
type Message = string | VariantMessage[];
export type Messages = Record<string, unknown>;
export type ReviewFlag = boolean | Record<string, boolean>;
export type Review = Record<string, ReviewFlag>;

/** CLDR's plural forms for a locale, in CLDR order. */
export function pluralForms(locale: string): Intl.LDMLPluralRule[] {
  const order: Intl.LDMLPluralRule[] = ["zero", "one", "two", "few", "many", "other"];
  const have = new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
  return order.filter((form) => have.includes(form));
}

const asList = (value: Entry | Entry[]): Entry[] => (Array.isArray(value) ? value : [value]);
const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map(([, name]) => name ?? "");

/** Every combination of one form per slot. */
function combinations(slots: string[], forms: string[]): Record<string, string>[] {
  let out: Record<string, string>[] = [{}];
  for (const slot of slots) out = out.flatMap((pick) => forms.map((f) => ({ ...pick, [slot]: f })));
  return out;
}

/** One key's message and review flag, from its child line and its category lines. */
function portKey(
  locale: string,
  key: string,
  sources: { category: string; value: Entry | Entry[] }[],
): { message: Message; review: ReviewFlag } {
  const only = sources.length === 1 ? sources[0] : undefined;
  if (only && !Array.isArray(only.value) && !only.value.plural)
    return { message: only.value.text, review: only.value.reviewed };

  const isList = sources.some((s) => Array.isArray(s.value));
  if (isList && !sources.every((s) => Array.isArray(s.value)))
    throw new Error(`${locale}.${key}: a list in one table and a single line in another`);
  const counts = new Map<string, string>();
  const inputs = new Set<string>();
  if (sources.length > 1) inputs.add("category");
  if (isList) inputs.add("line");
  for (const { value } of sources)
    for (const entry of asList(value))
      for (const [slot, { count }] of Object.entries(entry.plural ?? {})) {
        const seen = counts.get(slot);
        if (seen !== undefined && seen !== count)
          throw new Error(
            `${locale}.${key}: ${slot} counts ${seen} in one line and ${count} in another`,
          );
        counts.set(slot, count);
      }
  for (const { value } of sources)
    for (const entry of asList(value))
      for (const name of placeholders(entry.text)) if (!counts.has(name)) inputs.add(name);
  for (const count of counts.values()) inputs.add(count);

  const slots = [...counts.keys()];
  const selectors = [
    ...(sources.length > 1 ? ["category"] : []),
    ...(isList ? ["line"] : []),
    ...slots,
  ];
  const forms = pluralForms(locale);
  const match: Record<string, string> = {};
  const flags: Record<string, boolean> = {};
  for (const { category, value } of sources) {
    asList(value).forEach((entry, line) => {
      const own = Object.keys(entry.plural ?? {});
      for (const pick of combinations(own, forms)) {
        const text = entry.text.replace(/\{(\w+)\}/g, (whole, name: string) => {
          const form = pick[name];
          const plural = entry.plural?.[name];
          if (form === undefined || !plural) return whole;
          return plural.forms[form as Intl.LDMLPluralRule] ?? plural.forms.other;
        });
        const at = selectors.map((selector) => {
          if (selector === "category") return `category=${category}`;
          if (selector === "line") return `line=${line}`;
          return `${selector}=${pick[selector] ?? "*"}`;
        });
        match[at.join(", ")] = text;
        flags[at.join(", ")] = entry.reviewed;
      }
    });
  }
  const declarations = [
    ...[...inputs].map((name) => `input ${name}`),
    ...[...counts].map(([slot, count]) => `local ${slot} = ${count}: plural`),
  ];
  const values = new Set(Object.values(flags));
  const review = values.size === 1 ? [...values][0] === true : flags;
  return { message: [{ declarations, selectors, match }], review };
}

/** One locale's messages and review flags. `existing` keeps the site's keys as they are. */
export function portLocale(
  locale: string,
  tables: LocaleTables,
  existing: { messages: Messages; review: Review },
): { messages: Messages; review: Review } {
  const messages: Messages = { $schema: SCHEMA };
  const review: Review = {};
  for (const [key, value] of Object.entries(existing.messages)) {
    if (!key.startsWith(SITE_PREFIX)) continue;
    messages[key] = value;
    review[key] = existing.review[key] ?? false;
  }
  for (const [category, table] of Object.entries(tables.categories))
    for (const key of Object.keys(table))
      if (!(key in tables.child))
        throw new Error(`${locale}.${category}.${key}: a category line with no child line`);
  for (const [key, value] of Object.entries(tables.child)) {
    if (key.startsWith(SITE_PREFIX))
      throw new Error(`${locale}.${key}: ${SITE_PREFIX} keys are the site's`);
    const sources = [{ category: "*", value }];
    for (const [category, table] of Object.entries(tables.categories)) {
      const own = table[key];
      if (own !== undefined) sources.push({ category, value: own });
    }
    const ported = portKey(locale, key, sources);
    messages[key] = ported.message;
    review[key] = ported.review;
  }
  return { messages, review };
}

/** Every line of a message: its match key ("" for a plain string) and its text. */
export function linesOf(message: unknown): { match: string; text: string }[] {
  if (typeof message === "string") return [{ match: "", text: message }];
  if (!Array.isArray(message)) return [];
  return (message as VariantMessage[]).flatMap((variant) =>
    Object.entries(variant.match ?? {}).map(([match, text]) => ({ match, text })),
  );
}

/** Whether one line is reviewed. */
export function flagOf(flag: ReviewFlag | undefined, match: string): boolean {
  if (typeof flag === "boolean") return flag;
  return flag?.[match] ?? false;
}

/** The lines of a locale that are unreviewed now, as baseline.<locale>.json holds them. */
export function baselineOf(
  messages: Messages,
  review: Review,
): Record<string, string | Record<string, string>> {
  const baseline: Record<string, string | Record<string, string>> = {};
  for (const [key, message] of Object.entries(messages)) {
    if (key === "$schema") continue;
    const open = linesOf(message).filter(({ match }) => !flagOf(review[key], match));
    if (open.length === 0) continue;
    const plain = open.length === 1 && open[0]?.match === "";
    baseline[key] = plain
      ? (open[0]?.text ?? "")
      : Object.fromEntries(open.map((l) => [l.match, l.text]));
  }
  return baseline;
}

/** Every file the port writes, by path from the repo root. */
export function port(
  tables: Record<string, LocaleTables>,
  existing: Record<string, { messages: Messages; review: Review }>,
  live: readonly string[],
): Record<string, unknown> {
  const files: Record<string, unknown> = {};
  for (const [locale, own] of Object.entries(tables)) {
    const out = portLocale(locale, own, existing[locale] ?? { messages: {}, review: {} });
    files[`${COPY}/messages/${locale}.json`] = out.messages;
    files[`${COPY}/messages/review.${locale}.json`] = out.review;
    if (live.includes(locale))
      files[`${COPY}/messages/baseline.${locale}.json`] = baselineOf(out.messages, out.review);
  }
  return files;
}

const readJson = <T>(path: string, fallback: T): T =>
  existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback;

/** The table files for `locales` in `dir`: `<locale>.ts` and `<locale>.<category>.ts`. */
function tableFiles(
  names: string[],
  locales: string[],
): { file: string; locale: string; category?: string }[] {
  const found: { file: string; locale: string; category?: string }[] = [];
  for (const file of names) {
    const [, locale = "", category] = /^([a-z]{2})(?:\.([a-z]+))?\.ts$/.exec(file) ?? [];
    if (locales.includes(locale))
      found.push(category ? { file, locale, category } : { file, locale });
  }
  return found;
}

async function main(argv: string[]): Promise<number> {
  const root = resolve(import.meta.dirname, "../..");
  const settings = readJson<{ locales: string[] }>(`${root}/${COPY}/project.inlang/settings.json`, {
    locales: [],
  });
  const from = argv[argv.indexOf("--from") + 1];
  let dir = `${root}/${COPY}/src`;
  if (argv.includes("--from") && from) {
    dir = mkdtempSync(join(tmpdir(), "copy-to-messages-"));
    const names = execFileSync("git", ["ls-tree", "--name-only", from, `${COPY}/src/`], {
      cwd: root,
    })
      .toString()
      .split("\n")
      .map((path) => path.slice(`${COPY}/src/`.length));
    for (const { file } of tableFiles(names, settings.locales))
      writeFileSync(
        join(dir, file),
        execFileSync("git", ["show", `${from}:${COPY}/src/${file}`], { cwd: root }),
      );
  }
  const files = tableFiles(readdirSync(dir), settings.locales);
  if (!files.some((f) => f.category === undefined)) {
    process.stderr.write(
      `copy-to-messages: no table to port in ${dir}; the tables are gone once ported\n`,
    );
    return 1;
  }
  const tables: Record<string, LocaleTables> = {};
  for (const { file, locale, category } of files) {
    const mod = (await import(pathToFileURL(join(dir, file)).href)) as Record<string, Table>;
    const table = Object.values(mod)[0] ?? {};
    tables[locale] ??= { child: {}, categories: {} };
    if (category) tables[locale].categories[category] = table;
    else tables[locale].child = table;
  }
  const existing: Record<string, { messages: Messages; review: Review }> = {};
  for (const locale of settings.locales)
    existing[locale] = {
      messages: readJson(`${root}/${COPY}/messages/${locale}.json`, {}),
      review: readJson(`${root}/${COPY}/messages/review.${locale}.json`, {}),
    };
  const live = languages(readFileSync(`${root}/packages/config/src/languages.ts`, "utf8"))
    .filter((l) => l.status === "live")
    .map((l) => l.code);
  const written = port(tables, existing, live);
  for (const [path, body] of Object.entries(written))
    writeFileSync(`${root}/${path}`, `${JSON.stringify(body, null, 2)}\n`);
  execFileSync("bunx", ["biome", "format", "--write", ...Object.keys(written)], {
    cwd: root,
    stdio: "ignore",
  });
  process.stdout.write(`copy-to-messages: wrote ${Object.keys(written).join(", ")}\n`);
  return 0;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
