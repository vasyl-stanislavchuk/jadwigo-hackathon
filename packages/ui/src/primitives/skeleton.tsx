// A skeleton bar (dl-uukj.47.67 S18, §6.10): a stone bar the caller sizes to the real row, with a slow
// 1.6 s pulse under motion-safe only. It shows only once `delay` (300 ms) has passed, so a fast load
// never flashes it. Decorative: the list says it is loading.
import { type ReactElement, useEffect, useState } from "react";
import { cn } from "../lib/utils.ts";

function Skeleton({
  delay = 300,
  className,
}: {
  /** How long to wait before showing, in ms. */
  delay?: number;
  className?: string;
}): ReactElement | null {
  const [shown, setShown] = useState(delay <= 0);
  useEffect(() => {
    if (delay <= 0) return;
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  if (!shown) return null;
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "h-4 rounded-jw-small bg-jw-skeleton motion-safe:animate-pulse motion-safe:[animation-duration:1.6s]",
        className,
      )}
    />
  );
}

export { Skeleton };
