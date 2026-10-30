import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkWorkspaceDiagram, diagramEdges, workspaceEdges } from "./workspace.ts";

const MONOREPO = readFileSync(
  new URL("../content/docs/architecture/monorepo.md", import.meta.url),
  "utf8",
);

describe("the Monorepo page's import diagram", () => {
  it("draws exactly the workspace's runtime dependencies", () => {
    expect(diagramEdges(MONOREPO)).toEqual(workspaceEdges());
  });
});

describe("workspaceEdges", () => {
  const edges = workspaceEdges();

  it("finds the app and package edges, by short name", () => {
    expect(edges).toContain("web --> api-client");
    expect(edges).toContain("api --> contracts");
  });

  it("never has contracts import anything of ours, nor a package import an app", () => {
    expect(edges.filter((e) => e.startsWith("contracts -->"))).toEqual([]);
    const apps = ["api", "web", "site", "docs", "cli"];
    for (const edge of edges) expect(apps, edge).not.toContain(edge.split(" --> ")[1]);
  });
});

describe("diagramEdges", () => {
  it("reads only mermaid blocks, and turns an underscore id back into its dashed name", () => {
    const page =
      "a --> b\n\n```mermaid\nflowchart LR\n  lesson_kit --> ui\n  x -- label --> y\n```\n";
    expect(diagramEdges(page)).toEqual(["lesson-kit --> ui"]);
  });
});

describe("checkWorkspaceDiagram", () => {
  /** A workspace of two packages, `core` and `copy`, with `core`'s dependencies as given. */
  function workspace(coreDeps: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), "docs-workspace-"));
    mkdirSync(join(root, "apps"));
    for (const [name, dependencies] of [
      ["core", coreDeps],
      ["copy", {}],
    ] as const) {
      mkdirSync(join(root, "packages", name), { recursive: true });
      const manifest = { name: `@jadwigo/${name}`, dependencies };
      writeFileSync(join(root, "packages", name, "package.json"), JSON.stringify(manifest));
    }
    return root;
  }
  const page = (edges: string) => `\`\`\`mermaid\nflowchart LR\n${edges}\n\`\`\`\n`;

  it("passes the real page against the real workspace", () => {
    expect(checkWorkspaceDiagram(MONOREPO)).toEqual([]);
  });

  it("names an edge a package.json gained and the diagram lacks", () => {
    const root = workspace({ "@jadwigo/copy": "workspace:*" });
    try {
      expect(checkWorkspaceDiagram(page(""), root)).toEqual([
        "the Monorepo diagram lacks core --> copy",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("names an edge the diagram draws and no package.json has", () => {
    const root = workspace({});
    try {
      expect(checkWorkspaceDiagram(page("  core --> copy"), root)).toEqual([
        "the Monorepo diagram draws core --> copy, which no package.json has",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
