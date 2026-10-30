// @vitest-environment happy-dom
// The docs' theme (dl-5ssh.90.30): styles/theme.css maps Starlight onto Zeszyt's roles and holds no
// colour of its own, and styles/theme-bridge.ts puts Starlight's day or night where the roles read it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { foundation } from "./lib/tokens.ts";
import { THEME_BRIDGE } from "./styles/theme-bridge.ts";

const THEME = readFileSync(join(import.meta.dirname, "styles/theme.css"), "utf8");

const tiers = foundation();
const ROLES = new Map([...tiers.roles, ...tiers.scales].map((t) => [t.name, t]));

/** Each rule's selector and declarations, comments out. theme.css has no at-rules. */
function rules(css: string): { selector: string; decls: Map<string, string> }[] {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector = "", body = ""]) => ({
    selector: selector.trim().replace(/\s+/g, " "),
    decls: new Map(
      [...body.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map(([, k = "", v = ""]) => [k, v.trim()]),
    ),
  }));
}

/** A literal colour: a hex, or a colour function. color-mix() of roles and `transparent` is fine. */
function colourLiterals(css: string): string[] {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...bare.matchAll(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi)].map(
    (m) => m[0],
  );
}

/** Every --jw-* name the CSS reads that foundation.css does not set. */
function unknownRoles(css: string): string[] {
  return [...css.matchAll(/var\(--(jw-[\w-]+)\)/g)]
    .map((m) => m[1] ?? "")
    .filter((name) => !ROLES.has(name));
}

const ROOT = rules(THEME).find((r) => r.selector === ":root")?.decls ?? new Map<string, string>();

/** The role a value comes to: var(--jw-x) is x, var(--sl-y) is what :root maps y to. */
function role(value: string): string {
  const m = value.match(/^var\(--([\w-]+)\)$/);
  const name = m?.[1];
  if (name === undefined) throw new Error(`${value} is not one var()`);
  if (name.startsWith("jw-")) return name;
  const mapped = ROOT.get(`--${name}`);
  if (mapped === undefined) throw new Error(`--${name} is not mapped in theme.css`);
  return role(mapped);
}

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

// Text on a surface as Starlight pairs them (its style/*.css and components), once mapped here.
const STARLIGHT_PAIRS: [string, string][] = [
  ["--sl-color-white", "--sl-color-black"],
  ["--sl-color-text", "--sl-color-black"],
  ["--sl-color-gray-3", "--sl-color-black"],
  ["--sl-color-text-accent", "--sl-color-black"],
  ["--sl-color-text-invert", "--sl-color-bg-accent"],
  ["--sl-color-gray-2", "--sl-color-bg-sidebar"],
  ["--sl-color-white", "--sl-color-bg-nav"],
  // Inline code, and a link card or search result on hover.
  ["--sl-color-white", "--sl-color-bg-inline-code"],
  ["--sl-color-white", "--sl-color-gray-6"],
  // An aside's body and title, on its fill.
  ...["blue", "purple", "orange", "red"].flatMap((hue): [string, string][] => [
    ["--sl-color-white", `--sl-color-${hue}-low`],
    [`--sl-color-${hue}-high`, `--sl-color-${hue}-low`],
  ]),
  ...["default", "note", "tip", "caution", "danger", "success"].map((v): [string, string] => [
    `--sl-badge-${v}-text`,
    `--sl-badge-${v}-bg`,
  ]),
];

// Every rule that sets a text colour and a fill together.
const RULE_PAIRS: [string, string][] = rules(THEME).flatMap(({ selector, decls }) => {
  const fg = decls.get("color") ?? decls.get("--sl-color-text-badge");
  const bg = decls.get("background-color") ?? decls.get("--sl-color-bg-badge");
  return fg !== undefined && bg !== undefined ? [[`${selector}: ${fg}`, bg]] : [];
});

describe("theme.css", () => {
  it("holds no literal colour", () => {
    expect(colourLiterals(THEME)).toEqual([]);
  });

  it("reads only roles foundation.css sets", () => {
    expect(unknownRoles(THEME)).toEqual([]);
  });

  it("fails a planted hex or an unknown role", () => {
    expect(colourLiterals(`${THEME}\n.x { color: #fff; }`)).toEqual(["#fff"]);
    expect(colourLiterals(`${THEME}\n.x { color: hsl(0, 0%, 100%); }`)).toEqual(["hsl("]);
    expect(unknownRoles(`${THEME}\n.x { color: var(--jw-purple); }`)).toEqual(["jw-purple"]);
  });

  it("maps every Starlight colour onto one role, or none at all", () => {
    for (const [name, value] of ROOT) {
      if (!name.startsWith("--sl-color-") && !name.startsWith("--sl-badge-")) continue;
      if (name === "--sl-color-backdrop-overlay") continue;
      expect(value, name).toMatch(/^var\(--jw-[\w-]+\)$/);
    }
    expect(ROOT.get("--sl-font")).toBe("var(--jw-font)");
  });

  it("keeps green, the colour of right, off every aside", () => {
    for (const hue of ["blue", "purple", "orange", "red"])
      expect(role(ROOT.get(`--sl-color-${hue}-low`) ?? ""), hue).not.toMatch(/^jw-right/);
  });

  it("draws no blurred shadow", () => {
    for (const size of ["sm", "md", "lg"]) expect(ROOT.get(`--sl-shadow-${size}`)).toBe("none");
    for (const { decls } of rules(THEME)) {
      const shadow = decls.get("box-shadow");
      // A hard edge: x, y, then the colour, with no blur.
      if (shadow !== undefined && shadow !== "none") expect(shadow).toMatch(/^0 \S+ 0 var\(/);
    }
  });

  it.each([
    ...STARLIGHT_PAIRS.map(([fg, bg]): [string, string, string] => [
      `${fg} on ${bg}`,
      `var(${fg})`,
      `var(${bg})`,
    ]),
    ...RULE_PAIRS.map(([label, bg]): [string, string, string] => [
      `${label} on ${bg}`,
      label.slice(label.lastIndexOf(": ") + 2),
      bg,
    ]),
  ])("holds %s to 4.5:1 by day and night", (_, fg, bg) => {
    const text = ROLES.get(role(fg));
    const fill = ROLES.get(role(bg));
    expect(text).toBeDefined();
    expect(fill).toBeDefined();
    if (text === undefined || fill === undefined) return;
    expect(contrast(text.light, fill.light)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(text.dark, fill.dark)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("the theme bridge", () => {
  const root = document.documentElement;
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("copies Starlight's data-theme onto theme, at load and on every change", async () => {
    root.removeAttribute("theme");
    root.dataset["theme"] = "dark";
    new Function(THEME_BRIDGE)();
    expect(root.getAttribute("theme")).toBe("dark");

    root.dataset["theme"] = "light";
    await settle();
    expect(root.getAttribute("theme")).toBe("light");

    root.dataset["theme"] = "dark";
    await settle();
    expect(root.getAttribute("theme")).toBe("dark");
  });
});
