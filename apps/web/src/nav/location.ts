/**
 * The app's one address: the current path and query, and a client-side move (pushState) that
 * keeps the query (dl-uukj.32 wave 2 step 0, split out of playground/route.ts so the product's
 * screens no longer import the playground). Links stay real links (NavLink.tsx); a move re-renders
 * every useLocation() through one event.
 */

import type { Language } from "@jadwigo/copy";
import { useSyncExternalStore } from "react";

/** The languages the app speaks, as ?lang names them (packages/copy's Language). */
export const LANGUAGES: readonly Language[] = ["pl", "en"];

const CHANGE = "playground:navigate";

function subscribe(listener: () => void): () => void {
  window.addEventListener("popstate", listener);
  window.addEventListener(CHANGE, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(CHANGE, listener);
  };
}

const href = (): string => window.location.pathname + window.location.search;

/** The current path and query, re-rendering on every move. */
export function useLocation(): { path: string; query: URLSearchParams } {
  const current = useSyncExternalStore(subscribe, href, href);
  const url = new URL(current, "http://app.local");
  return { path: url.pathname, query: url.searchParams };
}

/** Go to a URL of the app without a reload. */
export function navigate(to: string, { replace = false }: { replace?: boolean } = {}): void {
  if (to === href()) return;
  if (replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  window.dispatchEvent(new Event(CHANGE));
  if (!replace) window.scrollTo({ top: 0 });
}

/** The page's language from ?lang, or null when absent or unknown. */
export function queryLanguage(query: URLSearchParams): Language | null {
  const value = query.get("lang");
  return LANGUAGES.find((l) => l === value) ?? null;
}
