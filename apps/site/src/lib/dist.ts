// What scripts/check-dist.ts asks of each page with its own `path` (dl-w0b4.64). Pure, so the unit
// test reads it without a build.
import type { Language } from "@jadwigo/config";
import { servedLanguages } from "./i18n.ts";
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

/**
 * A reviewed page must be built and in the sitemap; an unreviewed one is left out, so nothing is
 * asked of it. So is a page in a language the deployed build does not serve yet (English until
 * dl-5ssh.34.70 makes it live): `served` defaults to the strict build's languages.
 */
export function pathPageChecks(
  pages: PathPageSource[],
  served: readonly Language[] = servedLanguages(true),
): {
  must: DistCheck[];
  mustNot: DistCheck[];
} {
  const must: DistCheck[] = [];
  const mustNot: DistCheck[] = [];
  for (const page of pages) {
    const file = `${page.path.slice(1)}/index.html`;
    mustNot.push([file, contactPlaceholder]);
    if (!page.reviewed || !served.includes(page.lang)) continue;
    must.push(
      [file, `<html lang="${page.lang}"`],
      [file, `<h1>${page.heading}</h1>`],
      ["sitemap-0.xml", `<loc>${canonical(page.path)}</loc>`],
    );
  }
  return { must, mustNot };
}
