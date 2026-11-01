// shadcn/ui button (radix-vega, shadcn@4.21.1), reshaped for the kid layer (dl-0ax3): every
// size is at least --kid-tap-min, colours are ui-*, and the red and link variants are gone. Inside
// Zeszyt it draws no ring of its own: the keyboard's frame is foundation.css's (dl-uukj.29.59).
// size="control" is the 48 of a settings or navigation control, and the default variant is Zeszyt's
// action everywhere, not only under [data-lesson-theme] (dl-uukj.32.3). On an app page (the "app"
// register, dl-uukj.32.17) it focuses with the page's 3 px outline, 3 px out, instead of the soft
// ring; size="control" is the page body size, bold, 24 px in; and the outline variant is paper on
// Zeszyt's line. In a lesson, and outside any Page, it draws as before. In the parent's density
// (dl-xo0q) a disabled action is quiet with a 1 px dashed outline, never a silent grey: the screen
// writes the reason beside it. Its border is Zeszyt's line width, 2 px, and 1 px in that density.
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { PAGE_FOCUS, type Register, useRegister } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-3 rounded-lg border-jw border-transparent bg-clip-padding text-xl font-semibold whitespace-nowrap transition-all select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-7",
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
      // outline-none would set the outline's style to none, so the app's outline could not draw.
      register: {
        app: PAGE_FOCUS,
        lesson:
          "outline-none not-in-data-[lesson-theme=zeszyt]:focus-visible:ring-4 focus-visible:ring-ring/50",
      } satisfies Record<Register, string>,
    },
    compoundVariants: [
      { register: "app", size: "control", class: "px-6 text-jw-page-body font-bold" },
      { register: "app", variant: "outline", class: "border-jw-line bg-jw-card text-jw-ink" },
      // The parent's density: a control 34 high, 16 px in, and the quiet action's dashed outline.
      { register: "app", size: "control", class: "in-data-[density=parent]:px-4" },
      {
        register: "app",
        variant: "default",
        class:
          "in-data-[density=parent]:aria-disabled:border-dashed in-data-[density=parent]:aria-disabled:border-jw-ink-soft in-data-[density=parent]:disabled:border-dashed in-data-[density=parent]:disabled:border-jw-ink-soft",
      },
    ],
    defaultVariants: { variant: "default", size: "default", register: "lesson" },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  Omit<VariantProps<typeof buttonVariants>, "register"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  const register = useRegister();
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, register, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
