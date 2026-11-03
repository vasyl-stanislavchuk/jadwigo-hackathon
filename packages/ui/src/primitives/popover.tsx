// shadcn/ui popover (radix-ui), reshaped for the kid layer (dl-w3.37.16): a panel that opens beside
// its trigger, closes on Escape or a tap outside, and returns focus to the trigger. The chosen-gap
// menu in Gaps opens one. Sized and coloured from the tokens; no literal colour or size. On an app
// page it floats in the adult's look (handoff dl-uukj.47.67 §6.10): corners 8, the 1 px warm line and
// the soft shadow; a lesson's keeps Zeszyt's.
import { Popover as PopoverPrimitive } from "radix-ui";
import * as React from "react";
import { usePortalAudience } from "../lib/audience.ts";
import { useDensity } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";
import { FLOAT } from "./surface.ts";

function Popover(props: React.ComponentProps<typeof PopoverPrimitive.Root>): JSX.Element {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

// The trigger takes the ref Radix's Popper anchors to, and a caller's (dl-uukj.47.42): a plain
// function component drops a ref on React 18, so the popover had no anchor to measure.
const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(function PopoverTrigger(props, ref) {
  return <PopoverPrimitive.Trigger ref={ref} data-slot="popover-trigger" {...props} />;
});

function PopoverContent({
  className,
  align = "start",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>): JSX.Element {
  // A portal leaves the density's subtree, so the content carries it again (lib/register.tsx).
  const density = useDensity();
  // A lesson's popover (a gap's menu, a term) stays a child's inside an adult page (dl-uukj.47.67).
  const audience = usePortalAudience();
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        data-density={density}
        data-audience={audience}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "flex flex-col gap-2 p-2",
          audience === "adult"
            ? FLOAT
            : "z-50 rounded-2xl border-jw border-border bg-popover text-popover-foreground shadow-lg outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
