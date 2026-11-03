import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { operationHref, unknownApiLinks, unknownApiPaths } from "./lib/guides.ts";

const content = fileURLToPath(new URL("./content/docs/", import.meta.url));
/**
 * Every page but the TypeScript client's under typescript/, which starlight-typedoc writes at build
 * time from the packages' doc comments, where `/api/v1` names the client's prefix (dl-5ssh.90.39).
 */
const pages = readdirSync(content, { recursive: true, encoding: "utf8" })
  .filter((path) => /\.mdx?$/.test(path) && !path.startsWith(join("typescript", "")))
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

  it("the chat page names the lesson card's real actions, and no save", () => {
    const chat = pages.find(([path]) => path.endsWith(join("features", "chat-and-workspace.md")));
    expect(chat).toBeDefined();
    expect(chat?.[1]).toContain("Daj lekcję");
    expect(chat?.[1]).toContain("Drukuj");
    expect(chat?.[1]).not.toContain("Zapisz na później\n(save");
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

  it("lets the remote MCP's path pass, outside ROUTES by design", () => {
    expect(unknownApiPaths("at `https://app.jadwigo.pl/api/mcp`")).toEqual([]);
    expect(unknownApiPaths("at `/api/mcp/nope`")).toEqual(["/api/mcp/nope"]);
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
