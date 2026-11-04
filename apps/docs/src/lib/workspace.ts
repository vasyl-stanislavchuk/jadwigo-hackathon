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

/** Every app's and package's short name in the workspace, with the folder it sits in. */
function workspaceMembers(root: string): Map<string, "apps" | "packages"> {
  const members = new Map<string, "apps" | "packages">();
  for (const dir of ["apps", "packages"] as const)
    for (const name of readdirSync(join(root, dir))) {
      const manifest = join(root, dir, name, "package.json");
      if (!existsSync(manifest)) continue;
      const pkg = JSON.parse(readFileSync(manifest, "utf8")) as { name: string };
      members.set(pkg.name.slice(SCOPE.length), dir);
    }
  return members;
}

/**
 * The layers of a diagram's mermaid source, top first: each `subgraph`'s member ids, read back as
 * names (`lesson_kit` is `lesson-kit`, as the source writes an id that holds a dash).
 */
export function diagramLayers(mermaid: string): string[][] {
  return [...mermaid.matchAll(/^\s*subgraph\b[^\n]*\n([\s\S]*?)^\s*end\s*$/gm)].map(
    ([, body = ""]) =>
      [...body.matchAll(/^\s*(\w+)/gm)].map(([, id = ""]) => id.replaceAll("_", "-")),
  );
}

/**
 * What keeps the Monorepo page's layered diagram (src/lib/diagrams/monorepo.mmd) from being true:
 * an app or package an import names that no layer holds, a layer member the workspace lacks, an
 * app below the top layer, an import that points up a layer, and any import out of the bottom one.
 * `check:dist` runs it in CI's docs-site job on every code change, because `turbo --affected` does
 * not select the docs test when only another package's package.json changes.
 */
export function checkWorkspaceDiagram(mermaid: string, root: string = ROOT): string[] {
  const layers = diagramLayers(mermaid);
  const layerOf = new Map(layers.flatMap((names, i) => names.map((name) => [name, i] as const)));
  const members = workspaceMembers(root);
  const bottom = layers.length - 1;
  const problems: string[] = [];
  for (const [name, layer] of layerOf) {
    if (!members.has(name))
      problems.push(`the Monorepo diagram draws ${name}, which is no app or package`);
    else if (members.get(name) === "apps" && layer !== 0)
      problems.push(`the Monorepo diagram draws the app ${name} below the top layer`);
  }
  for (const edge of workspaceEdges(root)) {
    const [from = "", to = ""] = edge.split(" --> ");
    const a = layerOf.get(from);
    const b = layerOf.get(to);
    for (const [name, layer] of [
      [from, a],
      [to, b],
    ] as const)
      if (layer === undefined)
        problems.push(`the Monorepo diagram lacks ${name}, which ${edge} needs`);
    if (a === undefined || b === undefined) continue;
    if (b < a) problems.push(`${edge} imports up a layer`);
    else if (a === bottom) problems.push(`${edge} imports out of the bottom layer`);
  }
  return [...new Set(problems)];
}
