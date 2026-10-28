/**
 * Part: tap-tap, the equivalent of every drag (WCAG 2.5.7, docs/17 §2b). The learner taps a card
 * to pick it up and taps where it goes; tapping the picked card again puts it down. It works the
 * same from a keyboard, because every card and every place is a button. A drag that starts drops
 * whatever was picked, so the two ways never fight.
 */

import { type KeyboardEvent, useCallback, useState } from "react";

export interface TapPick {
  picked: string | null;
  /** Pick a card up, or put it down when it is already picked. */
  toggle(id: string): void;
  clear(): void;
}

export function useTapPick(): TapPick {
  const [picked, setPicked] = useState<string | null>(null);
  const toggle = useCallback((id: string) => setPicked((p) => (p === id ? null : id)), []);
  const clear = useCallback(() => setPicked(null), []);
  return { picked, toggle, clear };
}

/** The order after moving `id` to where `target` stands. */
export function moveTo(order: readonly string[], id: string, target: string): string[] {
  const from = order.indexOf(id);
  const to = order.indexOf(target);
  if (from < 0 || to < 0 || from === to) return [...order];
  const out = order.filter((x) => x !== id);
  out.splice(to, 0, id);
  return out;
}

/**
 * The arrow keys carry a card (lesson-frame/README.md §3, "Draggables"). With nothing picked they
 * walk the cards; with a card picked by a tap or a key they walk the places it can go, so a picked
 * card is taken along them and Enter or Space puts it down, as a tap does. ← and ↑ go back, → and ↓
 * on, in reading order, stopping at the ends. `targets` names the buttons walked now, inside `root`.
 * Returns whether the key was an arrow it took.
 */
export function walkByArrows(
  event: KeyboardEvent<HTMLElement>,
  root: HTMLElement | null,
  targets: string,
): boolean {
  const by =
    event.key === "ArrowLeft" || event.key === "ArrowUp"
      ? -1
      : event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : 0;
  if (by === 0 || root === null || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
    return false;
  const all = [...root.querySelectorAll<HTMLElement>(targets)].filter(
    (el) => el.getAttribute("aria-disabled") !== "true",
  );
  if (all.length === 0) return false;
  event.preventDefault();
  const at = all.indexOf(document.activeElement as HTMLElement);
  const next =
    at < 0
      ? all[by === 1 ? 0 : all.length - 1]
      : all[Math.min(all.length - 1, Math.max(0, at + by))];
  next?.focus();
  return true;
}
