import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mcpTools, toolPage } from "./lib/mcp.ts";
import { MCP_OUTPUT } from "./lib/mcp-output.ts";

// Every page reads in one order (dl-5ssh.90.31, decision
// jadwigo-platform/notes/2026-10-30-docs-jadwigo-pl-wears-the-app-s-design-system-in-andika-day-and):
// it opens with a sentence on what it is for, explains before it lists, puts its tables last under
// "Every <thing>", and ends with a Next section of 1 to 3 links.

const content = fileURLToPath(new URL("./content/docs/", import.meta.url));

/** The hand-written pages, but not a splash page (the home and the 404), which has no body to order. */
const pages = readdirSync(content, { recursive: true, encoding: "utf8" })
  .filter((path) => /\.mdx?$/.test(path))
  .map((path) => [path, readFileSync(join(content, path), "utf8")] as const)
  .filter(([, text]) => !/^template:\s*splash$/m.test(text));

/** The tool pages the docs loader makes, from the snapshot the CLI keeps. */
const tools = mcpTools(
  JSON.parse(readFileSync(new URL("../../cli/mcp-tools.json", import.meta.url), "utf8")),
).map((tool) => [`mcp/${tool.name}`, toolPage(tool, MCP_OUTPUT[tool.name]).body] as const);

/** A component that draws a table the build generates. */
const TABLE_COMPONENT = /^<[A-Z]\w*Table\b/;

/** The page's last section is ## Next, with 1 to 3 links. */
function nextProblems(lines: readonly string[]): string[] {
  const problems: string[] = [];
  const h2s = lines.filter((line) => line.startsWith("## "));
  if (h2s.at(-1) !== "## Next") problems.push("does not end with a ## Next section");
  for (const old of ["## Read on", "## In this section"])
    if (h2s.includes(old)) problems.push(`has ${old}, which ## Next replaces`);
  if (h2s.at(-1) === "## Next") {
    const next = lines.slice(lines.lastIndexOf("## Next") + 1);
    const links = next.filter((line) => /^- \[.+\]\(.+\)/.test(line)).length;
    if (links < 1 || links > 3) problems.push(`## Next has ${links} links, not 1 to 3`);
  }
  return problems;
}

/**
 * Every way a page breaks the reading order, one line each; none when it keeps it. A tool page is
 * all reference, Inputs then Output, so it keeps only the opening and the Next section.
 */
function shapeProblems(text: string, { tablesLast = true } = {}): string[] {
  const problems: string[] = [];
  // The body, without its front matter, its imports and its code, whose lines are not the page's.
  const body = text
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/^```[\s\S]*?^```$/gm, "```")
    .split("\n")
    .filter((line) => !line.startsWith("import "));
  const lines = body.map((line) => line.trim()).filter((line) => line !== "");

  const first = lines[0] ?? "";
  if (/^(#|[-*|>:<]|\d+\.|```)/.test(first))
    problems.push(`opens with "${first}", not a sentence on what the page is for`);
  problems.push(...nextProblems(lines));
  if (!tablesLast) return problems;

  const firstEvery = lines.findIndex((line) => line.startsWith("## Every "));
  lines.forEach((line, i) => {
    const isTable = line.startsWith("|") || TABLE_COMPONENT.test(line);
    if (isTable && (firstEvery < 0 || i < firstEvery))
      problems.push(`has a table before its first "## Every" section: ${line.slice(0, 40)}`);
    if (firstEvery >= 0 && i > firstEvery && line.startsWith("## "))
      if (!line.startsWith("## Every ") && line !== "## Next")
        problems.push(`has ${line} after its tables`);
  });

  const lastTable = lines.findLastIndex((line) => TABLE_COMPONENT.test(line));
  if (lastTable >= 0 && !lines.slice(lastTable).some((line) => line.startsWith("<Generated ")))
    problems.push("has a generated table with no <Generated> after it");
  if (/when (the|these) docs are built/.test(body.join("\n")))
    problems.push("says how a table is generated in its text, not in <Generated>");
  return problems;
}

describe("every hand-written page", () => {
  it("is found", () => {
    expect(pages.map(([path]) => path)).toContain(join("guides", "first-call.md"));
  });

  it.each(pages)("%s keeps the reading order", (_path, text) => {
    expect(shapeProblems(text)).toEqual([]);
  });
});

describe("every MCP tool page", () => {
  it.each(tools)("%s opens with how it is called and ends with Next", (_path, text) => {
    expect(shapeProblems(text, { tablesLast: false })).toEqual([]);
  });
});

describe("shapeProblems", () => {
  const good = [
    "---",
    "title: A page",
    "---",
    "",
    'import Generated from "../components/Generated.astro";',
    "",
    "This page is for a reader.",
    "",
    "## How it works",
    "",
    "```text",
    "| not a table",
    "```",
    "",
    "## Every thing",
    "",
    "<ThingTable />",
    "",
    '<Generated from="the code" />',
    "",
    "## Next",
    "",
    "- [Errors](/guides/errors/): what a refusal looks like.",
    "",
  ].join("\n");

  it("passes a page in the reading order", () => {
    expect(shapeProblems(good)).toEqual([]);
  });

  it("fails a page without ## Next", () => {
    const planted = good.slice(0, good.indexOf("## Next"));
    expect(shapeProblems(planted)).toContain("does not end with a ## Next section");
  });

  it("fails a page that opens with a heading or a table", () => {
    expect(shapeProblems(good.replace("This page is for a reader.", "## Start"))[0]).toMatch(
      /^opens with "## Start"/,
    );
  });

  it("fails a table before its Every section, and a section after it", () => {
    const early = good.replace("## How it works", "| a | b |");
    expect(shapeProblems(early)).toContain(
      'has a table before its first "## Every" section: | a | b |',
    );
    const late = good.replace("## Next", "## More\n\n## Next");
    expect(shapeProblems(late)).toContain("has ## More after its tables");
  });

  it("fails a Next with no link or more than 3", () => {
    expect(shapeProblems(`${good}\n- [a](/a/)\n- [b](/b/)\n- [c](/c/)\n`)).toContain(
      "## Next has 4 links, not 1 to 3",
    );
  });

  it("fails a generated table with its note in the text", () => {
    const moved = good
      .replace('<Generated from="the code" />', "")
      .replace(
        "This page is for a reader.",
        "This page is for a reader, made when the docs are built.",
      );
    expect(shapeProblems(moved)).toEqual([
      "has a generated table with no <Generated> after it",
      "says how a table is generated in its text, not in <Generated>",
    ]);
  });
});
