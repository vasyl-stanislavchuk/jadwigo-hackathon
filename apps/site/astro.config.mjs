// The marketing site at the apex, built static (docs/plan/jadwigo-monorepo.md section 5b in david-learns).
// Polish at the root and English under /en/
// (jadwigo-marketing/decisions/2026-11-01-for-the-hackathon-jadwigo-is-live-in-polish-and-english-on-jadwi).
// Which languages a build actually serves is src/lib/i18n.ts's servedLanguages (dl-w0b4.81).

import sitemap from "@astrojs/sitemap";
import { LANGUAGE_CODES } from "@jadwigo/config";
import { defineConfig } from "astro/config";
import { servedHost } from "./src/index.ts";

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
  integrations: [sitemap()],
});
