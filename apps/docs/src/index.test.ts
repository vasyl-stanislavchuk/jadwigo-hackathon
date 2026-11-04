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
  it("reads judges first, then the developer sections, every slug once", () => {
    expect(SIDEBAR.map((group) => group.label)).toEqual([
      "Start",
      "Features",
      "How it is built",
      "Vision",
      "Experiments",
      "API guides",
      "Use with agents",
      "API reference",
      "TypeScript client",
      "Design system",
    ]);
    const slugs = SIDEBAR.flatMap((group) => group.items);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("becomes Starlight's sidebar option group for group", () => {
    expect(sidebar.map((group) => group.label)).toEqual(SIDEBAR.map((group) => group.label));
    expect(sidebar[0]?.items[0]).toEqual({ slug: "index" });
  });

  it("lists the 8 features, the vision pages and the 7 experiments a judge walks", () => {
    const byLabel = (label: string) => SIDEBAR.find((group) => group.label === label)?.items;
    expect(byLabel("Features")).toHaveLength(8);
    expect(byLabel("Features")?.every((slug) => slug.startsWith("features/"))).toBe(true);
    expect(byLabel("Vision")).toHaveLength(4);
    expect(byLabel("Start")).toEqual(["index", "what-is-real", "story"]);
    expect(byLabel("Experiments")).toEqual([
      "experiments",
      "experiments/e1",
      "experiments/e2",
      "experiments/e3",
      "experiments/e4",
      "experiments/e5",
      "experiments/e6",
      "experiments/e7",
    ]);
    expect(byLabel("How it is built")).toEqual([
      "architecture",
      "architecture/monorepo",
      "architecture/contracts",
      "architecture/ai-engine",
      "architecture/building-with-agents",
    ]);
  });

  it("lists the MCP tool pages the build generates after the agents page and the MCP overview", () => {
    const agents = sidebar.find((group) => group.label === "Use with agents");
    expect(agents?.collapsed).toBe(true);
    expect(agents?.items).toEqual([
      { slug: "guides/agents" },
      { slug: "mcp" },
      { label: "MCP tools", items: [{ autogenerate: { directory: "mcp" } }] },
    ]);
  });

  it("opens the TypeScript client with its intro, before the groups starlight-typedoc fills", () => {
    expect(sidebar.find((group) => group.label === "TypeScript client")?.items).toEqual([
      { slug: "typescript" },
    ]);
  });
});
