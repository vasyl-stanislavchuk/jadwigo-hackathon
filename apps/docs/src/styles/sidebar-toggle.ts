/**
 * The left sidebar can be hidden on a wide screen, and stays as the reader left it (owner,
 * 2026-10-30). The choice lives on <html data-sidebar="collapsed">, which SiteTitle.astro's CSS
 * reads, and in localStorage, which may be missing or refuse a write; then the sidebar just shows.
 */
export const SIDEBAR_KEY = "jw-docs-sidebar";

/** Read before the first paint, in the head, so a collapsed sidebar never flashes open. */
export const SIDEBAR_STATE = `(() => {
  try {
    if (localStorage.getItem("${SIDEBAR_KEY}") === "collapsed") {
      document.documentElement.setAttribute("data-sidebar", "collapsed");
    }
  } catch {}
})();`;

/** Whether the sidebar is hidden now. */
export function isCollapsed(root: HTMLElement): boolean {
  return root.getAttribute("data-sidebar") === "collapsed";
}

/** Hides a shown sidebar or shows a hidden one, remembers it, and returns whether it is now hidden. */
export function toggleSidebar(
  root: HTMLElement,
  storage: Pick<Storage, "setItem"> | null,
): boolean {
  const collapsed = !isCollapsed(root);
  if (collapsed) root.setAttribute("data-sidebar", "collapsed");
  else root.removeAttribute("data-sidebar");
  try {
    storage?.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "open");
  } catch {
    // A private window or blocked storage: the choice lasts until the next page.
  }
  return collapsed;
}
