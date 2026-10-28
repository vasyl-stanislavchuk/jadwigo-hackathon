/**
 * The keyboard's frame follows the keyboard (paper-behaviour/README.md §2: "never after a tap or
 * click"). A browser's :focus-visible already leaves it off after a tap on the control itself. But
 * when a tap removes the control that held the focus ("Zaczynamy!" opening the step, Sprawdź giving
 * way to Dalej) and the app then moves the focus by code, Chrome has no focused element to judge by
 * and shows it. So the document keeps the last kind of input: a pointer sets data-input='pointer'
 * on the root, a key clears it, and styles/foundation.css draws no focus while it is set.
 *
 * A modifier alone, or a shortcut held with Cmd, Ctrl or Alt, is no keyboard use of the page.
 */

const MODIFIERS = new Set(["Meta", "Control", "Alt", "Shift", "CapsLock"]);

/** Whether a key press means the child is on the keyboard now. */
export function isKeyboardUse(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey">,
): boolean {
  return !MODIFIERS.has(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey;
}

let installed = false;

export function installKeyboardFocus(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  const root = document.documentElement;
  document.addEventListener("pointerdown", () => root.setAttribute("data-input", "pointer"), true);
  document.addEventListener(
    "keydown",
    (event) => {
      if (isKeyboardUse(event)) root.removeAttribute("data-input");
    },
    true,
  );
}

/**
 * Where ↑ and ↓ take the keyboard in an open list (a chosen gap's menu, Slots addendum 2.2): from
 * nothing (-1, the list just opened with no option focused) ↓ goes to the first option and ↑ to the
 * last; from an option, to its neighbour, stopping at the ends. Home and End go to the ends. Any
 * other key: null, the list does nothing with it. The outline it draws shows on :focus-visible
 * only, so a tap never leaves one (styles/foundation.css, [data-menu-option]).
 */
export function listMove(key: string, at: number, count: number): number | null {
  if (count === 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowDown") return at < 0 ? 0 : Math.min(count - 1, at + 1);
  if (key === "ArrowUp") return at < 0 ? count - 1 : Math.max(0, at - 1);
  return null;
}
