import { readFileSync } from "node:fs";
import type { StarlightExpressiveCodeOptions } from "@astrojs/starlight/expressive-code";
// Adds showLineNumbers to the block props' type.
import type {} from "@expressive-code/plugin-line-numbers";
import { autoSidebarSchema } from "starlight-auto-sidebar/schema";
import { describe, expect, it } from "vitest";

// Astro reads only ec.config.mjs, which tsc can't type, so the test loads it by URL.
const ecConfig: StarlightExpressiveCodeOptions = (
  await import(new URL("../ec.config.mjs", import.meta.url).href)
).default;

describe("ec.config.mjs", () => {
  it("adds collapsible sections and line numbers, numbers off unless a block asks", () => {
    expect(ecConfig.plugins?.map((plugin) => (plugin as { name: string }).name)).toEqual([
      "Collapsible sections",
      "Line numbers",
    ]);
    expect(ecConfig.defaultProps?.showLineNumbers).toBe(false);
  });
});

describe("mcp/_meta.yml", () => {
  it("is a valid starlight-auto-sidebar file that orders the MCP tools by name", () => {
    const text = readFileSync(new URL("content/docs/mcp/_meta.yml", import.meta.url), "utf8");
    const entries = text
      .split("\n")
      .filter((line) => line.trim() !== "" && !line.startsWith("#"))
      .map((line) => line.split(": "));
    expect(autoSidebarSchema().parse(Object.fromEntries(entries))).toEqual({
      collapsed: false,
      hidden: false,
      sort: "label",
    });
  });
});
