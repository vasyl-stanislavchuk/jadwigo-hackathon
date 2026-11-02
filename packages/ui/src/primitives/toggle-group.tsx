// shadcn/ui toggle-group (radix-vega, shadcn@4.21.1), for Tak/Nie and other one-of choices
// (dl-0ax3). Items take the kid-sized toggle; the gap is --kid-choice-gap, and joined
// (segmented) groups are dropped: separate targets are easier to hit. Two adult looks (handoff
// dl-uukj.47.67 §6.7, S11), for the parent's screens only: kind="segment" is the segmented control
// (2–4 short views on a stone track, the chosen one white on the warm line), and kind="rating" the
// labelled rating group (Za łatwa · W sam raz · Za trudna, the pick's fill when chosen). Name the
// group with aria-label; each item says its meaning in words.
import type { VariantProps } from "class-variance-authority";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "../lib/utils.ts";
import { ADULT_SEGMENT, ADULT_TRACK } from "./choice.ts";
import { toggleVariants } from "./toggle.tsx";

type Kind = "kid" | "segment" | "rating";

type ToggleGroupContextValue = VariantProps<typeof toggleVariants> & {
  orientation?: "horizontal" | "vertical";
  kind?: Kind;
};

const ROOT: Record<Kind, string> = {
  kid: "group/toggle-group flex w-fit flex-row flex-wrap items-center gap-kid-choice data-vertical:flex-col data-vertical:items-stretch",
  segment: ADULT_TRACK,
  rating: "inline-flex flex-wrap items-center gap-2",
};

const RATING =
  "inline-flex min-h-jw-control items-center justify-center gap-1.5 rounded-jw-control border border-input bg-background px-3 text-jw-page-body font-medium whitespace-nowrap text-foreground outline-none transition-colors duration-jw-fast hover:bg-muted data-[state=on]:border-selected-edge data-[state=on]:bg-selected data-[state=on]:text-selected-foreground";

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: "default",
  variant: "default",
  orientation: "horizontal",
  kind: "kid",
});

function ToggleGroup({
  className,
  variant,
  size,
  orientation = "horizontal",
  kind = "kid",
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & ToggleGroupContextValue) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-orientation={orientation}
      data-kind={kind}
      orientation={orientation}
      className={cn(ROOT[kind], className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, orientation, kind }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      className={cn(
        "shrink-0 focus:z-10 focus-visible:z-10",
        context.kind === "segment"
          ? ADULT_SEGMENT
          : context.kind === "rating"
            ? RATING
            : toggleVariants({ variant: context.variant || variant, size: context.size || size }),
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
