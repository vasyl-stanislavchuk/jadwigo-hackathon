// The sitemap's alternates (dl-w0b4.83), read from each built page's own hreflang links, so the
// sitemap can never name a twin the page itself does not (Base.astro emits only served twins).
// Pure, so alternates.test.ts checks it without a build.

export interface Alternate {
  hreflang: string;
  href: string;
}

const attr = (tag: string, name: string): string | undefined =>
  new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

/** Every `<link rel="alternate" hreflang=…>` in a page, in order. */
export function alternatesIn(html: string): Alternate[] {
  return [...html.matchAll(/<link\b[^>]*>/g)].flatMap(([tag]) => {
    const hreflang = attr(tag, "hreflang");
    const href = attr(tag, "href");
    return attr(tag, "rel") === "alternate" && hreflang && href ? [{ hreflang, href }] : [];
  });
}

/** A built page's file under dist for its pathname: `en/lessons/` is `en/lessons/index.html`. */
export function pageFile(pathname: string): string[] {
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  return trimmed ? [`${trimmed}/index.html`, `${trimmed}.html`] : ["index.html"];
}

/** @astrojs/sitemap's `links` for one URL: each alternate, x-default included. */
export const sitemapLinks = (alternates: Alternate[]): { lang: string; url: string }[] =>
  alternates.map((a) => ({ lang: a.hreflang, url: a.href }));
