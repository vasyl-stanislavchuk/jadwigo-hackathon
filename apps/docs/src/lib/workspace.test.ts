import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { diagramEdges, workspaceEdges } from "./workspace.ts";

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
