/**
 * The screens' language (dl-uukj.33): ?lang first, then the parent's pick kept in this browser,
 * then the pod's language once a signed-in parent's /me has said it, then Polish. Never the
 * browser's own language (decision jadwigo-marketing 2026-11-01, lead decision 2 of wave
 * dl-9t2o-1). The page's <html lang> follows it.
 */

import type { Language } from "@jadwigo/copy";
import { useEffect, useSyncExternalStore } from "react";
import { LANGUAGES, navigate, queryLanguage } from "./location.ts";

/** The language when nothing else names one. */
const DEFAULT_LANGUAGE: Language = "pl";

const KEY = "jw.language";
const CHANGE = "jw:language";

const known = (value: string | null | undefined): Language | null =>
  LANGUAGES.find((l) => l === value) ?? null;

/** The order, as a pure function: the first of the four that names a language. */
export function screenLanguage({
  query,
  picked,
  pod,
}: {
  query: URLSearchParams;
  picked: Language | null;
  pod: Language | null;
}): Language {
  return queryLanguage(query) ?? picked ?? pod ?? DEFAULT_LANGUAGE;
}

/** The parent's pick, kept between visits in localStorage. */
export const pickedLanguage = {
  get(storage: Storage = window.localStorage): Language | null {
    try {
      return known(storage.getItem(KEY));
    } catch {
      // Storage refused (a private window with storage off): no pick.
      return null;
    }
  },
  set(language: Language, storage: Storage = window.localStorage): void {
    try {
      storage.setItem(KEY, language);
    } catch {
      // Kept for this page only: the screens still follow it until a reload.
      held = language;
    }
    window.dispatchEvent(new Event(CHANGE));
  },
};

/**
 * The parent picks a language: it is kept, and a ?lang on the address, which would outrank it,
 * becomes the pick, so the links that carry ?lang on carry the pick.
 */
export function pickLanguage(language: Language): void {
  pickedLanguage.set(language);
  const url = new URL(window.location.href);
  if (url.searchParams.has("lang") && url.searchParams.get("lang") !== language) {
    url.searchParams.set("lang", language);
    navigate(url.pathname + url.search + url.hash, { replace: true });
  }
}

// A pick storage refused to keep, and the pod's language when storage refused it.
let held: Language | null = null;
let podHeld: Language | null = null;

const POD_KEY = "jw.pod-language";

/**
 * The pod's language from the last /me, kept in this browser (dl-uukj.37) so a reload of / or
 * /play speaks it before /parent opens again. Every /me that answers rewrites it, so a pod whose
 * language changed shows on the next load; sign-out clears it.
 */
function podLanguageNow(storage: Storage = window.localStorage): Language | null {
  try {
    return known(storage.getItem(POD_KEY)) ?? podHeld;
  } catch {
    return podHeld;
  }
}

/** The pod's language, from the signed-in parent's /me; null when signed out. */
export function setPodLanguage(
  language: Language | null,
  storage: Storage = window.localStorage,
): void {
  if (language === podLanguageNow(storage)) return;
  podHeld = language;
  try {
    if (language === null) storage.removeItem(POD_KEY);
    else storage.setItem(POD_KEY, language);
  } catch {
    // Kept for this page only.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(CHANGE, listener);
  // Another tab's pick, or its /me.
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE, listener);
    window.removeEventListener("storage", listener);
  };
}

const snapshot = (): string => `${pickedLanguage.get() ?? held ?? ""}|${podLanguageNow() ?? ""}`;

/** The screens' language for this query, re-rendering when the pick or the pod's language moves. */
export function useScreenLanguage(query: URLSearchParams): Language {
  const [picked, pod] = useSyncExternalStore(subscribe, snapshot, snapshot).split("|");
  return screenLanguage({ query, picked: known(picked), pod: known(pod) });
}

/** Sets the page's <html lang> to `language`. */
export function useDocumentLang(language: Language): void {
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
}
