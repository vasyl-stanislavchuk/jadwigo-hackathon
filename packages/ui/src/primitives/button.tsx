// shadcn/ui button (radix-vega, shadcn@4.21.1), the one Button of both audiences (dl-uukj.47.67 S6:
// it replaces apps/web/src/chat/button.tsx too).
//
// A child's (the "lesson" register, and every kid subtree): reshaped for the kid layer (dl-0ax3), every
// size at least --kid-tap-min, the default variant Zeszyt's action on its pressed edge, and no ring of
// its own inside Zeszyt: the keyboard's frame is foundation.css's (dl-uukj.29.59).
//
// An adult's (the "app" register, under <html data-audience="adult">, handoff §6.1): flat (the adult
// block sets the press to 0, D4: no edge, no lift, no press move), the default variant the primary, ink
// blue with white text and a darker ink under the mouse (D5), outline on the field edge, ghost and
// secondary on stone, quiet for Archiwizuj (never red, S3), link for navigation inside text. Sizes sm 28,
// control 34 in the parent's density (48 outside it), lg 40 for sign-in, icon square. Disabled is a
// quiet fill and the soft ink at full opacity; the screen says why beside it or in a tooltip (S5).
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { PAGE_FOCUS, type Register, useRegister } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-3 rounded-jw-control border-jw border-transparent bg-clip-padding text-xl font-semibold whitespace-nowrap transition-all select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-7",
  {
    variants: {
      variant: {
        // The action (dl-uukj.32.3): the one thing to press. In a lesson, blue ink standing on its
        // darker edge, as foundation.css draws it; in the adult audience, the flat ink primary. It
        // fills to its edge (no pale ring from the transparent border). Disabled, native or aria, it
        // goes quiet at full opacity outside a lesson. In a lesson foundation.css's unlayered rules
        // still decide, so a natively disabled action there keeps its 50% as before.
        default:
          "bg-jw-act bg-clip-border font-bold text-jw-on-act shadow-jw-act aria-disabled:bg-jw-act-quiet aria-disabled:text-jw-on-act-quiet aria-disabled:shadow-none aria-disabled:opacity-100 disabled:bg-jw-act-quiet disabled:text-jw-on-act-quiet disabled:shadow-none not-in-data-[lesson-theme=zeszyt]:disabled:opacity-100",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
        outline: "border-border bg-background text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        // Archiwizuj and its kind: quiet ink with its icon, never red (S3).
        quiet: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        // Navigation inside text only.
        link: "min-h-auto min-w-auto border-0 bg-transparent px-0 text-link underline underline-offset-3 hover:text-jw-pick-ink",
      },
      size: {
        default: "min-h-kid-tap min-w-kid-tap px-5",
        commit: "min-h-kid-commit min-w-kid-commit px-8",
        icon: "min-h-kid-tap min-w-kid-tap",
        // A settings or navigation control on an app page: 48 (--jw-control-height, dl-og82), 34 in
        // the parent's density, at the body size. A lesson keeps the kid sizes above.
        control:
          "min-h-jw-control min-w-jw-control px-5 text-jw-body [&_svg:not([class*='size-'])]:size-5",
        // The adult's small (a pager, a chip's inner button, a table's toolbar) and large (sign-in).
        sm: "min-h-jw-control-sm min-w-jw-control-sm gap-1.5 px-2.5 text-jw-page-small [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-jw-control-lg min-w-jw-control-lg px-5 text-jw-page-body [&_svg:not([class*='size-'])]:size-4",
      },
      // outline-none would set the outline's style to none, so the app's outline could not draw.
      register: {
        app: PAGE_FOCUS,
        lesson:
          "outline-none active:translate-y-px not-in-data-[lesson-theme=zeszyt]:focus-visible:ring-4 focus-visible:ring-ring/50",
      } satisfies Record<Register, string>,
    },
    compoundVariants: [
      { register: "app", size: "control", class: "px-6 text-jw-page-body font-bold" },
      { register: "app", variant: "outline", class: "border-jw-line bg-jw-card text-jw-ink" },
      // The parent's density: a control 34 high, 12 px in.
      { register: "app", size: "control", class: "in-data-[density=parent]:px-3" },
      // The adult audience's own: labels at 500, icons 16, fields' warmer edge on an outline, hover
      // only changes a colour (D4), and the primary darkens under the mouse (D5).
      {
        register: "app",
        class:
          "in-data-[audience=adult]:gap-2 in-data-[audience=adult]:font-medium in-data-[audience=adult]:transition-colors in-data-[audience=adult]:duration-jw-fast in-data-[audience=adult]:[&_svg:not([class*='size-'])]:size-4",
      },
      {
        register: "app",
        variant: "default",
        class:
          "in-data-[audience=adult]:hover:bg-jw-act-hover in-data-[audience=adult]:aria-disabled:hover:bg-jw-act-quiet",
      },
      {
        register: "app",
        variant: "secondary",
        class: "in-data-[audience=adult]:hover:bg-hover-strong",
      },
      {
        register: "app",
        variant: "outline",
        class: "in-data-[audience=adult]:border-input in-data-[audience=adult]:hover:bg-muted",
      },
    ],
    defaultVariants: { variant: "default", size: "default", register: "lesson" },
  },
);

type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  Omit<VariantProps<typeof buttonVariants>, "register"> & { asChild?: boolean };

// It takes a ref (dl-uukj.47.46): a Radix trigger built with asChild around it (PopoverTrigger,
// DropdownMenuTrigger) passes one through Slot, and on React 18 a plain function component drops
// it, so the popover never measures its anchor and stays unplaced.
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  const register = useRegister();
  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, register, className }))}
      {...props}
    />
  );
});

export { Button, buttonVariants };
