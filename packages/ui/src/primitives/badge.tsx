// shadcn/ui badge (radix-vega, shadcn@4.21.1), a label, not a control (dl-0ax3). The correct
// and try-again variants are the kid feedback colours (kids.css); red comes only from try-again, and
// there is no error variant of its own.
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
