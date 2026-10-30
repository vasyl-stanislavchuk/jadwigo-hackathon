import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

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

/**
 * The file as packages/ui's foundation.test.ts reads it: comments out, quotes single, and a rule
 * Biome wrapped onto several lines back on one.
 */
const flat = (text: string): string =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"/g, "'")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/,?\s+\)/g, ")");

/** Every top-level rule, selector and body. An at-rule (a phone's sizes in @media) is skipped. */
function topLevelRules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  let depth = 0;
  let head = "";
  let body = "";
  let skipping = false;
  for (const ch of css) {
    if (ch === "{") {
      depth += 1;
      if (depth === 1) skipping = head.trim().startsWith("@");
      else if (!skipping) body += ch;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        if (!skipping) out.push({ selector: head.trim(), body });
        head = "";
        body = "";
      } else if (!skipping) body += ch;
    } else if (depth === 0) head += ch;
    else if (!skipping) body += ch;
  }
  return out;
}

/** A selector list split at its top-level commas, not those inside :is() or :not(). */
function selectorList(list: string): string[] {
  const out = [""];
  let depth = 0;
  for (const ch of list) {
    depth += ch === "(" ? 1 : ch === ")" ? -1 : 0;
    if (ch === "," && depth === 0) out.push("");
    else out[out.length - 1] += ch;
  }
  return out.map((x) => x.trim());
}

/** Every custom property in the top-level rules whose selector list holds `selector`, in order. */
function declared(css: string, selector: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const rule of topLevelRules(css)) {
    if (!selectorList(rule.selector).includes(selector)) continue;
    for (const [, name = "", value = ""] of rule.body.matchAll(/--([\w-]+):\s*([^;]+);/g))
      out.set(name, value.trim());
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
  const css = flat(text);
  const light = declared(css, ROOT);
  const night = declared(css, DARK);
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

/** The tokens of `@jadwigo/ui/foundation.css` as it is now, read when the docs are built. */
export function foundation(): Foundation {
  const require = createRequire(import.meta.url);
  const path = require.resolve("@jadwigo/ui/foundation.css");
  return parseFoundation(readFileSync(path, "utf8"));
}
