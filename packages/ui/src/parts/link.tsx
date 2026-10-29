// A link on an app page (dl-uukj.32.3), as the export's LinkButton: bold, the soft ink, a 2 px
// underline 4 px below; a hover darkens the ink and thickens the line. No fill, no movement.
// asChild hands the look to the app's own router link (NavLink).
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps, ReactElement } from "react";
import { cn } from "../lib/utils.ts";
import { FOCUS } from "../primitives/choice.ts";

const linkVariants = cva(
  [
    "rounded-jw-small font-bold text-jw-ink-soft underline decoration-2 underline-offset-4 transition-[color,text-decoration-thickness] duration-jw-fast hover:text-jw-ink hover:decoration-3",
    FOCUS,
  ],
  {
    variants: {
      size: {
        body: "text-jw-body",
        small: "text-jw-small",
      },
    },
    defaultVariants: { size: "body" },
  },
);

function Link({
  className,
  size = "body",
  asChild = false,
  ...props
}: ComponentProps<"a"> & VariantProps<typeof linkVariants> & { asChild?: boolean }): ReactElement {
  const Comp = asChild ? Slot.Root : "a";
  return (
    <Comp
      data-slot="link"
      data-size={size}
      className={cn(linkVariants({ size }), className)}
      {...props}
    />
  );
}

export { Link, linkVariants };
