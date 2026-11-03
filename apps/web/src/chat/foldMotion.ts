/**
 * The turn-end fold (handoff dl-uukj.47.71 §6): when a turn ends, its spine card folds to the
 * summary row over 240 ms ease-out, anchored to its top. The row's content swaps at once (TurnSpine
 * to TurnSummary); this holds the row at the card's last height for one frame and lets it shrink to
 * the summary's. Under prefers-reduced-motion it does nothing: the row is the summary at once.
 */
import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";

/** How long the card takes to fold to its summary row (§6). */
export const FOLD_MS = 240;

const reduced = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

function settle(el: HTMLElement): void {
  el.style.removeProperty("height");
  el.style.removeProperty("overflow");
  el.style.removeProperty("transition");
}

/** A ref for a turn's row; its height eases from the card's to the summary's when `done` turns true. */
export function useFoldAtEnd<T extends HTMLElement>(done: boolean): RefObject<T> {
  const ref = useRef<T>(null);
  const was = useRef<{ done: boolean; height: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  // Every render: the elapsed clock re-renders each second, and a re-render mid-fold leaves it be.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const before = was.current;
    const height = el.offsetHeight;
    was.current = { done, height };
    if (!done || before === null || before.done || reduced()) return;
    if (before.height <= height) return;
    el.style.overflow = "hidden";
    el.style.height = `${before.height}px`;
    void el.offsetHeight; // the browser takes the held height before it eases
    el.style.transition = `height ${FOLD_MS}ms var(--jw-ease-out)`;
    el.style.height = `${height}px`;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => settle(el), FOLD_MS + 40);
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return ref;
}
