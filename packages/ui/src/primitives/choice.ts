// What the settings controls share (radio-group, segmented-control, tabs, side-menu): one choice,
// the two sizes of decision dl-og82, and the quiet hover and legend they all wear. Promoted from
// apps/web's System page (playground/views/system/settings.tsx) in dl-uukj.32.3.
import type { ReactNode } from "react";

export interface Choice {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  /** A second line under the label: "Na papierze", "7–8 lat". The adult's controls draw it. */
  hint?: ReactNode;
}

/**
 * A settings or navigation control is 48 (md, --jw-control-height); 44 (sm) in a toolbar or a
 * sub-row. A lesson answer keeps --kid-tap-min (56) and never takes these.
 */
export type ControlSize = "md" | "sm";

/** The row height of each size: --jw-control-height and --jw-control-height-sm. */
export const ROW: Record<ControlSize, string> = {
  md: "min-h-jw-control text-jw-body",
  sm: "min-h-jw-control-sm text-jw-small",
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

/**
 * The adult audience's segmented look (handoff dl-uukj.47.67 §6.7): a stone track, the chosen
 * segment white on the warm 1 px line. SegmentedControl and ToggleGroup's "segment" variant share it.
 */
export const ADULT_TRACK = "inline-flex items-center gap-0.5 rounded-jw-control bg-muted p-0.5";
export const ADULT_SEGMENT =
  "flex min-h-jw-control-sm items-center justify-center gap-1.5 rounded-jw-small px-3 text-jw-page-body font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors duration-jw-fast hover:text-foreground data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:ring-1 data-[state=checked]:ring-border data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:ring-1 data-[state=on]:ring-border";

/** An adult's 16 px radio ring: the control's edge, the ink ring and an 8 px dot when chosen. */
export const ADULT_RADIO =
  "relative grid size-4 shrink-0 place-items-center rounded-full border border-control-edge bg-background outline-none data-[state=checked]:border-primary";
export const ADULT_RADIO_DOT = "size-2 rounded-full bg-primary";
