// shadcn/ui badge (radix-vega, shadcn@4.21.1), a label, not a control (dl-0ax3). The correct
// and try-again variants are the kid feedback colours (kids.css); red comes only from try-again, and
// there is no error variant of its own.
//
// The adult kit's two (dl-uukj.47.67 §6.8): count, a stone pill in 11.5 / 500 muted ink (a number in
// the sidebar, on a facet), and tag, a 1 px outline on the warm line at radius 4 ("klasa 3"). Both
// set their own size, so the kid variants above keep theirs.
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "../lib/utils.ts";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border-2 border-transparent px-3 py-1 text-base font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        correct: "bg-kid-correct-soft text-kid-correct-ink",
        "try-again": "bg-kid-try-again-soft text-kid-try-again-ink",
        count:
          "min-w-5 border-0 bg-muted px-1.5 py-0.5 text-jw-page-micro leading-4 font-medium text-muted-foreground tabular-nums",
        tag: "rounded-jw-small border border-border px-1.5 py-0.5 text-jw-page-small leading-4.5 font-medium text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
