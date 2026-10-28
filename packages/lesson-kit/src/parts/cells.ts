/**
 * Part: the classes for a native tap cell (dl-0ax3.2), at least 56 × 56 (--kid-tap-min). A cell
 * takes CELL plus one background: CELL_IDLE or an accent. pattern and spatial draw with them.
 */

export const CELL =
  "min-w-[var(--kid-tap-min)] min-h-[var(--kid-tap-min)] rounded-lg border border-border flex flex-col items-center justify-center select-none";

export const CELL_IDLE = "bg-card";
