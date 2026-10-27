// shadcn/ui input (radix-vega, shadcn@4.21.1), for one typed number (dl-0ax3): at least
// --kid-tap-min high, answer-sized digits. aria-invalid (a refused character, never a graded
// answer) shows the primary ring, not the try-again red, because red only ever marks a miss
// (dl-uukj.29.16).
import type * as React from "react";
import { cn } from "../lib/utils.ts";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-[var(--kid-tap-min)] w-full rounded-lg border-2 border-input bg-background px-4 text-kid-answer font-semibold text-foreground tabular-nums transition-[color,border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-primary aria-invalid:ring-4 aria-invalid:ring-primary/30",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
