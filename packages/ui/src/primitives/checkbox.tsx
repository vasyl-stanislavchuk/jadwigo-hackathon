// shadcn/ui checkbox (radix-ui), the adult's (handoff dl-uukj.47.67 §6.3): a 16 px box, corners 4, on
// the control's edge; checked, the ink with a white check; indeterminate, a minus. Space toggles it.
// The row it sits in (a label, a facet's line) is the target; it is not a lesson option, which
// lesson-kit draws itself.
import { CheckIcon, MinusIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "../lib/utils.ts";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot="checkbox"
      data-plain
      className={cn(
        "peer grid size-4 shrink-0 place-items-center rounded-jw-small border border-control-edge bg-background text-primary-foreground outline-none transition-colors duration-jw-fast disabled:cursor-not-allowed disabled:border-border disabled:bg-muted data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-items-center [&_svg]:size-3.5">
        {props.checked === "indeterminate" ? (
          <MinusIcon aria-hidden="true" strokeWidth={3} />
        ) : (
          <CheckIcon aria-hidden="true" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});

export { Checkbox };
