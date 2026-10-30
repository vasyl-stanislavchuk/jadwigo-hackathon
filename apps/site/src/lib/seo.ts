// The head every page carries: canonical on the apex, Open Graph and Twitter cards, JSON-LD for the
// organisation and the website (docs/plan/jadwigo-monorepo.md section 5b in david-learns). Pure, so
// the unit test reads it without a build.
import { z } from "astro/zod";
import { servedHost } from "../index.ts";

const origin = `https://${servedHost}`;
const siteName = "Jadwigo";

/** A page's frontmatter. A page a native speaker has not reviewed never reaches a prod build. */
export const pageSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  heading: z.string().min(1),
  ogImage: z.string().startsWith("/").optional(),
  /** The words of the page's one link to the app (appUrl), when it has one. */
  play: z.string().min(1).optional(),
  reviewed: z.boolean(),
});
export type Page = z.infer<typeof pageSchema>;

export type HeadTag =
  | { kind: "meta"; name: string; content: string }
  | { kind: "property"; property: string; content: string }
  | { kind: "link"; rel: string; href: string; type?: string; sizes?: string };

/** The crown favicon (dl-w0b4.68): public/ is written by tools/src/brand-icons.ts. */
const iconTags: readonly HeadTag[] = [
  { kind: "link", rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { kind: "link", rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
  { kind: "link", rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { kind: "meta", name: "theme-color", content: "#2f63b8" },
];

/** The page's address on the apex, with a trailing slash, as the sitemap writes it. */
export function canonical(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  return trimmed ? `${origin}/${trimmed}/` : `${origin}/`;
}

export function headTags(page: Page, path: string): HeadTag[] {
  const url = canonical(path);
  const tags: HeadTag[] = [
    { kind: "meta", name: "description", content: page.description },
    { kind: "link", rel: "canonical", href: url },
    { kind: "property", property: "og:type", content: "website" },
    { kind: "property", property: "og:site_name", content: siteName },
    { kind: "property", property: "og:locale", content: "pl_PL" },
    { kind: "property", property: "og:title", content: page.title },
    { kind: "property", property: "og:description", content: page.description },
    { kind: "property", property: "og:url", content: url },
    { kind: "meta", name: "twitter:title", content: page.title },
    { kind: "meta", name: "twitter:description", content: page.description },
    ...iconTags,
  ];
  if (page.ogImage) {
    const image = `${origin}${page.ogImage}`;
    tags.push(
      { kind: "property", property: "og:image", content: image },
      { kind: "meta", name: "twitter:card", content: "summary_large_image" },
      { kind: "meta", name: "twitter:image", content: image },
    );
  } else {
    tags.push({ kind: "meta", name: "twitter:card", content: "summary" });
  }
  return tags;
}

/** Structured data for the organisation and the website, one graph per page. */
export function jsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: siteName,
        url: `${origin}/`,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: siteName,
        url: `${origin}/`,
        inLanguage: "pl",
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}

/** A prod build stops on any page not yet reviewed by a native speaker. */
export function assertReviewed(pages: { id: string; data: Page }[], isProd: boolean): void {
  if (!isProd) return;
  const unreviewed = pages.filter((p) => !p.data.reviewed).map((p) => p.id);
  if (unreviewed.length > 0) {
    throw new Error(`Not reviewed, so not in a prod build: ${unreviewed.join(", ")}`);
  }
}

export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap-index.xml\n`;
}
