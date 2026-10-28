/**
 * Lesson pages follow the laptop's light or dark setting, for every learner (owner, 2026-10-08,
 * dl-i952.19). tokens.css and kids.css hold the dark values under [theme='dark']; this sets that
 * attribute from prefers-color-scheme and keeps it in step when the setting changes. While a page
 * prints it is light, since the paper is white. The printed sheet's route never calls this.
 *
 * The playground's review tab (dl-w3.47) may hold one theme while it is open, so the reviewer sees a type
 * in dark on a light laptop: `holdTheme` sets the override, and the media listener respects it
 * until the hold is released. A lesson never holds a theme.
 */

export interface ThemeWindow {
  matchMedia(query: string): Pick<MediaQueryList, "matches" | "addEventListener">;
  addEventListener(type: "beforeprint" | "afterprint", listener: () => void): void;
}

export type Theme = "light" | "dark";

export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The held theme, or null when the page follows the system. Module state: one page, one root. */
let override: Theme | null = null;
/** The follower's own apply, so a hold or a release re-reads the system setting on the same root. */
let followed: { root: HTMLElement; apply(): void } | null = null;

function set(root: HTMLElement, dark: boolean): void {
  if (dark) root.setAttribute("theme", "dark");
  else root.removeAttribute("theme");
}

export function followSystemTheme(root: HTMLElement, win: ThemeWindow): void {
  const dark = win.matchMedia(DARK_QUERY);
  let printing = false;
  const apply = () =>
    set(root, (override === null ? dark.matches : override === "dark") && !printing);
  followed = { root, apply };
  dark.addEventListener("change", apply);
  win.addEventListener("beforeprint", () => {
    printing = true;
    apply();
  });
  win.addEventListener("afterprint", () => {
    printing = false;
    apply();
  });
  apply();
}

/** Hold the page at `theme`, or release it (null) so it follows the system again. */
export function holdTheme(root: HTMLElement, theme: Theme | null): void {
  override = theme;
  if (followed !== null && followed.root === root) followed.apply();
  else set(root, theme === "dark");
}

/** The theme held now, for the tests and the review toolbar. */
export function heldTheme(): Theme | null {
  return override;
}
