import { describe, expect, it } from "vitest";
import { apiBase, SIDEBAR, servedHost, sidebar } from "./index.ts";

describe("servedHost", () => {
  it("is the docs host in prod", () => {
    expect(servedHost).toBe("docs.jadwigo.pl");
  });
});

describe("apiBase", () => {
  it("is the app's host, which serves the API", () => {
    expect(apiBase).toBe("https://app.jadwigo.pl");
  });
});

describe("SIDEBAR", () => {
  it("reads in the order a newcomer needs, every slug once", () => {
    expect(SIDEBAR.map((group) => group.label)).toEqual([
      "Start here",
      "Use with agents",
      "API reference",
      "Design system",
      "Architecture",
    ]);
    const slugs = SIDEBAR.flatMap((group) => group.items);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("becomes Starlight's sidebar option group for group", () => {
    expect(sidebar.map((group) => group.label)).toEqual(SIDEBAR.map((group) => group.label));
    expect(sidebar[0]?.items[0]).toEqual({ slug: "guides/introduction" });
  });

  it("lists the MCP tool pages the build generates after the agents page and the MCP overview", () => {
    expect(sidebar.find((group) => group.label === "Use with agents")?.items).toEqual([
      { slug: "guides/agents" },
      { slug: "mcp" },
      { label: "MCP tools", items: [{ autogenerate: { directory: "mcp" } }] },
    ]);
  });
});
