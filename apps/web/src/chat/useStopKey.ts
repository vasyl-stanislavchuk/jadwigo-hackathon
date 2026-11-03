/**
 * Esc stops a running turn from anywhere in the chat (handoff dl-uukj.47.71 S6, §3): the composer
 * mounts it on its box, the thread on its root (lane B). It stands aside when something else owns
 * the key: a menu, a listbox or a dialog that is open (Dla's list, the lesson preview), or a handler
 * that already took it (Radix's dismissable layers mark the event as handled).
 */

import { type RefObject, useEffect, useRef } from "react";

/** An open layer that owns Esc: the menu, list or dialog closes, the turn keeps running. */
const OPEN_LAYER = ["dialog", "alertdialog", "menu", "listbox"]
  .map((role) => `[role="${role}"]:not([data-state="closed"]):not([hidden])`)
  .join(", ");

export interface StopKey {
  /** A turn is running: only then does Esc stop. */
  running: boolean;
  /** The stop is on its way: a second Esc sends nothing. */
  stopping: boolean;
  onStop(): void;
}

/** Whether this Esc is the chat's to take. */
function isStopKey(event: KeyboardEvent, doc: Document = document): boolean {
  if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return false;
  return doc.querySelector(OPEN_LAYER) === null;
}

export function useStopKey(root: RefObject<HTMLElement | null>, stop: StopKey): void {
  // The latest values, so the listener stays mounted once and never reads a stale turn.
  const latest = useRef(stop);
  latest.current = stop;
  useEffect(() => {
    const el = root.current;
    if (el === null) return;
    const onKey = (event: KeyboardEvent) => {
      const { running, stopping, onStop } = latest.current;
      if (!running || stopping || !isStopKey(event, el.ownerDocument)) return;
      event.preventDefault();
      onStop();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [root]);
}
