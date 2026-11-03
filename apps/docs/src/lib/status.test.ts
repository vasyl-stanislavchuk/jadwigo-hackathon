import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STATUS_LABEL, STATUSES, statusProblems } from "./status.ts";

const PAGES = join(import.meta.dirname, "../content/docs");

/** Every feature and vision page on disk, as [path, text]. */
const labelled = ["features", "vision"].flatMap((section) =>
  readdirSync(join(PAGES, section), { recursive: true, encoding: "utf8" })
    .filter((path) => /\.mdx?$/.test(path))
    .map(
      (path) => [join(section, path), readFileSync(join(PAGES, section, path), "utf8")] as const,
    ),
);

describe("every feature and vision page", () => {
  it("is found, features and vision both", () => {
    expect(labelled.some(([path]) => path.startsWith("features"))).toBe(true);
    expect(labelled.some(([path]) => path.startsWith("vision"))).toBe(true);
  });

  it.each(labelled)("%s carries status, as_of and prs", (_path, text) => {
    expect(statusProblems(text)).toEqual([]);
  });
});

describe("statusProblems", () => {
  const good = [
    "---",
    "title: A feature",
    "status: live",
    "as_of: 2026-11-03",
    "prs: [737, 775]",
    "---",
    "",
    "This page is for a judge.",
    "",
  ].join("\n");

  it("passes a page with all 3 fields, an empty prs list included", () => {
    expect(statusProblems(good)).toEqual([]);
    expect(statusProblems(good.replace("prs: [737, 775]", "prs: []"))).toEqual([]);
    expect(statusProblems(good.replace("status: live", "status: vision"))).toEqual([]);
  });

  it("fails a page missing any one of the 3 fields", () => {
    expect(statusProblems(good.replace("status: live\n", ""))).toEqual(["has no status"]);
    expect(statusProblems(good.replace("as_of: 2026-11-03\n", ""))).toEqual(["has no as_of"]);
    expect(statusProblems(good.replace("prs: [737, 775]\n", ""))).toEqual(["has no prs"]);
  });

  it("fails a status outside the 3, a date that is not one, and prs that are not numbers", () => {
    expect(statusProblems(good.replace("status: live", "status: shipped"))).toEqual([
      'status is "shipped", not one of live, main, vision',
    ]);
    expect(statusProblems(good.replace("as_of: 2026-11-03", "as_of: soon"))).toEqual([
      'as_of is "soon", not a date written 2026-11-03',
    ]);
    expect(statusProblems(good.replace("prs: [737, 775]", "prs: the big one"))).toEqual([
      'prs is "the big one", not a list of pull request numbers like [737, 775]',
    ]);
  });

  it("fails a page with no frontmatter at all", () => {
    expect(statusProblems("This page is for a judge.\n")).toEqual([
      "has no frontmatter, so no status, as_of or prs",
    ]);
  });
});

describe("STATUS_LABEL", () => {
  it("labels every status", () => {
    expect(Object.keys(STATUS_LABEL).sort()).toEqual([...STATUSES].sort());
  });
});
