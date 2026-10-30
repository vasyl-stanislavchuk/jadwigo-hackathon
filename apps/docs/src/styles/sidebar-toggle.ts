/**
 * Both side panels can be hidden on a wide screen, and stay as the reader left them (owner,
 * 2026-10-30): the left sidebar (SiteTitle.astro) and the right-hand contents (PageTitle.astro).
 * Each choice lives on an <html> attribute, which the CSS reads, and in localStorage, which may be
 * missing or refuse a write; then the panel just shows.
 */
export const PANELS = {
  sidebar: { attribute: "data-sidebar", key: "jw-docs-sidebar" },
  toc: { attribute: "data-toc", key: "jw-docs-toc" },
} as const;

export type Panel = keyof typeof PANELS;

/** The left sidebar's storage key. */
export const SIDEBAR_KEY = PANELS.sidebar.key;

/** Read before the first paint, in the head, so a hidden panel never flashes open. */
export const SIDEBAR_STATE = `(() => {
  const panels = ${JSON.stringify(Object.values(PANELS))};
  for (const { attribute, key } of panels) {
    try {
      if (localStorage.getItem(key) === "collapsed") {
        document.documentElement.setAttribute(attribute, "collapsed");
      }
    } catch {}
  }
})();`;

/** Whether a panel is hidden now. */
export function isCollapsed(root: HTMLElement, panel: Panel = "sidebar"): boolean {
  return root.getAttribute(PANELS[panel].attribute) === "collapsed";
}

/** Hides a shown panel or shows a hidden one, remembers it, and returns whether it is now hidden. */
export function toggleSidebar(
  root: HTMLElement,
  storage: Pick<Storage, "setItem"> | null,
  panel: Panel = "sidebar",
): boolean {
  const { attribute, key } = PANELS[panel];
  const collapsed = !isCollapsed(root, panel);
  if (collapsed) root.setAttribute(attribute, "collapsed");
  else root.removeAttribute(attribute);
  try {
    storage?.setItem(key, collapsed ? "collapsed" : "open");
  } catch {
    // A private window or blocked storage: the choice lasts until the next page.
  }
  return collapsed;
}
