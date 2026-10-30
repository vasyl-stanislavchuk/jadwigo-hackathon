import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { operationHref, unknownApiLinks, unknownApiPaths } from "./lib/guides.ts";

const content = fileURLToPath(new URL("./content/docs/", import.meta.url));
const pages = readdirSync(content, { recursive: true, encoding: "utf8" })
  .filter((path) => /\.mdx?$/.test(path))
  .map((path) => [path, readFileSync(join(content, path), "utf8")] as const);

describe("the pages", () => {
  it("are found", () => {
    expect(pages.map(([path]) => path)).toContain(join("guides", "first-call.md"));
  });

  it.each(pages)("%s names only API paths that are in ROUTES", (_path, text) => {
    expect(unknownApiPaths(text)).toEqual([]);
  });

  it.each(pages)("%s links only to API reference pages that are built", (_path, text) => {
    expect(unknownApiLinks(text)).toEqual([]);
  });
});

describe("unknownApiPaths", () => {
  it("names a path that is not a route", () => {
    expect(unknownApiPaths("curl https://app.jadwigo.pl/api/v1/nope")).toEqual(["/api/v1/nope"]);
  });

  it("matches a written parameter to a route's", () => {
    expect(unknownApiPaths("`/api/v1/attempts/$ATTEMPT_ID/answers`.")).toEqual([]);
    expect(unknownApiPaths("`/api/v1/attempts/{id}/nope`")).toEqual(["/api/v1/attempts/{id}/nope"]);
  });

  it("lets a version prefix and a docs link pass", () => {
    expect(unknownApiPaths("under `/api/v1/`, see [it](/api/operations/getme/)")).toEqual([]);
  });

  it("reads a hero action's link as a docs link", () => {
    expect(unknownApiPaths("actions:\n    - text: API reference\n      link: /api/\n")).toEqual([]);
    expect(unknownApiLinks("      link: /api/operations/nope/")).toEqual(["/api/operations/nope/"]);
  });
});

describe("unknownApiLinks", () => {
  it("names a link to an operation page that is not built", () => {
    expect(unknownApiLinks("[x](/api/operations/nope/)")).toEqual(["/api/operations/nope/"]);
    expect(unknownApiLinks(`[x](${operationHref("startAttempt")})`)).toEqual([]);
  });

  it("knows every route's page", () => {
    const text = Object.keys(ROUTES)
      .map((name) => `[${name}](${operationHref(name)})`)
      .join("\n");
    expect(unknownApiLinks(text)).toEqual([]);
  });
});
