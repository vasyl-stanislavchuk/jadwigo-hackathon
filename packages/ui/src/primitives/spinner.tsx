// shadcn/ui spinner (shadcn@4.21.1 registry "spinner"), reshaped for the kid layer (dl-0ax3): kid
// size by default, the accent colour, and it holds still for prefers-reduced-motion. Its label is
// the page's own copy ("Chwileczkę…"), so a screen reader hears the drill language.
import { Loader2Icon } from "lucide-react";
import type * as React from "react";
import { cn } from "../lib/utils.ts";

function Spinner({ className, label, ...props }: React.ComponentProps<"svg"> & { label: string }) {
  return (
    <Loader2Icon
      role="status"
      aria-label={label}
      data-slot="spinner"
      className={cn("size-12 text-primary motion-safe:animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
