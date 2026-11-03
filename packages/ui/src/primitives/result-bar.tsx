// A lesson's result as a bar (dl-uukj.47.67 S12, §6.9): 80 wide (64-96 through className) and 8
// high, its segments right, with help and not yet in the verdict hues, 2 px apart, then the caller's
// words ("6 z 8 dobrze") in tabular figures. This and the attempt review are the only adult places a verdict hue appears (S3).
import type { ReactElement } from "react";
import { cn } from "../lib/utils.ts";

const SEGMENTS = [
  ["right", "bg-jw-right-edge"],
  ["help", "bg-jw-help-edge"],
  ["miss", "bg-jw-miss-edge"],
] as const;

function ResultBar({
  right,
  help = 0,
  miss = 0,
  label,
  className,
}: {
  /** Questions right at once. */
  right: number;
  /** Right with help. */
  help?: number;
  /** Not yet right. */
  miss?: number;
  /** The result in words, from copy; a screen reader hears it, not the bar. */
  label: string;
  className?: string;
}): ReactElement {
  const counts = { right, help, miss };
  return (
    <span
      data-slot="result-bar"
      className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}
    >
      <span aria-hidden="true" className="flex h-2 w-20 gap-0.5">
        {SEGMENTS.filter(([k]) => counts[k] > 0).map(([k, bg]) => (
          <span
            key={k}
            data-segment={k}
            className={cn("h-full rounded-full", bg)}
            style={{ flexGrow: counts[k], flexBasis: 0 }}
          />
        ))}
      </span>
      <span className="text-jw-page-small text-foreground tabular-nums">{label}</span>
    </span>
  );
}

export { ResultBar };
