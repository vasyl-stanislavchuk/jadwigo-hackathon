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
  /** Closed until the reader opens it: the developer reference, below the judges' path. */
  readonly collapsed?: boolean;
}

/**
 * The sidebar, in the order a reader meets it. A page is listed by its slug, so a new page joins a
 * group here, and a new section is a new group. A slug with no page fails the build.
 */
export const SIDEBAR: readonly SidebarGroup[] = [
  // Judges first (dl-5ssh.90.53.19), at 3 depths: the home, a section's index, then its pages.
  // What Jadwigo is and what is real, the product, how it is built, then the vision and the
  // experiments behind it. The developer reference follows, closed until opened.
  { label: "Start", items: ["index", "what-is-real", "story"] },
  {
    label: "Features",
    items: [
      "features/photo-to-lesson",
      "features/chat-and-workspace",
      "features/share-and-play",
      "features/player-and-families",
      "features/celebration",
      "features/credits",
      "features/print",
      "features/connect-your-ai",
      "features/sign-in-and-consent",
      "features/question-bank",
    ],
  },
  {
    label: "How it is built",
    items: [
      "architecture",
      "architecture/monorepo",
      "architecture/contracts",
      "architecture/ai-engine",
      "architecture/building-with-agents",
    ],
  },
  {
    label: "Vision",
    items: ["vision", "vision/learning-loop", "vision/growing-the-bank", "vision/judging-answers"],
  },
  {
    label: "Experiments",
    items: [
      "experiments",
      "experiments/e1",
      "experiments/e2",
      "experiments/e3",
      "experiments/e4",
      "experiments/e5",
      "experiments/e6",
      "experiments/e7",
    ],
  },
  {
    label: "API guides",
    collapsed: true,
    items: [
      "guides/introduction",
      "guides/authentication",
      "guides/first-call",
      "guides/conversations",
      "guides/errors",
      "guides/question-sources",
    ],
  },
  {
    label: "Use with agents",
    collapsed: true,
    items: ["guides/agents", "mcp"],
    generated: { label: "MCP tools", directory: "mcp" },
  },
  // Filled by starlight-openapi from public/openapi.json (astro.config.mjs).
  { label: "API reference", items: [] },
  // The intro, then a group per package that starlight-typedoc fills (astro.config.mjs).
  { label: "TypeScript client", collapsed: true, items: ["typescript"] },
  {
    label: "Design system",
    collapsed: true,
    items: [
      "design-system",
      "design-system/tokens",
      "design-system/primitives",
      "design-system/question-types",
      "design-system/copy",
      "design-system/illustration",
    ],
  },
];

/** SIDEBAR in the shape Starlight's `sidebar` option takes. */
export const sidebar = SIDEBAR.map((group) => ({
  label: group.label,
  ...(group.collapsed ? { collapsed: true } : {}),
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
