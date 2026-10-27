// The marketing site at the apex, built static (docs/plan/jadwigo-monorepo.md section 5b in david-learns).
// Polish only for the hackathon
// (jadwigo-marketing/decisions/2026-10-27-for-the-hackathon-jadwigo-is-jadwigo-pl-only-in-polish-with-no-e).
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { servedHost } from "./src/index.ts";

export default defineConfig({
  site: `https://${servedHost}`,
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory" },
  integrations: [sitemap()],
});
