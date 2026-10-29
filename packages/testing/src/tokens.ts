/**
 * The design-system check every frontend package runs (dl-uukj.32): colour and size come from
 * Zeszyt's tokens (packages/ui/src/styles) through their utilities, and are never written into a
 * component. Grown from packages/lesson-kit's tokens.test.ts, which banned a literal colour and a
 * pixel size; this one also bans a Tailwind palette class, an arbitrary rem size, a `${n}px`
 * template, a token read as var() inside a class, and the classes nothing backs (destructive,
 * animate-in). A caller passes its source root and the allowlist beside it. Each allowlist entry
 * is a violation still being removed, or one that stays with a reason; a stale entry fails too, so
 * the list only shrinks.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export interface TokenRule {
  readonly name: string;
  readonly pattern: RegExp;
  readonly fix: string;
}

const PALETTE =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white";
const COLOUR_PROPS =
  "bg|text|border|ring|fill|stroke|outline|decoration|divide|from|via|to|accent|caret|shadow|placeholder";

export const TOKEN_RULES: readonly TokenRule[] = [
  {
    name: "literal colour",
    pattern: /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl|oklch)a?\(|-\[(?:#|rgb|hsl)/i,
    fix: "read a colour role through its utility (bg-jw-act, text-kid-correct-ink)",
  },
  {
    name: "palette class",
    pattern: new RegExp(`\\b(?:${COLOUR_PROPS})-(?:${PALETTE})(?:-\\d{2,3})?(?![\\w-])`),
    fix: "Tailwind's palette has no meaning here: read a role (text-jw-ink, border-jw-line)",
  },
  {
    name: "pixel size",
    pattern: /\d+(?:\.\d+)?px\b/,
    fix: "read a size token (min-h-kid-tap, text-jw-body) or a rem from the type scale",
  },
  {
    name: "pixel template",
    pattern: /-\[[^\]]*\$\{[^}]*\}px\]/,
    fix: "a computed pixel count belongs in a CSS variable or a style the stylesheet reads, not in a class",
  },
  {
    name: "arbitrary size",
    pattern: /-\[\d+(?:\.\d+)?(?:rem|em|ch)\]/,
    fix: "a rem written by hand is a size with no token: use text-jw-*, size-kid-*, or add the token",
  },
  {
    name: "token read in a class",
    pattern: /\[(?:length:)?var\(--(?:jw|kid)-[\w-]+\)/,
    fix: "every --jw-* and --kid-* has a utility (tailwind.css @theme inline): write that name",
  },
  {
    name: "colour utility read as var()",
    pattern: /var\(--color-/,
    fix: "a --color-* is Tailwind's; write the utility, or read the role (var(--jw-ink)) in CSS",
  },
  {
    name: "nothing backs it",
    pattern:
      /\b(?:bg|text|border|ring)-destructive\b|\banimate-(?:in|out)\b|\b(?:fade|slide|zoom)-(?:in|out)(?:-[\w-]+)?\b/,
    fix: "no --color-destructive and no animation plugin exist: the class does nothing",
  },
];

export interface TokenViolation {
  /** Relative to the root the check ran on. */
  readonly path: string;
  readonly rule: string;
  readonly snippet: string;
}

export interface AllowEntry {
  readonly path: string;
  readonly snippet: string;
  /** Empty while the lane removes it; a reason when it stays (SVG units inside a viewBox). */
  readonly why: string;
}

export interface TokenReport {
  /** How many source files were read. */
  readonly checked: number;
  /** Violations the allowlist does not name. */
  readonly unlisted: readonly TokenViolation[];
  /** Allowlist entries whose violation is gone: remove them. */
  readonly stale: readonly AllowEntry[];
}

/** Comments may say "56 px"; only code is checked. */
export const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const isSource = (name: string): boolean =>
  /\.tsx?$/.test(name) && !/\.(?:test|int\.test|d)\.tsx?$/.test(name);

function sources(root: string, shallow: boolean): { path: string; source: string }[] {
  return readdirSync(root, { recursive: !shallow, withFileTypes: true })
    .filter((e) => e.isFile() && isSource(e.name) && !e.parentPath.includes("node_modules"))
    .map((e) => {
      const full = join(e.parentPath, e.name);
      return { path: relative(root, full), source: readFileSync(full, "utf8") };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Every distinct violation in one file: each rule's matches, once each. */
export function violationsIn(path: string, source: string): TokenViolation[] {
  const text = code(source);
  const out: TokenViolation[] = [];
  for (const rule of TOKEN_RULES) {
    const seen = new Set<string>();
    for (const m of text.matchAll(new RegExp(rule.pattern.source, `g${rule.pattern.flags}`))) {
      const snippet = m[0];
      if (seen.has(snippet)) continue;
      seen.add(snippet);
      out.push({ path, rule: rule.name, snippet });
    }
  }
  return out;
}

function readAllowlist(file: string): AllowEntry[] {
  if (!existsSync(file)) return [];
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${file}: an allowlist is a JSON array`);
  return parsed.map((e: unknown) => {
    if (typeof e !== "object" || e === null) throw new Error(`${file}: an entry is an object`);
    const { path, snippet, why } = e as Record<string, unknown>;
    if (typeof path !== "string" || typeof snippet !== "string" || typeof why !== "string")
      throw new Error(`${file}: an entry is {path, snippet, why}, each a string`);
    return { path, snippet, why };
  });
}

const key = (e: { path: string; snippet: string }): string => `${e.path}\u0000${e.snippet}`;

/**
 * Checks every .ts and .tsx under `root` (not tests, not .d.ts) against the rules, minus what
 * `allowFile` lists. `shallow` reads only the root's own files, for a directory whose
 * subdirectories have allowlists of their own.
 */
export function checkTokens(
  root: string,
  allowFile: string,
  { shallow = false }: { shallow?: boolean } = {},
): TokenReport {
  const files = sources(root, shallow);
  const found = files.flatMap((f) => violationsIn(f.path, f.source));
  const allowed = readAllowlist(allowFile);
  const allowedKeys = new Set(allowed.map(key));
  const foundKeys = new Set(found.map(key));
  return {
    checked: files.length,
    unlisted: found.filter((v) => !allowedKeys.has(key(v))),
    stale: allowed.filter((a) => !foundKeys.has(key(a))),
  };
}

/** The allowlist that would make `root` pass today: every violation, with no reason. */
export function allowlistFor(
  root: string,
  { shallow = false }: { shallow?: boolean } = {},
): AllowEntry[] {
  return sources(root, shallow)
    .flatMap((f) => violationsIn(f.path, f.source))
    .map(({ path, snippet }) => ({ path, snippet, why: "" }));
}
