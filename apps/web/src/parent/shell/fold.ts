/**
 * Which side panels are folded, remembered per device (decision 2026-11-01-the-parent-app-is-a-
 * sidebar-shell-and-a-3-column-lesson-workspac, dl-xo0q, "default fold state"): the sidebar open,
 * the chat open, the details folded, until the parent folds or unfolds one. Kept in localStorage as
 * nav/language.ts keeps the language pick: a storage that refuses keeps the choice for this page
 * only, and another tab's choice arrives through the `storage` event.
 */

import { useCallback, useSyncExternalStore } from "react";

export type Panel = "sidebar" | "chat" | "details";

/** Each panel's state before the parent has chosen. */
export const OPEN_AT_FIRST: Readonly<Record<Panel, boolean>> = {
  sidebar: true,
  chat: true,
  details: false,
};

const key = (panel: Panel): string => `jw.parent.fold.${panel}`;
const CHANGE = "jw:fold";

// A choice storage refused to keep.
const held = new Map<Panel, boolean>();

export const folds = {
  /** Whether the panel is open: the kept choice, else the default. */
  open(panel: Panel, storage: Storage = window.localStorage): boolean {
    let stored: string | null = null;
    try {
      stored = storage.getItem(key(panel));
    } catch {
      // Storage refused: what this page held, if anything.
    }
    if (stored === "open") return true;
    if (stored === "folded") return false;
    return held.get(panel) ?? OPEN_AT_FIRST[panel];
  },
  set(panel: Panel, open: boolean, storage: Storage = window.localStorage): void {
    held.set(panel, open);
    try {
      storage.setItem(key(panel), open ? "open" : "folded");
    } catch {
      // Kept for this page only.
    }
    window.dispatchEvent(new Event(CHANGE));
  },
};

function subscribe(listener: () => void): () => void {
  window.addEventListener(CHANGE, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE, listener);
    window.removeEventListener("storage", listener);
  };
}

/** A panel's state and its setter, re-rendering when it moves here or in another tab. */
export function usePanel(panel: Panel): [open: boolean, setOpen: (open: boolean) => void] {
  const read = useCallback(() => folds.open(panel), [panel]);
  const open = useSyncExternalStore(subscribe, read, read);
  const setOpen = useCallback((next: boolean) => folds.set(panel, next), [panel]);
  return [open, setOpen];
}
