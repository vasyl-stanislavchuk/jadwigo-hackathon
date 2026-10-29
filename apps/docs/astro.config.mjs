// The living docs at docs.jadwigo.pl (dl-5ssh.90), decision
// jadwigo-platform/notes/2026-10-29-jadwigo-s-docs-are-a-starlight-site-at-docs-jadwigo-pl-generated.
// English. Self-contained: no page links into the repo.
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";
import starlightLlmsTxt from "starlight-llms-txt";
import { apiBase, servedHost, sidebar } from "./src/index.ts";

export default defineConfig({
  site: `https://${servedHost}`,
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory" },
  integrations: [
    starlight({
      title: "Jadwigo docs",
      description: "How to call Jadwigo's API and MCP server, and how its design system is built.",
      sidebar,
      plugins: [
        // Fails the build on a broken internal link, so a renamed page never strands one.
        starlightLinksValidator({ errorOnLocalLinks: true }),
        starlightLlmsTxt({
          projectName: "Jadwigo",
          description:
            "Jadwigo is a learning app for children in the first school grades, in Polish and English.",
          details: `The API's base URL is ${apiBase}. Every route is under /api/v1, except /api/health.`,
        }),
      ],
    }),
  ],
});
