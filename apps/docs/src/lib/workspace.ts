import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const SCOPE = "@jadwigo/";

/**
 * Every runtime import edge between the workspace's apps and packages, as `from --> to` by short
 * name (`web --> api-client`), sorted: each `@jadwigo/*` entry in a package.json's `dependencies`.
 * Dev dependencies, `testing` among them, are left out: they never ship.
 */
export function workspaceEdges(root: string = ROOT): string[] {
  const edges: string[] = [];
  for (const dir of ["apps", "packages"]) {
    for (const name of readdirSync(join(root, dir))) {
      const manifest = join(root, dir, name, "package.json");
      if (!existsSync(manifest)) continue;
      const pkg = JSON.parse(readFileSync(manifest, "utf8")) as {
        name: string;
        dependencies?: Record<string, string>;
      };
      for (const dep of Object.keys(pkg.dependencies ?? {}))
        if (dep.startsWith(SCOPE))
          edges.push(`${pkg.name.slice(SCOPE.length)} --> ${dep.slice(SCOPE.length)}`);
    }
  }
  return edges.sort();
}

/**
 * The `a --> b` edges of the mermaid blocks in a page, with each node id read back as its name:
 * `api_client` is `api-client`, as the page writes an id that holds a dash.
 */
export function diagramEdges(markdown: string): string[] {
  const blocks = [...markdown.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1] ?? "");
  return blocks
    .flatMap((block) => [...block.matchAll(/^\s*(\w+) --> (\w+)\s*$/gm)])
    .map(([, from = "", to = ""]) => `${from.replaceAll("_", "-")} --> ${to.replaceAll("_", "-")}`)
    .sort();
}
