// shadcn/ui toggle (radix-vega, shadcn@4.21.1), reshaped for the kid layer (dl-0ax3): at least
// --kid-tap-min, ui-* colours. "On" means chosen, not right: it is the accent tint with a primary
// border, never green (green is kept for a correct answer).
import { cva, type VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "../lib/utils.ts";

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-2 rounded-lg border-2 text-xl font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow] outline-none select-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-7",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground",
        ghost: "border-transparent bg-transparent text-foreground",
      },
      size: {
        default: "min-h-kid-tap min-w-kid-tap px-5",
        key: "min-h-kid-key min-w-kid-key px-6 text-kid-answer",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
