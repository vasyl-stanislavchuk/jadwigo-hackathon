// shadcn/ui button (radix-vega, shadcn@4.21.1), reshaped for the kid layer (dl-0ax3): every
// size is at least --kid-tap-min, colours are ui-*, and the red and link variants are gone. Inside
// Zeszyt it draws no ring of its own: the keyboard's frame is foundation.css's (dl-uukj.29.59).
// size="control" is the 48 of a settings or navigation control, and the default variant is Zeszyt's
// action everywhere, not only under [data-lesson-theme] (dl-uukj.32.3).
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "../lib/utils.ts";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-3 rounded-lg border-2 border-transparent bg-clip-padding text-xl font-semibold whitespace-nowrap transition-all outline-none select-none not-in-data-[lesson-theme=zeszyt]:focus-visible:ring-4 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-7",
  {
    variants: {
      variant: {
        // The action (dl-uukj.32.3): the one thing to press, blue ink standing on its darker edge, as
        // foundation.css draws it on a lesson surface. It fills to its edge (no pale ring from the
        // transparent border). Disabled, native or aria, it goes quiet: paper with no edge, at full
        // opacity outside a lesson. In a lesson foundation.css's unlayered rules still decide, so a
        // natively disabled action there keeps its 50% as before. Hover and press stay lesson
        // behaviour.
        default:
          "bg-jw-act bg-clip-border font-bold text-jw-on-act shadow-jw-act aria-disabled:bg-jw-act-quiet aria-disabled:text-jw-on-act-quiet aria-disabled:shadow-none aria-disabled:opacity-100 disabled:bg-jw-act-quiet disabled:text-jw-on-act-quiet disabled:shadow-none not-in-data-[lesson-theme=zeszyt]:disabled:opacity-100",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
        outline: "border-border bg-background text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
      },
      size: {
        default: "min-h-kid-tap min-w-kid-tap px-5",
        commit: "min-h-kid-commit min-w-kid-commit px-8",
        icon: "min-h-kid-tap min-w-kid-tap",
        // A settings or navigation control on an app page: 48 (--jw-control-height, dl-og82), at the
        // body size. A lesson keeps the kid sizes above.
        control:
          "min-h-jw-control min-w-jw-control px-5 text-jw-body [&_svg:not([class*='size-'])]:size-5",
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
