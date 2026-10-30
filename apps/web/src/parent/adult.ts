/**
 * What every parent screen shares: the adult reads the adult's lines (the copy's `adult` table,
 * falling back to the child's where it has none of its own), and every link carries the page's
 * ?lang on (dl-uukj.32 wave 2).
 */

/** The parent's pages are for the adult: every copy() under parent/ passes it. */
export const CATEGORY = "adult";

/** The page's ?lang, carried onto every link. */
export const pageLang = (): string | null =>
  new URLSearchParams(window.location.search).get("lang");
