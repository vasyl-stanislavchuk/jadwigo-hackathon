// shadcn/ui button (radix-vega, shadcn@4.21.1), reshaped for the kid layer (dl-0ax3): every
// size is at least --kid-tap-min, colours are ui-*, and the red and link variants are gone. Inside
// Zeszyt it draws no ring of its own: the keyboard's frame is foundation.css's (dl-uukj.29.59).
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "../lib/utils.ts";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-3 rounded-lg border-2 border-transparent bg-clip-padding text-xl font-semibold whitespace-nowrap transition-all outline-none select-none not-in-data-[lesson-theme=zeszyt]:focus-visible:ring-4 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-7",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground font-bold hover:bg-primary/85",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
        outline: "border-border bg-background text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
      },
      size: {
        default: "min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)] px-5",
        commit: "min-h-[var(--kid-commit-height)] min-w-[var(--kid-commit-height)] px-8",
        icon: "min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
