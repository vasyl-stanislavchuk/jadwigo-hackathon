/**
 * The events a Keypad sends (one onset rule for both inputs): a digit, Backspace and Enter, from
 * a keypad pointerdown or a hardware key. Moved from production/logic.ts when the Keypad became a
 * part (dl-0ax3.2).
 */

import type { Instant } from "../stage/clock.ts";

export type ComposerEvent =
  | { type: "digit"; digit: string; at: Instant; source: "click" | "keyboard" }
  | { type: "backspace" }
  | { type: "enter" };

const CONTROLS = new Set(["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"]);

/** True when a key event comes from a focused control, which owns its own Enter. */
export function onControl(target: EventTarget | null): boolean {
  const tag = (target as { tagName?: string } | null)?.tagName;
  return tag !== undefined && CONTROLS.has(tag);
}

/**
 * Map a hardware key to a composer event, or null for keys the block ignores. Enter on a
 * focused control is that control's (keyboard move-on, a focused keypad key); digits and
 * Backspace always compose.
 */
export function keyEvent(key: string, at: Instant, fromControl = false): ComposerEvent | null {
  if (/^[0-9]$/.test(key)) return { type: "digit", digit: key, at, source: "keyboard" };
  if (key === "Backspace") return { type: "backspace" };
  if (key === "Enter" && !fromControl) return { type: "enter" };
  return null;
}
