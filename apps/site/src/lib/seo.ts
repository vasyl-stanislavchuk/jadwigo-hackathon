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
  /** The share picture under public/, 1200x630 (tools/src/og-image.ts renders /og.png). */
  ogImage: z.string().startsWith("/").optional(),
  /** What the share picture shows, for og:image:alt and twitter:image:alt. The site's name when left out. */
  ogImageAlt: z.string().min(1).optional(),
  /** The words of the page's one link to the app (appUrl), when it has one. */
  play: z.string().min(1).optional(),
  reviewed: z.boolean(),
  /** The page's language. Polish when left out. */
  lang: z.enum(["pl", "en"]).optional(),
  /** The page's stable URL, for a page src/pages/[...path].astro renders. The landing page has none. */
  path: z
    .string()
    .regex(/^(\/[a-z0-9-]+)+$/)
    .optional(),
  /** The path of the same page in the other language: a visible link and an hreflang alternate. */
  translation: z
    .string()
    .regex(/^(\/[a-z0-9-]+)+$/)
    .optional(),
  /** A line shown above the words while the lawyer has not read them (dl-e8ov.2.9). */
  draftNote: z.string().min(1).optional(),
  /**
   * The O nas layout (dl-5ssh.4.15, photos as one collage in dl-w0b4.42): the words in a column beside the
   * family's photos, and one link under the words. `file` names the photo in the site bucket's
   * about-photos/, never in git; `width` and `height` are its largest size, so the page holds its place.
   */
  photos: z
    .array(
      z.object({
        file: z.string().regex(/^photo-[0-9]+$/),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        alt: z.string().min(1),
      }),
    )
    .min(1)
    .optional(),
  /** The collage's name for a screen reader. */
  photosLabel: z.string().min(1).optional(),
  /**
   * O nas's film and docs link (dl-w0b4.42). `cta` is the button that opens the film in a modal. `file`
   * names the film in the site bucket's about-photos/, never in git, as the photos do.
   */
  video: z
    .object({
      heading: z.string().min(1),
      cta: z.string().min(1),
      close: z.string().min(1),
      docs: z.string().min(1),
      file: z.string().regex(/^[a-z0-9-]+\.mp4$/),
    })
    .optional(),
  link: z
    .object({ href: z.string().regex(/^(\/[a-z0-9-]+)+$/), label: z.string().min(1) })
    .optional(),
});
export type Page = z.infer<typeof pageSchema>;

export type HeadTag =
  | { kind: "meta"; name: string; content: string }
  | { kind: "property"; property: string; content: string }
  | { kind: "link"; rel: string; href: string; type?: string; sizes?: string; hreflang?: string };

// Jadwigo's English is US English (decision draft dl-rok6).
const locales = { pl: "pl_PL", en: "en_US" } as const;

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
  const lang = page.lang ?? "pl";
  const tags: HeadTag[] = [
    { kind: "meta", name: "description", content: page.description },
    { kind: "link", rel: "canonical", href: url },
    { kind: "property", property: "og:type", content: "website" },
    { kind: "property", property: "og:site_name", content: siteName },
    { kind: "property", property: "og:locale", content: locales[lang] },
    { kind: "property", property: "og:title", content: page.title },
    { kind: "property", property: "og:description", content: page.description },
    { kind: "property", property: "og:url", content: url },
    { kind: "meta", name: "twitter:title", content: page.title },
    { kind: "meta", name: "twitter:description", content: page.description },
    ...iconTags,
  ];
  if (page.translation) {
    const other = lang === "pl" ? "en" : "pl";
    tags.push(
      { kind: "link", rel: "alternate", href: url, hreflang: lang },
      { kind: "link", rel: "alternate", href: canonical(page.translation), hreflang: other },
      { kind: "property", property: "og:locale:alternate", content: locales[other] },
    );
  }
  if (page.ogImage) {
    const image = `${origin}${page.ogImage}`;
    tags.push(
      { kind: "property", property: "og:image", content: image },
      { kind: "property", property: "og:image:width", content: "1200" },
      { kind: "property", property: "og:image:height", content: "630" },
      { kind: "property", property: "og:image:alt", content: page.ogImageAlt ?? siteName },
      { kind: "meta", name: "twitter:card", content: "summary_large_image" },
      { kind: "meta", name: "twitter:image", content: image },
      { kind: "meta", name: "twitter:image:alt", content: page.ogImageAlt ?? siteName },
    );
  } else {
    // No picture of its own (the 1200x630 card is dl-w0b4.74's): the app icon, with the small card,
    // so a shared link never previews bare (dl-w0b4.128).
    const icon = `${origin}/icon-512.png`;
    tags.push(
      { kind: "property", property: "og:image", content: icon },
      { kind: "property", property: "og:image:width", content: "512" },
      { kind: "property", property: "og:image:height", content: "512" },
      { kind: "property", property: "og:image:alt", content: siteName },
      { kind: "meta", name: "twitter:card", content: "summary" },
      { kind: "meta", name: "twitter:image", content: icon },
    );
  }
  return tags;
}

/**
 * The x-default alternate (dl-w0b4.83): a page with a twin names the Polish one as the page for a
 * reader whose language is neither. Its own tag, after headTags' 2 alternates.
 */
export function xDefaultTag(page: Page, path: string): HeadTag[] {
  if (!page.translation) return [];
  const polish = (page.lang ?? "pl") === "pl" ? path : page.translation;
  return [{ kind: "link", rel: "alternate", href: canonical(polish), hreflang: "x-default" }];
}

/** Structured data for the organisation and the website, one graph per page, in the page's language. */
export function jsonLd(lang: "pl" | "en" = "pl"): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: siteName,
        url: `${origin}/`,
        logo: `${origin}/icon-512.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: siteName,
        url: `${origin}/`,
        inLanguage: lang,
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}

/**
 * A prod build stops on any page not yet reviewed by a native speaker, except a page with its own
 * `path`: servedPathPages leaves that one out instead, so a draft never holds the landing page back.
 */
export function assertReviewed(pages: { id: string; data: Page }[], isProd: boolean): void {
  if (!isProd) return;
  const unreviewed = pages.filter((p) => !p.data.reviewed && !p.data.path).map((p) => p.id);
  if (unreviewed.length > 0) {
    throw new Error(`Not reviewed, so not in a prod build: ${unreviewed.join(", ")}`);
  }
}

/**
 * The pages src/pages/[...path].astro renders: every page with a `path`, and in a prod build only the
 * reviewed ones. Each one left out is named in the build log (dl-w0b4.64).
 */
export function servedPathPages<T extends { id: string; data: Page }>(
  pages: T[],
  isProd: boolean,
  log: (line: string) => void = console.warn,
): T[] {
  return pages.filter((p) => {
    if (!p.data.path) return false;
    if (!isProd || p.data.reviewed) return true;
    log(`Not reviewed, so left out of the prod build: ${p.id} (${p.data.path}/)`);
    return false;
  });
}

export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap-index.xml\n`;
}
