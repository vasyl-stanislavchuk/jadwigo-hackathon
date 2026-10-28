// shadcn/ui popover (radix-ui), reshaped for the kid layer (dl-w3.37.16): a panel that opens beside
// its trigger, closes on Escape or a tap outside, and returns focus to the trigger. The chosen-gap
// menu in Gaps opens one. Sized and coloured from the tokens; no literal colour or size.
import { Popover as PopoverPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "../lib/utils.ts";

function Popover(props: React.ComponentProps<typeof PopoverPrimitive.Root>): JSX.Element {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>): JSX.Element {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "start",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>): JSX.Element {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 flex flex-col gap-2 rounded-2xl border-2 border-border bg-popover p-2 text-popover-foreground shadow-lg outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
