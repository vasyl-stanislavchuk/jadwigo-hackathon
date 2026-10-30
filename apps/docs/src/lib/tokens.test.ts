import { describe, expect, it } from "vitest";
import {
  declarations,
  extras,
  foundation,
  INTERNAL,
  isColour,
  kids,
  parseExtras,
  parseFoundation,
  parseStage,
  parseTheme,
  readSheet,
  SHEETS,
  shown,
  stage,
  stylesheets,
  theme,
} from "./tokens.ts";

/**
 * Every custom property a stylesheet sets, read with a plain pattern rather than the page's parser,
 * so a token the parser misses is still counted.
 */
const setIn = (text: string): Set<string> =>
  new Set(
    [...text.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(?<![\w-])--([\w-]+)\s*:/g)].map(
      (m) => m[1] ?? "",
    ),
  );

// The owner asked that the page show the design system's actual state (dl-5ssh.90.36): every
// token in every stylesheet the app loads is on it, or is a part's own helper named in INTERNAL.
describe("the Tokens page against packages/ui/src/styles", () => {
  const page = shown();

  it("names every stylesheet, and no file that is gone", () => {
    expect(stylesheets()).toEqual(Object.keys(SHEETS).sort());
  });

  it.each(stylesheets())("shows every token %s sets", (file) => {
    const internal = INTERNAL[file] ?? {};
    const missing = [...setIn(readSheet(file))].filter(
      (name) => !page[file]?.has(name) && !(name in internal),
    );
    expect(missing, `on no table of the Tokens page: add a group, or INTERNAL with why`).toEqual(
      [],
    );
  });

  it("keeps INTERNAL to names the file still sets and the page does not show", () => {
    for (const [file, names] of Object.entries(INTERNAL)) {
      const set = setIn(readSheet(file));
      for (const name of Object.keys(names)) {
        expect(set.has(name), `--${name} in ${file}`).toBe(true);
        expect(page[file]?.has(name), `--${name} in ${file}`).toBe(false);
      }
    }
  });
});

describe("the other stylesheets", () => {
  it("finds tokens.css's groups, the terminal card the same in both themes", () => {
    const groups = extras();
    for (const rows of Object.values(groups)) expect(rows.length).toBeGreaterThan(0);
    for (const row of groups.terminal) expect(row.dark, `--${row.name}`).toBe(row.light);
    for (const row of [...groups.maths, ...groups.terminal])
      expect(isColour(row.light), `--${row.name}`).toBe(true);
    expect(groups.maths.some((row) => row.dark !== row.light)).toBe(true);
  });

  it("finds the kid minima at :root, each with its comment", () => {
    const rows = kids();
    expect(rows.length).toBeGreaterThanOrEqual(7);
    for (const row of rows) expect(row.note, `--${row.name}`).not.toBe("");
  });

  it("finds the lesson frame's sizes with every rule that sets them", () => {
    const topbar = stage().find((s) => s.name === "kid-topbar-height");
    expect(topbar?.set.length).toBeGreaterThan(1);
    expect(topbar?.set[0]).toEqual({ on: ":root", value: "4.5rem" });
  });

  it("maps every @theme name to a utility and the token it reads", () => {
    const utilities = theme();
    expect(utilities.length).toBeGreaterThanOrEqual(107);
    expect(utilities).toContainEqual({
      name: "color-jw-act",
      utility: "bg-jw-act",
      reads: "var(--jw-act)",
    });
  });
});

describe("declarations", () => {
  const css = `
    @import "tailwindcss";
    :root { --a: 1rem; /* the note */ --b: "x;y"; }
    /* a comment { with --c: 1; braces } */
    @media (height < 45rem) {
      .frame[data-x="y"] { --a: 2rem; }
    }
    .part {
      --d: calc(
        1rem +
        2rem
      );
      color: red;
    }
  `;

  it("reads each with its rule, its at-rules and the comment on its line", () => {
    expect(declarations(css)).toEqual([
      { name: "a", value: "1rem", scope: [":root"], note: "the note" },
      { name: "b", value: "'x;y'", scope: [":root"], note: "" },
      {
        name: "a",
        value: "2rem",
        scope: ["@media (height < 45rem)", '.frame[data-x="y"]'],
        note: "",
      },
      { name: "d", value: "calc(1rem + 2rem)", scope: [".part"], note: "" },
    ]);
  });

  it("groups a scoped token's rules under its name", () => {
    expect(parseStage(css).find((s) => s.name === "a")?.set).toEqual([
      { on: ":root", value: "1rem" },
      { on: '@media (height < 45rem) .frame[data-x="y"]', value: "2rem" },
    ]);
  });

  it("leaves a tokens.css name no group claims off every table", () => {
    const groups = parseExtras(":root { --tex-blue: #000; --planted: 1px; }");
    expect(
      Object.values(groups)
        .flat()
        .map((r) => r.name),
    ).toEqual(["tex-blue"]);
  });

  it("leaves an @theme name in an unknown namespace off the utility table", () => {
    const css = "@theme inline { --color-x: var(--x); --planted-x: var(--x); }";
    expect(parseTheme(css).map((u) => u.name)).toEqual(["color-x"]);
  });
});

describe("foundation", () => {
  const tiers = foundation();

  // Floors, not counts: a new token needs no docs edit, and a re-scoping that empties a tier fails
  // here. A deliberate token removal lowers its floor in the same PR.
  it("finds all 3 tiers, and the scale steps beside them", () => {
    expect(tiers.primitives.length).toBeGreaterThanOrEqual(60);
    expect(tiers.roles.length).toBeGreaterThanOrEqual(36);
    expect(tiers.aliases.length).toBeGreaterThanOrEqual(61);
    expect(tiers.scales.length).toBeGreaterThan(0);
  });

  it("keeps the literal colours among the primitives", () => {
    for (const p of tiers.primitives) expect(p.name).toMatch(/^jw-p-/);
    for (const p of tiers.primitives) expect(isColour(p.value), p.name).toBe(true);
  });

  it("resolves every role to a colour in both themes", () => {
    for (const role of tiers.roles) {
      expect(isColour(role.light), `--${role.name} by day: ${role.light}`).toBe(true);
      expect(isColour(role.dark), `--${role.name} by night: ${role.dark}`).toBe(true);
      expect(role.lightAs).toMatch(/^var\(--jw-p-/);
      expect(role.darkAs).toMatch(/^var\(--jw-p-/);
    }
  });

  it("resolves every alias and scale step to a value with no var() left", () => {
    for (const token of [...tiers.aliases, ...tiers.scales]) {
      expect(token.light, `--${token.name}`).not.toContain("var(");
      expect(token.dark, `--${token.name}`).not.toContain("var(");
    }
  });

  it("names a role, not a primitive, in every alias", () => {
    const aliases = tiers.aliases.filter((a) => a.lightAs.startsWith("var("));
    expect(aliases.length).toBeGreaterThan(0);
    for (const a of aliases) expect(a.lightAs, `--${a.name}`).toMatch(/^var\(--jw-(?!p-)/);
  });
});

describe("parseFoundation", () => {
  const css = `
    /* a comment { with braces } */
    :root, :host { --jw-p-blue: #0000ff; --jw-p-navy: #000080; }
    :root, :host, [theme="light"] { --jw-ink: var(--jw-p-blue); }
    [theme="dark"] { --jw-ink: var(--jw-p-navy); }
    :root, :host { --jw-space-1: 0.25rem; }
    @media (width < 37.5rem) { :root { --jw-space-1: 1rem; } }
    :root, :host, [theme], [data-lesson-theme] { --ring: var(--jw-ink); }
    [data-lesson-theme="zeszyt"] [data-slot="button"] { --jw-edge: red; }
    [theme="dark"] [data-lesson-theme="zeszyt"] { --jw-ink: var(--jw-p-blue); }
  `;
  const parsed = parseFoundation(css);

  it("splits the tiers and resolves light and dark", () => {
    expect(parsed.primitives.map((p) => p.name)).toEqual(["jw-p-blue", "jw-p-navy"]);
    expect(parsed.roles).toEqual([
      {
        name: "jw-ink",
        light: "#0000ff",
        dark: "#000080",
        lightAs: "var(--jw-p-blue)",
        darkAs: "var(--jw-p-navy)",
      },
    ]);
    expect(parsed.aliases.map((a) => [a.name, a.light, a.dark])).toEqual([
      ["ring", "#0000ff", "#000080"],
    ]);
  });

  it("keeps the laptop's value, not a phone's, and ignores a rule on a part or a nested theme", () => {
    expect(parsed.scales.map((s) => [s.name, s.light])).toEqual([["jw-space-1", "0.25rem"]]);
  });

  it("follows a renamed token into the table", () => {
    const renamed = parseFoundation(css.replaceAll("--jw-ink", "--jw-text"));
    expect(renamed.roles.map((r) => r.name)).toEqual(["jw-text"]);
  });

  it("refuses a role that names a token nobody sets", () => {
    expect(() => parseFoundation(":root { --jw-ink: var(--jw-p-gone); }")).toThrow(
      /--jw-p-gone is not set/,
    );
  });

  it("refuses a loop", () => {
    expect(() => parseFoundation(":root { --a: var(--b); --b: var(--a); }")).toThrow(/loops/);
  });
});
