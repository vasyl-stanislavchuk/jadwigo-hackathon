import { describe, expect, it } from "vitest";
import { foundation, isColour, parseFoundation } from "./tokens.ts";

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
