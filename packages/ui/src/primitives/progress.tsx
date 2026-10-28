// shadcn/ui progress (radix-vega, shadcn@4.21.1): how far through the lesson, never a score
// (docs/17 §2, competence not points) (dl-0ax3).
import { Progress as ProgressPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "../lib/utils.ts";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn(
        "relative flex h-4 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 rounded-full bg-primary transition-transform duration-[var(--duration-slow)]"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
