// A link on an app page (dl-uukj.32.3), as the export's LinkButton: bold, the soft ink, a 2 px
// underline 4 px below; a hover darkens the ink and thickens the line. No fill, no movement.
// asChild hands the look to the app's own router link (NavLink). On an app page (dl-uukj.32.17)
// size body is the page body size; small stays small.
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps, ReactElement } from "react";
import { type Register, useRegister } from "../lib/register.tsx";
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
      register: { app: "", lesson: "" } satisfies Record<Register, string>,
    },
    compoundVariants: [{ register: "app", size: "body", class: "text-jw-page-body" }],
    defaultVariants: { size: "body", register: "lesson" },
  },
);

function Link({
  className,
  size = "body",
  asChild = false,
  ...props
}: ComponentProps<"a"> &
  Omit<VariantProps<typeof linkVariants>, "register"> & { asChild?: boolean }): ReactElement {
  const Comp = asChild ? Slot.Root : "a";
  const register = useRegister();
  return (
    <Comp
      data-slot="link"
      data-size={size}
      className={cn(linkVariants({ size, register }), className)}
      {...props}
    />
  );
}

export { Link, linkVariants };
