import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * The docs' diagrams (dl-5ssh.90.53.1): each is a mermaid source the diagram-design skill
 * imports, in `src/lib/diagrams/<name>.mmd`, with its exported SVGs beside it as
 * `<name>.light.svg` and `<name>.dark.svg`. A page embeds one with `<Diagram name="<name>" />`
 * (src/components/Diagram.astro); `diagrams.test.ts` holds the set together.
 */

/** The folder every diagram's source and SVGs sit in. */
export const DIAGRAM_DIR = join(import.meta.dirname, "diagrams");

/** Every diagram's name: the `.mmd` files' stems, sorted. */
export function diagramNames(dir: string = DIAGRAM_DIR): string[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".mmd"))
    .map((file) => file.slice(0, -".mmd".length))
    .sort();
}

/** True when `name` is a diagram on disk, so a built page may embed it. */
export const isDiagramName = (name: string, dir: string = DIAGRAM_DIR): boolean =>
  diagramNames(dir).includes(name);

/** The names a page embeds, in order: each `<Diagram name="…" />` it carries. */
export function referencedDiagrams(markdown: string): string[] {
  return [...markdown.matchAll(/<Diagram\s+name="([^"]+)"/g)].map((m) => m[1] ?? "");
}
