// The living docs at docs.jadwigo.pl (dl-5ssh.90), decision
// jadwigo-platform/notes/2026-10-29-jadwigo-s-docs-are-a-starlight-site-at-docs-jadwigo-pl-generated.
// English. Self-contained: no page links into the repo.
import { fileURLToPath } from "node:url";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import mermaid from "astro-mermaid";
import starlightLinksValidator from "starlight-links-validator";
import starlightLlmActions from "starlight-llm-actions";
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
      sidebar: sidebar.map((group) => (group.label === "API reference" ? apiGroup : group)),
      // The page-actions menu sits beside the title, with Copy for Muse added (dl-5ssh.90.32).
      components: { PageTitle: "./src/components/PageTitle.astro" },
      // Agents find the API's OpenAPI document from any page, as they find a page's Markdown.
      head: [
        { tag: "script", content: THEME_BRIDGE },
        {
          tag: "link",
          attrs: {
            rel: "alternate",
            type: "application/vnd.oai.openapi+json",
            href: "/openapi.json",
          },
        },
      ],
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
        // A static Markdown copy of every content page at <page>.md, flattened from the rendered
        // page, a <link rel="alternate"> to it, and the menu: Copy and View as Markdown, Open in
        // Claude and ChatGPT. llms.txt stays starlight-llms-txt's.
        starlightLlmActions({
          renderMarkdown: "simple",
          linkAlternate: true,
          llmsTxt: false,
          actions: {
            copyMarkdown: true,
            viewMarkdown: true,
            printPdf: false,
            openIn: {
              providers: {
                claude: true,
                chatgpt: true,
                copilot: false,
                gemini: false,
                perplexity: false,
              },
            },
          },
        }),
        starlightLlmsTxt({
          projectName: "Jadwigo",
          description:
            "Jadwigo is a learning app for children in the first school grades, in Polish and English.",
          details: `The API's base URL is ${apiBase}. Every route is under /api/v1, except /api/health. The OpenAPI 3.1 document for every route is https://${servedHost}/openapi.json. Every page is also served as Markdown at its URL with .md in place of the trailing slash.`,
          promote: ["index*", "guides/agents", "guides/first-call"],
          customSets: [
            {
              label: "API",
              description:
                "calling the API: the base URL, signing in, the first call and its errors",
              paths: [
                "guides/introduction",
                "guides/authentication",
                "guides/first-call",
                "guides/errors",
              ],
            },
            {
              label: "MCP",
              description: "the MCP server jw mcp serve: registering it and every tool",
              paths: ["guides/agents", "mcp", "mcp/**"],
            },
            {
              label: "Design system",
              description: "the tokens, primitives, question types and copy the app is built from",
              paths: ["design-system", "design-system/**"],
            },
          ],
        }),
      ],
    }),
  ],
});
