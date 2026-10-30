/**
 * Cmd+K or Ctrl+K opens Starlight's search dialog at once, but Pagefind builds the search box only
 * once the browser is idle after load. Opened before then, the dialog keeps the focus and typing
 * goes nowhere (owner, 2026-10-30). This puts the focus in the box as soon as both exist.
 */
export function focusSearchWhenReady(root: ParentNode): () => void {
  const dialog = root.querySelector<HTMLDialogElement>("site-search dialog");
  if (!dialog) return () => {};
  const focus = () => {
    const input = dialog.querySelector<HTMLInputElement>("input");
    if (dialog.open && input && document.activeElement !== input) input.focus();
  };
  const observer = new MutationObserver(focus);
  observer.observe(dialog, {
    attributes: true,
    attributeFilter: ["open"],
    childList: true,
    subtree: true,
  });
  return () => observer.disconnect();
}

/** The inline script for Starlight's head: wires focusSearchWhenReady once the page is parsed. */
export const SEARCH_FOCUS = `document.addEventListener("DOMContentLoaded", () => {
  (${focusSearchWhenReady.toString()})(document);
});`;
