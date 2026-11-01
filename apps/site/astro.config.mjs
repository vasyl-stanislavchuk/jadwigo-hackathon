// The marketing site at the apex, built static (docs/plan/jadwigo-monorepo.md section 5b in david-learns).
// Polish at the root and English under /en/
// (jadwigo-marketing/decisions/2026-11-01-for-the-hackathon-jadwigo-is-live-in-polish-and-english-on-jadwi).
// Which languages a build actually serves is src/lib/i18n.ts's servedLanguages (dl-w0b4.81).

import { existsSync, readFileSync } from "node:fs";
import sitemap from "@astrojs/sitemap";
import { LANGUAGE_CODES } from "@jadwigo/config";
import { defineConfig } from "astro/config";
import { servedHost } from "./src/index.ts";
import { alternatesIn, pageFile, sitemapLinks } from "./src/lib/alternates.ts";
import { canonical } from "./src/lib/seo.ts";

// Each built page's hreflang links, by its URL, for the sitemap's xhtml:link alternates (dl-w0b4.83).
// Collected by the integration listed before sitemap(), whose astro:build:done runs first. The
// pages' slugs differ per language, so the sitemap's own i18n option, which pairs equal paths,
// cannot find the twins; each page's head already names them, and only served ones.
const alternates = new Map();
const pageAlternates = {
  name: "jadwigo-page-alternates",
  hooks: {
    "astro:build:done": ({ dir, pages }) => {
      for (const { pathname } of pages) {
        const file = pageFile(pathname)
          .map((f) => new URL(f, dir))
          .find((u) => existsSync(u));
        if (file) alternates.set(canonical(pathname), alternatesIn(readFileSync(file, "utf8")));
      }
    },
  },
};

export default defineConfig({
  site: `https://${servedHost}`,
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory" },
  i18n: {
    defaultLocale: "pl",
    locales: [...LANGUAGE_CODES],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    pageAlternates,
    sitemap({
      serialize: (item) => {
        const links = sitemapLinks(alternates.get(item.url) ?? []);
        return links.length > 0 ? { ...item, links } : item;
      },
    }),
  ],
});
