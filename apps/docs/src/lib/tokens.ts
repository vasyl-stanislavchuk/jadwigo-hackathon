import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/** Zeszyt's tokens sit at :root, and the night roles under DARK (lib/theme.ts sets it on <html>). */
const ROOT = ":root";
const DARK = "[theme='dark']";

/** A primitive: a literal colour, the only tier that holds one. */
interface Primitive {
  readonly name: string;
  readonly value: string;
}

/** A role, a scale step or an alias: what it is set to and what that comes to, by day and night. */
export interface Token {
  readonly name: string;
  readonly light: string;
  readonly dark: string;
  /** As written: `var(--jw-p-white)`, `1rem`. Dark is unset when the night block keeps the day's. */
  readonly lightAs: string;
  readonly darkAs: string;
}

/** foundation.css in the 3 tiers it is built from, plus the type, shape, space and motion steps. */
export interface Foundation {
  readonly primitives: readonly Primitive[];
  readonly roles: readonly Token[];
  readonly scales: readonly Token[];
  readonly aliases: readonly Token[];
}

/** One custom property as a stylesheet sets it: the rule it is in, its value and its comment. */
export interface Declaration {
  readonly name: string;
  readonly value: string;
  /** The rule's selector inside its at-rules, outermost first: `@media (height < 45rem)`, `.x`. */
  readonly scope: readonly string[];
  /** The comment after the declaration on its line, if any: `56px — every tappable control`. */
  readonly note: string;
}

const oneLine = (text: string): string => text.replace(/\s+/g, " ").trim();

/** A value as packages/ui's foundation.test.ts reads it: on one line, quotes single. */
const cssValue = (text: string): string =>
  oneLine(text)
    .replace(/"/g, "'")
    .replace(/\(\s+/g, "(")
    .replace(/,?\s+\)/g, ")");

/**
 * Every custom property a stylesheet sets, in order, in any rule or at-rule. Comments and strings
 * are skipped, so a brace or a semicolon inside one is not read as CSS.
 */
export function declarations(css: string): Declaration[] {
  const out: { name: string; value: string; scope: string[]; note: string }[] = [];
  const scope: string[] = [];
  let text = "";
  /** Where the last declaration ended, so a comment on the same line becomes its note. */
  let ended = -1;
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i] ?? "";
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const close = end === -1 ? css.length : end;
      const last = out.at(-1);
      if (last && ended >= 0 && !css.slice(ended, i).includes("\n"))
        last.note = oneLine(css.slice(i + 2, close));
      i = close + 1;
    } else if (ch === '"' || ch === "'") {
      const end = css.indexOf(ch, i + 1);
      const close = end === -1 ? css.length - 1 : end;
      text += css.slice(i, close + 1);
      i = close;
    } else if (ch === "{") {
      scope.push(oneLine(text));
      text = "";
    } else if (ch === "}") {
      scope.pop();
      text = "";
    } else if (ch === ";") {
      const match = /^\s*--([\w-]+)\s*:([\s\S]*)$/.exec(text);
      if (match && scope.length > 0)
        out.push({
          name: match[1] ?? "",
          value: cssValue(match[2] ?? ""),
          scope: [...scope],
          note: "",
        });
      ended = match ? i + 1 : -1;
      text = "";
    } else text += ch;
  }
  return out;
}

/** A selector list split at its top-level commas, not those inside :is() or :not(). */
function selectorList(list: string): string[] {
  const out = [""];
  let depth = 0;
  for (const ch of list.replace(/"/g, "'")) {
    depth += ch === "(" ? 1 : ch === ")" ? -1 : 0;
    if (ch === "," && depth === 0) out.push("");
    else out[out.length - 1] += ch;
  }
  return out.map((x) => x.trim());
}

/**
 * Every custom property in the top-level rules whose selector list holds `selector`, in order. A
 * rule inside an at-rule (a phone's sizes in @media) is skipped.
 */
function declared(decls: readonly Declaration[], selector: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const d of decls) {
    const [rule = "", ...nested] = d.scope;
    if (nested.length === 0 && selectorList(rule).includes(selector)) out.set(d.name, d.value);
  }
  return out;
}

/** `name`'s value with every var() replaced by what it comes to. A missing name or a loop throws. */
function resolve(vars: Map<string, string>, name: string, seen: readonly string[] = []): string {
  const value = vars.get(name);
  if (value === undefined) throw new Error(`--${name} is not set`);
  if (seen.includes(name)) throw new Error(`--${name} loops: ${[...seen, name].join(" → ")}`);
  return value.replace(/var\(--([\w-]+)\)/g, (_, ref: string) =>
    resolve(vars, ref, [...seen, name]),
  );
}

/** foundation.css's text, split into its tiers with every value resolved in light and dark. */
export function parseFoundation(text: string): Foundation {
  const decls = declarations(text);
  const light = declared(decls, ROOT);
  const night = declared(decls, DARK);
  const dark = new Map([...light, ...night]);
  const token = (name: string): Token => ({
    name,
    light: resolve(light, name),
    dark: resolve(dark, name),
    lightAs: light.get(name) ?? "",
    darkAs: night.get(name) ?? "",
  });
  const names = [...light.keys()];
  const isPrimitive = (name: string) => name.startsWith("jw-p-");
  const isRole = (name: string) => !isPrimitive(name) && name.startsWith("jw-");
  return {
    primitives: names.filter(isPrimitive).map((name) => ({ name, value: light.get(name) ?? "" })),
    // A role is set from a primitive and again for dark; the rest of --jw-* are the scale steps.
    roles: names.filter((n) => isRole(n) && night.has(n)).map(token),
    scales: names.filter((n) => isRole(n) && !night.has(n)).map(token),
    aliases: names.filter((n) => !n.startsWith("jw-")).map(token),
  };
}

/** True for a value a swatch can show: a hex colour. */
export const isColour = (value: string): boolean => /^#[0-9a-f]{3,8}$/i.test(value);

/** A token outside Zeszyt's tiers: its value by day and night, and what its comment says it is for. */
export interface Row {
  readonly name: string;
  readonly light: string;
  /** The same as light when the night block keeps the day's value. */
  readonly dark: string;
  readonly note: string;
}

/**
 * tokens.css's :root tokens by what they are for. A name no group claims is on no table, and
 * tokens.test.ts fails until one does.
 */
const EXTRA_GROUPS = {
  type: /^(text|font|leading|tracking)-/,
  layout: /^(radius-full|sidebar-width|page-prose-max|ease-out)$/,
  maths: /^tex-/,
  money: /^money-/,
  terminal: /^code-/,
} as const;

export type ExtraGroup = keyof typeof EXTRA_GROUPS;

/** The light and dark rows of a sheet's :root tokens whose names `claims` takes. */
function rows(decls: readonly Declaration[], claims: RegExp): Row[] {
  const light = declared(decls, ROOT);
  const night = declared(decls, DARK);
  const notes = new Map(decls.filter((d) => d.note !== "").map((d) => [d.name, d.note]));
  return [...light]
    .filter(([name]) => claims.test(name))
    .map(([name, value]) => ({
      name,
      light: value,
      dark: night.get(name) ?? value,
      note: notes.get(name) ?? "",
    }));
}

/** tokens.css in its groups: Tailwind's type steps, the layout sizes and the 3 palettes. */
export function parseExtras(text: string): Record<ExtraGroup, Row[]> {
  const decls = declarations(text);
  const groups = Object.entries(EXTRA_GROUPS).map(([group, claims]) => [
    group,
    rows(decls, claims),
  ]);
  return Object.fromEntries(groups) as Record<ExtraGroup, Row[]>;
}

/** kids.css's :root tokens: the minimum sizes every lesson block meets, everywhere in the app. */
const parseKids = (text: string): Row[] => rows(declarations(text), /^kid-/);

/** A token the lesson frame sets, with every rule that sets it. */
export interface Scoped {
  readonly name: string;
  readonly note: string;
  readonly set: readonly { readonly on: string; readonly value: string }[];
}

/** stage.css's tokens, each with every rule that sets it: the frame, one frame shape or a part. */
export function parseStage(text: string): Scoped[] {
  const byName = new Map<string, { note: string; set: { on: string; value: string }[] }>();
  for (const d of declarations(text)) {
    const entry = byName.get(d.name) ?? { note: "", set: [] };
    entry.note ||= d.note;
    entry.set.push({ on: d.scope.join(" "), value: d.value });
    byName.set(d.name, entry);
  }
  return [...byName].map(([name, entry]) => ({ name, ...entry }));
}

/** The utility prefix each Tailwind theme namespace makes, longest namespace first. */
const UTILITIES: readonly (readonly [namespace: string, utility: string])[] = [
  ["transition-duration-", "duration-"],
  ["spacing-", "min-h-"],
  ["leading-", "leading-"],
  ["shadow-", "shadow-"],
  ["radius-", "rounded-"],
  ["color-", "bg-"],
  ["text-", "text-"],
  ["ease-", "ease-"],
];

/** One name tailwind.css's @theme gives a token: the utility, the theme variable, what it reads. */
export interface Utility {
  readonly name: string;
  /** One utility the name makes: `bg-jw-act` (a colour also makes text-, border- and the rest). */
  readonly utility: string;
  readonly reads: string;
}

/** tailwind.css's @theme names. One in a namespace UTILITIES lacks is on no table. */
export function parseTheme(text: string): Utility[] {
  return declarations(text)
    .filter((d) => d.scope.length === 1 && d.scope[0]?.startsWith("@theme"))
    .flatMap((d) => {
      const known = UTILITIES.find(([namespace]) => d.name.startsWith(namespace));
      if (!known) return [];
      const [namespace, utility] = known;
      return [{ name: d.name, utility: utility + d.name.slice(namespace.length), reads: d.value }];
    });
}

/**
 * Every stylesheet in packages/ui/src/styles, all of which tailwind.css loads into the app, and
 * what it holds. A new file fails tokens.test.ts until it is named here and the page shows it.
 */
export const SHEETS: Readonly<Record<string, string>> = {
  "foundation.css":
    "Zeszyt: the primitives, roles and aliases in light and dark, and the type, shape, space and motion steps",
  "tokens.css":
    "Tailwind's type steps, a few layout sizes, and the maths, money and terminal card palettes",
  "kids.css": "the minimum sizes every lesson block meets",
  "stage.css": "the lesson frame's sizes, set per frame shape and per part",
  "tailwind.css": "the Tailwind utility names, each reading one token",
  "lesson.css": "the lesson's ground and corners: it reads tokens and sets none",
};

/**
 * Custom properties a rule sets for its own part and reads only there: not tokens a part may read,
 * so not on the page. Each says what it is.
 */
export const INTERNAL: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "foundation.css": {
    // stage.css sets the band's colours on the frame, and the page shows them there; foundation.css
    // only refines them for the solution's band and a miss's.
    "band-bg": "the verdict band's ground, refined per band",
    "band-ink": "the verdict band's text, refined per band",
    "band-line": "the verdict band's top line, refined per band",
    "jw-edge": "the edge a lesson option stands on, which follows its tone",
    "jw-ring-out": "how far a lesson control's focus ring sits outside it",
    "tw-ring-color": "Tailwind's ring colour, turned off on a picked option",
  },
};

/** The folder that holds every stylesheet, found through the one file packages/ui exports to us. */
function stylesDir(): string {
  const require = createRequire(import.meta.url);
  return dirname(require.resolve("@jadwigo/ui/foundation.css"));
}

/** A stylesheet's text, by its file name in packages/ui/src/styles. */
export const readSheet = (file: string): string => readFileSync(join(stylesDir(), file), "utf8");

/** The .css files in packages/ui/src/styles as they are now. */
export const stylesheets = (): string[] =>
  readdirSync(stylesDir())
    .filter((file) => file.endsWith(".css"))
    .sort();

/** The tokens of `@jadwigo/ui/foundation.css` as it is now, read when the docs are built. */
export const foundation = (): Foundation => parseFoundation(readSheet("foundation.css"));
export const extras = (): Record<ExtraGroup, Row[]> => parseExtras(readSheet("tokens.css"));
export const kids = (): Row[] => parseKids(readSheet("kids.css"));
export const stage = (): Scoped[] => parseStage(readSheet("stage.css"));
export const theme = (): Utility[] => parseTheme(readSheet("tailwind.css"));

/** Every name the Tokens page shows, by the stylesheet that sets it. */
export function shown(): Record<string, Set<string>> {
  const tiers = foundation();
  const names = (list: readonly { name: string }[]) => new Set(list.map((t) => t.name));
  return {
    "foundation.css": names([
      ...tiers.primitives,
      ...tiers.roles,
      ...tiers.aliases,
      ...tiers.scales,
    ]),
    "tokens.css": names(Object.values(extras()).flat()),
    "kids.css": names(kids()),
    "stage.css": names(stage()),
    "tailwind.css": names(theme()),
    "lesson.css": new Set(),
  };
}
