// The living docs at docs.jadwigo.pl (dl-5ssh.90), decision
// jadwigo-platform/notes/2026-10-29-jadwigo-s-docs-are-a-starlight-site-at-docs-jadwigo-pl-generated.
// English. Self-contained: no page links into the repo.
import { fileURLToPath } from "node:url";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import mermaid from "astro-mermaid";
import starlightLinksValidator from "starlight-links-validator";
import starlightLlmsTxt from "starlight-llms-txt";
import starlightOpenAPI, { createOpenAPISidebarGroup } from "starlight-openapi";
import { apiBase, servedHost, sidebar } from "./src/index.ts";
import { API_REFERENCE_BASE } from "./src/lib/guides.ts";
import { THEME_BRIDGE } from "./src/styles/theme-bridge.ts";

// The API reference's sidebar group, which starlight-openapi fills from public/openapi.json.
const apiGroup = createOpenAPISidebarGroup();

export default defineConfig({
  site: `https://${servedHost}`,
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory" },
  // starlight-openapi ships TypeScript, so Vite bundles it and, through it, satteri, whose native
  // binding then can't be found from dist/. Left external, it loads from node_modules.
  vite: { ssr: { external: ["satteri"] } },
  integrations: [
    // Before Starlight, so its code blocks reach Expressive Code as diagrams, not as code. The
    // diagram is drawn in the browser; the HTML carries its source (check-dist asserts it).
    mermaid({ autoTheme: true }),
    starlight({
      title: "Jadwigo docs",
      description: "How to call Jadwigo's API and MCP server, and how its design system is built.",
      // The app's design system: Andika, Zeszyt's roles, and the --sl-* names mapped onto them
      // (src/styles/theme.css). Its night roles sit on [theme="dark"], which the bridge copies
      // from Starlight's data-theme before the first paint.
      // Andika's files are resolved here, not named, so knip sees the dependency.
      customCss: [
        fileURLToPath(import.meta.resolve("@fontsource/andika/400.css")),
        fileURLToPath(import.meta.resolve("@fontsource/andika/700.css")),
        fileURLToPath(import.meta.resolve("@fontsource/andika/400-italic.css")),
        fileURLToPath(import.meta.resolve("@fontsource/andika/700-italic.css")),
        "@jadwigo/ui/foundation.css",
        "./src/styles/theme.css",
      ],
      head: [{ tag: "script", content: THEME_BRIDGE }],
      sidebar: sidebar.map((group) => (group.label === "API reference" ? apiGroup : group)),
      plugins: [
        // Pages under /api/ from the snapshot (scripts/prepare.ts); /openapi.json is served as is.
        starlightOpenAPI([
          {
            base: API_REFERENCE_BASE,
            schema: "./public/openapi.json",
            sidebar: {
              label: "API reference",
              group: apiGroup,
              collapsed: false,
              operations: { badges: true },
            },
          },
        ]),
        // Fails the build on a broken internal link, so a renamed page never strands one. It sees
        // only content pages, so links into /api/ are checked by src/guides.test.ts instead.
        starlightLinksValidator({
          errorOnLocalLinks: true,
          exclude: [`/${API_REFERENCE_BASE}/`, `/${API_REFERENCE_BASE}/operations/**`],
        }),
        starlightLlmsTxt({
          projectName: "Jadwigo",
          description:
            "Jadwigo is a learning app for children in the first school grades, in Polish and English.",
          details: `The API's base URL is ${apiBase}. Every route is under /api/v1, except /api/health. The OpenAPI 3.1 document for every route is https://${servedHost}/openapi.json.`,
        }),
      ],
    }),
  ],
});
