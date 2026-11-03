// A key cap (handoff dl-uukj.47.67 §6.10): a shortcut named in a tooltip or a menu row. Mono, 500,
// on the quiet fill with the warm line, corners 4.
import type * as React from "react";
import { cn } from "../lib/utils.ts";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">): JSX.Element {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-jw-small border border-border bg-muted px-1 font-mono text-xs font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
