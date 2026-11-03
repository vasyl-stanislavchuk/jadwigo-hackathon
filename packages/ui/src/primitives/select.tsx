// shadcn/ui select (radix-ui), for one pick from a long, rarely changed list (handoff dl-uukj.47.67
// §6.4, S7: Język lekcji). The trigger is the adult's field with a chevron; the list floats in the
// menu's look with a check on the pick. Radix: Space or Enter opens it, arrows move, a typed letter
// jumps, Enter picks, Esc closes and gives the focus back to the trigger. Words come from the caller.
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import * as React from "react";
import { usePortalAudience } from "../lib/audience.ts";
import { useDensity } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";
import { ADULT_FIELD } from "./input.tsx";
import { MENU_CHOICE, MENU_CONTENT } from "./surface.ts";

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>): JSX.Element {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>): JSX.Element {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(function SelectTrigger({ className, children, ...props }, ref) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      data-slot="select-trigger"
      className={cn(
        ADULT_FIELD,
        "flex min-h-jw-control items-center justify-between gap-2 text-left data-placeholder:text-placeholder [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon aria-hidden="true" className="text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>): JSX.Element {
  const density = useDensity();
  const audience = usePortalAudience();
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        data-density={density}
        data-audience={audience}
        position={position}
        sideOffset={4}
        className={cn(
          MENU_CONTENT,
          "max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width)",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>): JSX.Element {
  return (
    <SelectPrimitive.Item data-slot="select-item" className={cn(MENU_CHOICE, className)} {...props}>
      <span className="pointer-events-none absolute left-2 flex items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
