// @vitest-environment happy-dom
// A diagram's mermaid source is what the diagram-design skill redraws from (dl-5ssh.90.53.1),
// and its 2 SVGs are what a page shows. A source that does not parse, a missing SVG or a page
// naming a diagram that is not there would only show on the live page, so each fails here.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import mermaid from "mermaid";
import { describe, expect, it } from "vitest";
import { DIAGRAM_DIR, diagramNames, referencedDiagrams } from "./diagrams.ts";

const PAGES = join(import.meta.dirname, "../content/docs");
const names = diagramNames();

// The hand-written pages; typescript/ is written by starlight-typedoc at build time.
const pages = readdirSync(PAGES, { recursive: true, encoding: "utf8" })
  .filter((path) => /\.mdx?$/.test(path) && !path.startsWith(join("typescript", "")))
  .map((path) => [path, readFileSync(join(PAGES, path), "utf8")] as const);

describe("the docs' diagrams", () => {
  it("include the architecture ladder's, context down to components", () => {
    expect(names).toEqual(
      expect.arrayContaining([
        "context",
        "containers",
        "happy-path",
        "ai-engine",
        "runner-turn",
        "contracts",
        "monorepo",
        "pr-loop",
      ]),
    );
  });

  it.each(names)("%s.mmd parses", async (name) => {
    const source = readFileSync(join(DIAGRAM_DIR, `${name}.mmd`), "utf8");
    await expect(mermaid.parse(source)).resolves.toBeTruthy();
  });

  it.each(names)("%s has its light and dark SVGs, each an accessible figure", (name) => {
    for (const variant of ["light", "dark"] as const) {
      const path = join(DIAGRAM_DIR, `${name}.${variant}.svg`);
      expect(existsSync(path), path).toBe(true);
      const svg = readFileSync(path, "utf8");
      expect(svg, path).toContain('role="img"');
      expect(svg, path).toContain(`id="${name}-${variant}-title"`);
      expect(svg, path).toContain(`id="${name}-${variant}-desc"`);
      // The profile's font source is system: no diagram asks a reader's browser for a font.
      expect(svg, path).not.toContain("fonts.googleapis.com");
    }
  });

  it("leaves no mermaid block on a page: the .mmd files are the one source", () => {
    const fenced = pages.filter(([, text]) => text.includes("```mermaid")).map(([p]) => p);
    expect(fenced).toEqual([]);
  });

  it.each(pages)("%s embeds only diagrams that are there", (_path, text) => {
    for (const name of referencedDiagrams(text)) expect(names, name).toContain(name);
  });
});

describe("referencedDiagrams", () => {
  it("reads each <Diagram> name in order, and nothing else", () => {
    const page =
      '<Diagram name="containers" />\n\n<Other name="no" />\n<Diagram name="monorepo" />';
    expect(referencedDiagrams(page)).toEqual(["containers", "monorepo"]);
    expect(referencedDiagrams("no diagrams here")).toEqual([]);
  });
});
