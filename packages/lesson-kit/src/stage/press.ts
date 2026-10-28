/**
 * The press instant for a control (blocks.md: `pointerdown`, not `click` — the release
 * delay is not the learner's time). A keyboard or screen-reader activation (Enter/Space on
 * a focused button, VoiceOver's activate) fires only `click`, with `detail === 0`; it is
 * stamped then, so every control stays operable without a pointer tap counting twice.
 * The handler learns which path fired: `click` for a pointer, `keyboard` for a focus
 * activation (blocks.md "The clock", modality).
 */

import type { Clock, Instant } from "./clock.ts";

export interface PressHandlers {
  onPointerDown(event: { button?: number }): void;
  onClick(event: { detail: number }): void;
}

export type PressModality = "click" | "keyboard";

export function press(
  clock: Clock,
  handler: (at: Instant, modality: PressModality) => void,
): PressHandlers {
  return {
    onPointerDown: (event) => {
      if (event.button === undefined || event.button === 0) handler(clock.now(), "click");
    },
    onClick: (event) => {
      if (event.detail === 0) handler(clock.now(), "keyboard");
    },
  };
}
