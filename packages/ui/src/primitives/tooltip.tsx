// shadcn/ui tooltip (radix-ui) in the popover's look, small (handoff dl-uukj.47.67 D16, §6.10): white,
// the warm 1 px line, the floating shadow, corners 6, 12/500 ink, no arrow, open after 400 ms. It names
// an icon, shows a shortcut as a Kbd, or gives a disabled control's reason (DisabledReason). Never on a
// table cell or an option. Each Tooltip brings its own provider, so a screen needs no wrapper.
import { Tooltip as TooltipPrimitive } from "radix-ui";
import * as React from "react";
import { usePortalAudience } from "../lib/audience.ts";
import { useDensity } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";
import { Kbd } from "./kbd.tsx";

function Tooltip({
  delayDuration = 400,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>): JSX.Element {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipPrimitive.Provider>
  );
}

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(function TooltipTrigger(props, ref) {
  return <TooltipPrimitive.Trigger ref={ref} data-slot="tooltip-trigger" {...props} />;
});

function TooltipContent({
  className,
  sideOffset = 6,
  shortcut,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  /** A key that does the same, drawn as a Kbd after the words. */
  shortcut?: string;
}): JSX.Element {
  const density = useDensity();
  const audience = usePortalAudience();
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        data-density={density}
        data-audience={audience}
        sideOffset={sideOffset}
        className={cn(
          "z-50 flex max-w-xs items-center gap-2 rounded-jw-control border border-border bg-popover px-2 py-1.5 text-xs font-medium text-popover-foreground shadow-float",
          className,
        )}
        {...props}
      >
        {children}
        {shortcut !== undefined && <Kbd>{shortcut}</Kbd>}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipTrigger };
