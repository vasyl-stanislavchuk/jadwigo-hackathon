// What scripts/check-dist.ts asks of each page with its own `path` (dl-w0b4.64). Pure, so the unit
// test reads it without a build.
import { canonical } from "./seo.ts";

/** The frontmatter check-dist reads from a page's markdown source. */
export interface PathPageSource {
  path: string;
  heading: string;
  lang: "pl" | "en";
  reviewed: boolean;
}

/** A file under dist/ and the text it must, or must not, carry. */
export type DistCheck = readonly [file: string, text: string];

/** The address a parent writes to, before the owner named it. No uploaded page may still carry it. */
export const contactPlaceholder = "CONTACT_EMAIL_TBD";

/** Reads the fields check-dist needs from a page's frontmatter, or null for a page with no `path`. */
export function parsePathPage(markdown: string): PathPageSource | null {
  const front = /^---\n([\s\S]*?)\n---/.exec(markdown)?.[1] ?? "";
  const field = (name: string) => new RegExp(`^${name}: (.+)$`, "m").exec(front)?.[1]?.trim();
  const path = field("path");
  const heading = field("heading");
  if (!path || !heading) return null;
  return {
    path,
    heading,
    lang: field("lang") === "en" ? "en" : "pl",
    reviewed: field("reviewed") === "true",
  };
}

/** A reviewed page must be built and in the sitemap; an unreviewed one is left out, so nothing is asked of it. */
export function pathPageChecks(pages: PathPageSource[]): {
  must: DistCheck[];
  mustNot: DistCheck[];
} {
  const must: DistCheck[] = [];
  const mustNot: DistCheck[] = [];
  for (const page of pages) {
    const file = `${page.path.slice(1)}/index.html`;
    mustNot.push([file, contactPlaceholder]);
    if (!page.reviewed) continue;
    must.push(
      [file, `<html lang="${page.lang}"`],
      [file, `<h1>${page.heading}</h1>`],
      ["sitemap-0.xml", `<loc>${canonical(page.path)}</loc>`],
    );
  }
  return { must, mustNot };
}
