// packages/copy's messages are whole in every language that is served, and no unreviewed line
// reaches a family (dl-5ssh.34.22, docs/research/i18n.md sections 7 and 11 in david-learns). It
// fails when:
// - a live language misses a key another language has;
// - a plural message misses a CLDR form of its language (Polish needs one, few, many and other);
// - a key has no flag in its language's review sidecar, messages/review.<locale>.json;
// - a live language has an unreviewed line that messages/baseline.<locale>.json does not hold with
//   the same text. Everything in a live language's file is in its prod build, so this is the prod
//   gate. The baseline holds the lines that were unreviewed when the tables moved here, by the
//   owner's call of 2026-11-01; a line leaves it once it is reviewed, and a stale entry fails too.
// The statuses come from packages/config/src/languages.ts, read as text: tools imports nothing of ours.
// Run: bun tools/src/check-copy.ts
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { languages } from "./check-languages.ts";
import {
  flagOf,
  linesOf,
  type Messages,
  pluralForms,
  type Review,
  type VariantMessage,
} from "./copy-to-messages.ts";

export type Baseline = Record<string, string | Record<string, string>>;
export interface LocaleFiles {
  code: string;
  status: string;
  messages: Messages;
  review: Review;
  baseline: Baseline;
}

const keysOf = (messages: Messages) => Object.keys(messages).filter((k) => k !== "$schema");

/** The plural forms a message misses, as `key [variant]` lines. */
function missingForms(locale: string, key: string, message: unknown): string[] {
  if (!Array.isArray(message)) return [];
  const forms = pluralForms(locale);
  const problems: string[] = [];
  for (const variant of message as VariantMessage[]) {
    const plural = new Set(
      (variant.declarations ?? []).flatMap((d) => {
        const name = /^local (\w+) = \w+: plural$/.exec(d)?.[1];
        return name ? [name] : [];
      }),
    );
    if (plural.size === 0) continue;
    // Variants that agree on every other selector, and pick a form for the same plural selectors,
    // must between them pick every combination of forms.
    const groups = new Map<string, { slots: string[]; seen: Set<string> }>();
    for (const at of Object.keys(variant.match ?? {})) {
      const pairs = at.split(", ").map((pair) => pair.split("=") as [string, string]);
      const slots = pairs.filter(([s, v]) => plural.has(s) && v !== "*").map(([s]) => s);
      if (slots.length === 0) continue;
      const rest = pairs.filter(([s]) => !slots.includes(s)).map((p) => p.join("="));
      const id = `${rest.join(", ")} | ${slots.join(",")}`;
      const group = groups.get(id) ?? { slots, seen: new Set<string>() };
      group.seen.add(
        pairs
          .filter(([s]) => slots.includes(s))
          .map((p) => p.join("="))
          .join(", "),
      );
      groups.set(id, group);
    }
    for (const [id, { slots, seen }] of groups) {
      let want: string[] = [""];
      for (const slot of slots)
        want = want.flatMap((w) => forms.map((f) => `${w ? `${w}, ` : ""}${slot}=${f}`));
      const context = id.split(" | ")[0];
      for (const pick of want.filter((w) => !seen.has(w)))
        problems.push(
          `${locale}.${key} has no variant for ${pick}${context ? ` (${context})` : ""}`,
        );
    }
  }
  return problems;
}

/** Every problem with the messages; an empty list passes. */
export function checkCopy(locales: readonly LocaleFiles[]): string[] {
  const problems: string[] = [];
  if (locales.length === 0) problems.push("no languages found in packages/config/src/languages.ts");
  const every = new Set(locales.flatMap((l) => keysOf(l.messages)));
  for (const { code, status, messages, review, baseline } of locales) {
    const live = status === "live";
    if (live)
      for (const key of every)
        if (!(key in messages)) problems.push(`${code} is live and misses ${key}`);
    for (const key of keysOf(messages)) {
      problems.push(...missingForms(code, key, messages[key]));
      if (!(key in review))
        problems.push(`${code}.${key} has no flag in messages/review.${code}.json`);
    }
    if (!live) continue;
    const open = new Set<string>();
    for (const key of keysOf(messages))
      for (const { match, text } of linesOf(messages[key])) {
        if (flagOf(review[key], match)) continue;
        const name = match ? `${key} [${match}]` : key;
        open.add(`${name}\u0000${text}`);
        const held = baseline[key];
        const was = typeof held === "string" ? (match ? undefined : held) : held?.[match];
        if (was !== text)
          problems.push(
            `${code}.${name} is unreviewed and a prod build would ship it: review it and set its flag in messages/review.${code}.json`,
          );
      }
    for (const [key, held] of Object.entries(baseline))
      for (const [match, text] of typeof held === "string" ? [["", held]] : Object.entries(held)) {
        const name = match ? `${key} [${match}]` : key;
        if (!open.has(`${name}\u0000${text}`))
          problems.push(
            `${code}.${name} is in messages/baseline.${code}.json but is reviewed, changed or gone: drop it there`,
          );
      }
  }
  return problems;
}

/** The repo's files for every language languages.ts lists. */
export function readLocales(root: string): LocaleFiles[] {
  const read = <T>(path: string, fallback: T): T =>
    existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback;
  const dir = `${root}/packages/copy/messages`;
  return languages(readFileSync(`${root}/packages/config/src/languages.ts`, "utf8")).map(
    ({ code, status }) => ({
      code,
      status,
      messages: read(`${dir}/${code}.json`, {}),
      review: read(`${dir}/review.${code}.json`, {}),
      baseline: read(`${dir}/baseline.${code}.json`, {}),
    }),
  );
}

if (import.meta.main) {
  const problems = checkCopy(readLocales(resolve(import.meta.dirname, "../..")));
  for (const p of problems) console.error(`copy: ${p}`);
  if (problems.length > 0) {
    console.error(
      "copy: fix packages/copy/messages, then run: bun run --cwd packages/copy messages",
    );
    process.exit(1);
  }
}
