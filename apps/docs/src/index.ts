import { hosts } from "@jadwigo/config";

/** The host this app serves in prod. */
export const servedHost = hosts.prod.docs;

/** Where every API path in the guides starts: the app's host, which serves `/api` too. */
export const apiBase = `https://${hosts.prod.app}`;

/** One sidebar group: a label and the pages under it, each by its slug in src/content/docs. */
export interface SidebarGroup {
  readonly label: string;
  readonly items: readonly string[];
  /** A directory whose pages follow the items, under its own label: pages the build generates. */
  readonly generated?: { readonly label: string; readonly directory: string };
}

/**
 * The sidebar, in the order a reader meets it. A page is listed by its slug, so a new page joins a
 * group here, and a new section is a new group. A slug with no page fails the build.
 */
export const SIDEBAR: readonly SidebarGroup[] = [
  {
    label: "Guides",
    items: ["guides/introduction", "guides/authentication", "guides/first-call", "guides/errors"],
  },
  // Filled by starlight-openapi from public/openapi.json (astro.config.mjs).
  { label: "API reference", items: [] },
  { label: "MCP", items: ["mcp"], generated: { label: "Tools", directory: "mcp" } },
  {
    label: "Design system",
    items: [
      "design-system",
      "design-system/tokens",
      "design-system/primitives",
      "design-system/question-types",
      "design-system/copy",
    ],
  },
  {
    label: "Architecture",
    items: ["architecture", "architecture/monorepo", "architecture/contracts"],
  },
];

/** SIDEBAR in the shape Starlight's `sidebar` option takes. */
export const sidebar = SIDEBAR.map((group) => ({
  label: group.label,
  items: [
    ...group.items.map((slug) => ({ slug })),
    ...(group.generated
      ? [
          {
            label: group.generated.label,
            items: [{ autogenerate: { directory: group.generated.directory } }],
          },
        ]
      : []),
  ],
}));
