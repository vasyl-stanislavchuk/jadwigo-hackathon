/**
 * The playground's URL: a path for where you are, a query for how you look at it. Ported from
 * david-learns frontend/src/playground/route.ts without the whole lessons, the learner view, the
 * simulated network and Ukrainian (dl-5ssh.34.6).
 *
 *   /playground                                        the start page: every question type by family
 *   /playground/system                                 the System page: Zeszyt, drawn from the live tokens
 *   /playground/<family>                               a family's first question type
 *   /playground/<family>/<question type>[/<example>]   a question type at one example
 *
 *   ?tab=try|review|details   the question type page's tab
 *   ?lang=pl|en               the learner's language       ?who=child|adult   the learner's category
 *   ?level=concrete|representational|abstract   the review tab's CRA level
 *   ?theme=light|dark         the review tab holds the page at one theme
 *   ?<switch>=<value>         every playground switch in switches.ts
 *
 * Moving around is client-side (pushState), so the query rides along: a language picked on one
 * family stays on the next. Links stay real links.
 */

import type { Category, Language } from "@jadwigo/copy";
import { FAMILIES, type FamilyName } from "@jadwigo/lesson-kit";
import { useSyncExternalStore } from "react";
import { LANGUAGES } from "./localize.ts";
import { SWITCHES, switchOf } from "./switches.ts";

export interface PlaygroundRoute {
  family: FamilyName | null;
  /** A question type of the family, by name. */
  question_type: string | null;
  /** An example of the question type, by id. */
  example: string | null;
  /** A page of its own, not a family: /playground/system. */
  page?: PlaygroundPage;
}

/** The playground's own pages beside the families. */
export const PAGES = ["system"] as const;
export type PlaygroundPage = (typeof PAGES)[number];
const isPage = (name: string | undefined): name is PlaygroundPage =>
  name !== undefined && (PAGES as readonly string[]).includes(name);

const isFamily = (name: string | undefined): name is FamilyName =>
  name !== undefined && (FAMILIES as readonly string[]).includes(name);

/** /playground → the start page; /playground/<family>[/<question type>[/<example>]] → a family. */
export function playgroundRoute(path: string): PlaygroundRoute | null {
  const match = path.match(/^\/playground(?:\/([^/]+)(?:\/([^/]+)(?:\/([^/]+))?)?)?\/?$/);
  if (match === null) return null;
  const [first, second, third] = [match[1], match[2], match[3]].map((p) =>
    p === undefined ? undefined : decodeURIComponent(p),
  );
  if (first === undefined) return { family: null, question_type: null, example: null };
  if (isPage(first) && second === undefined)
    return { family: null, question_type: null, example: null, page: first };
  if (!isFamily(first)) return null;
  return { family: first, question_type: second ?? null, example: third ?? null };
}

// ---- the live URL ----------------------------------------------------------------------------

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
  const url = new URL(current, "http://playground.local");
  return { path: url.pathname, query: url.searchParams };
}

/** Go to a playground URL without a reload. */
export function navigate(to: string, { replace = false }: { replace?: boolean } = {}): void {
  if (to === href()) return;
  if (replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  window.dispatchEvent(new Event(CHANGE));
  if (!replace) window.scrollTo({ top: 0 });
}

/** The query keys that follow you from view to view: the learner, the view, and every switch. */
const STICKY: readonly string[] = ["lang", "who", "level", "theme", ...SWITCHES.map((s) => s.name)];

/** A playground link: `path` plus `query`, carrying the sticky keys of the current URL. */
export function linkTo(
  path: string,
  query: Record<string, string | null | undefined> = {},
): string {
  const current = new URLSearchParams(window.location.search);
  const next = new URLSearchParams();
  for (const key of STICKY) {
    const value = current.get(key);
    if (value !== null) next.set(key, value);
  }
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) next.delete(key);
    else next.set(key, value);
  }
  const search = next.toString();
  return search ? `${path}?${search}` : path;
}

/** Change some query keys in place (null removes one). */
export function setQuery(
  changes: Record<string, string | null>,
  options: { replace?: boolean } = { replace: true },
): void {
  navigate(
    linkTo(window.location.pathname, {
      ...Object.fromEntries(new URLSearchParams(window.location.search)),
      ...changes,
    }),
    options,
  );
}

// ---- the query's values ----------------------------------------------------------------------

export const CATEGORIES: readonly Category[] = ["child", "adult"];
/** A question type page's tabs. Details holds the type's facts, its modes and its data. */
export type Tab = "try" | "review" | "details";
export const TABS: readonly Tab[] = ["try", "review", "details"];

export function queryLanguage(query: URLSearchParams): Language | null {
  const value = query.get("lang");
  return LANGUAGES.find((l) => l === value) ?? null;
}

export function queryCategory(query: URLSearchParams): Category | null {
  const value = query.get("who");
  return CATEGORIES.find((c) => c === value) ?? null;
}

export function queryTab(query: URLSearchParams): Tab | null {
  const value = query.get("tab");
  return TABS.find((t) => t === value) ?? null;
}

/** The review tab's abstraction level (decision 2026-10-18-the-playground-s-abstraction-switch-has-three-cra-levels). */
export const LEVELS = ["concrete", "representational", "abstract"] as const;
export type Level = (typeof LEVELS)[number];

export function queryLevel(query: URLSearchParams): Level {
  const value = query.get("level");
  return LEVELS.find((l) => l === value) ?? "abstract";
}

/** The theme the review tab holds the page at, or null to follow the laptop. */
export function queryTheme(query: URLSearchParams): "light" | "dark" | null {
  const value = query.get("theme");
  return value === "light" || value === "dark" ? value : null;
}

/** A playground switch's value (switches.ts): the one in the URL when the switch takes it, else
 * the switch's default. An unknown switch reads as null. */
export function querySwitch(query: URLSearchParams, name: string): string | null {
  const sw = switchOf(name);
  if (sw === undefined) return null;
  const value = query.get(name);
  return value !== null && sw.values.includes(value) ? value : sw.default;
}
