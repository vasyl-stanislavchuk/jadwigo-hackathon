import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkWorkspaceDiagram, diagramLayers, workspaceEdges } from "./workspace.ts";

const MONOREPO = readFileSync(new URL("./diagrams/monorepo.mmd", import.meta.url), "utf8");

describe("the Monorepo page's layered diagram", () => {
  it("holds apps on top and contracts alone at the bottom", () => {
    const layers = diagramLayers(MONOREPO);
    expect(layers).toHaveLength(3);
    expect(layers[0]).toEqual(
      expect.arrayContaining(["api", "web", "runner", "converter", "print"]),
    );
    expect(layers[2]).toEqual(["contracts"]);
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

describe("diagramLayers", () => {
  it("reads each subgraph's members in order, an underscore id as its dashed name", () => {
    const source =
      'flowchart TB\n  subgraph a [Top]\n    web\n    lesson_kit["lesson-kit"]\n  end\n  subgraph b [Bottom]\n    contracts\n  end\n  a --> b\n';
    expect(diagramLayers(source)).toEqual([["web", "lesson-kit"], ["contracts"]]);
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
  /** A layered source: one subgraph per layer, top first. */
  const layered = (...layers: string[][]) =>
    `flowchart TB\n${layers.map((names, i) => `  subgraph l${i} [L${i}]\n${names.map((n) => `    ${n}\n`).join("")}  end\n`).join("")}`;
  const inWorkspace = (coreDeps: Record<string, string>, check: (root: string) => void) => {
    const root = workspace(coreDeps);
    try {
      check(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };

  it("passes the real page against the real workspace", () => {
    expect(checkWorkspaceDiagram(MONOREPO)).toEqual([]);
  });

  it("passes an import that points down a layer, or within one", () => {
    inWorkspace({ "@jadwigo/copy": "workspace:*" }, (root) => {
      expect(checkWorkspaceDiagram(layered(["core"], ["copy"]), root)).toEqual([]);
      expect(checkWorkspaceDiagram(layered(["core", "copy"], []), root)).toEqual([]);
    });
  });

  it("names an import that points up a layer", () => {
    inWorkspace({ "@jadwigo/copy": "workspace:*" }, (root) => {
      expect(checkWorkspaceDiagram(layered(["copy"], ["core"]), root)).toEqual([
        "core --> copy imports up a layer",
      ]);
    });
  });

  it("names an import out of the bottom layer", () => {
    inWorkspace({ "@jadwigo/copy": "workspace:*" }, (root) => {
      expect(checkWorkspaceDiagram(layered([], ["core", "copy"]), root)).toEqual([
        "core --> copy imports out of the bottom layer",
      ]);
    });
  });

  it("names a package an import needs that no layer holds", () => {
    inWorkspace({ "@jadwigo/copy": "workspace:*" }, (root) => {
      expect(checkWorkspaceDiagram(layered(["core"]), root)).toEqual([
        "the Monorepo diagram lacks copy, which core --> copy needs",
      ]);
    });
  });

  it("names a layer member the workspace does not have", () => {
    inWorkspace({}, (root) => {
      expect(checkWorkspaceDiagram(layered(["core", "gone"], ["copy"]), root)).toEqual([
        "the Monorepo diagram draws gone, which is no app or package",
      ]);
    });
  });
});
