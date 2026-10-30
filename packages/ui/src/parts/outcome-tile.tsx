// One outcome as a tile (dl-uukj.32.3): a 40 px square (32 in a legend) with an icon and a tone, so
// it reads without colour too. The right's tone is the kid green, the miss's the kid red; plain is
// paper. It carries data-outcome, never data-tile: 11 lesson rules in foundation.css style
// [data-tile]. It always has a name: without asChild it is an image with that name; asChild hands
// the tile and the name to a link (the app's NavLink), which takes the icon and keeps its own
// children after it. It was made for the parent's overview (its heatmap and legend).
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { cn } from "../lib/utils.ts";

const outcomeTileVariants = cva(
  "relative flex shrink-0 items-center justify-center rounded-jw-small border-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      tone: {
        right: "border-kid-correct bg-kid-correct-soft text-kid-correct-ink",
        miss: "border-kid-try-again bg-kid-try-again-soft text-kid-try-again-ink",
        plain: "border-jw-line bg-jw-card text-jw-ink",
      },
      size: {
        md: "size-10",
        sm: "size-8",
      },
    },
    defaultVariants: { tone: "plain", size: "md" },
  },
);

type Tone = "right" | "miss" | "plain";

function OutcomeTile({
  tone,
  outcome,
  icon,
  label,
  size = "md",
  asChild = false,
  className,
  children,
  ...props
}: Omit<ComponentProps<"span">, "role"> &
  VariantProps<typeof outcomeTileVariants> & {
    tone: Tone;
    /** The caller's own outcome name (first_try, not_yet); the tone when absent. */
    outcome?: string;
    icon: ReactNode;
    /** The tile's name, always: the question and its outcome. A tile is never colour and an icon alone. */
    label: string;
    asChild?: boolean;
  }): ReactElement {
  const Comp = asChild ? Slot.Root : "span";
  const image = asChild ? {} : { role: "img" };
  return (
    <Comp
      data-slot="outcome-tile"
      data-outcome={outcome ?? tone}
      className={cn(outcomeTileVariants({ tone, size }), className)}
      aria-label={label}
      {...image}
      {...props}
    >
      {icon}
      <Slot.Slottable>{children}</Slot.Slottable>
    </Comp>
  );
}

export { OutcomeTile };
