/**
 * Starlight keeps its day or night on <html data-theme>, and Zeszyt's night roles sit on
 * [theme="dark"] (@jadwigo/ui foundation.css). This copies the one onto the other. It goes into the
 * head as an inline script ahead of Starlight's own theme script, so the observer is already
 * watching when that script sets data-theme, and the copy lands in the same task, before the first
 * paint: a dark load never shows the day colours. The theme picker's changes follow the same way.
 */
export const THEME_BRIDGE = `(() => {
  const root = document.documentElement;
  const mirror = () => root.setAttribute("theme", root.dataset.theme === "light" ? "light" : "dark");
  if (root.dataset.theme) mirror();
  new MutationObserver(mirror).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
})();`;
