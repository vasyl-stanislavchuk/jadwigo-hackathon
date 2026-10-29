// What the settings controls share (radio-group, segmented-control, tabs, side-menu): one choice,
// the two sizes of decision dl-og82, and the quiet hover and legend they all wear. Promoted from
// apps/web's System page (playground/views/system/settings.tsx) in dl-uukj.32.3.
import type { ReactNode } from "react";

export interface Choice {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
}

/**
 * A settings or navigation control is 48 (md, --jw-control-height); 44 (sm) in a toolbar or a
 * sub-row. A lesson answer keeps --kid-tap-min (56) and never takes these.
 */
export type ControlSize = "md" | "sm";

/** The row height of each size. sm is Tailwind's 2.75rem until 44 has a token of its own. */
export const ROW: Record<ControlSize, string> = {
  md: "min-h-jw-control text-jw-body",
  sm: "min-h-11 text-jw-small",
};

/** A legend over a group of choices. */
export const LEGEND = "pb-2 text-jw-body font-bold text-jw-ink-soft";

/** Hover on a mouse is a quiet fill. */
export const HOVER = "transition-colors duration-jw-fast hover:bg-jw-act-quiet";

/**
 * The keyboard's frame, as foundation.css draws it on a lesson surface: a 3 px outline of the focus
 * ink, 2 px out. An app page has no lesson rules, so the control carries it.
 */
export const FOCUS =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-jw-focus";
