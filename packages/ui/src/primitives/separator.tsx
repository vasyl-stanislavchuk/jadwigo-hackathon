// shadcn/ui separator over radix-ui's Separator: a 1 px rule on the line role, across or down,
// decorative unless told otherwise (a screen reader skips it). With a `label` it is the chat's day
// divider (handoff dl-uukj.47.71 §9): the words centred between two rules, in the small muted line
// ("Wczoraj", "Dziś"). The words are read as text; a separator that is not decorative is
// named by them as well.
import { Separator as SeparatorPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "../lib/utils.ts";

const RULE =
  "shrink-0 bg-jw-line data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px";

type SeparatorProps = React.ComponentProps<typeof SeparatorPrimitive.Root> & {
  /** Words between two rules, such as a day ("Dziś"). Only across. */
  label?: React.ReactNode;
};

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  label,
  ...props
}: SeparatorProps): JSX.Element {
  if (label === undefined) {
    return (
      <SeparatorPrimitive.Root
        data-slot="separator"
        decorative={decorative}
        orientation={orientation}
        className={cn(RULE, className)}
        {...props}
      />
    );
  }
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation="horizontal"
      {...(!decorative && typeof label === "string" ? { "aria-label": label } : {})}
      {...props}
      asChild
    >
      <div
        className={cn(
          "flex w-full items-center gap-3 text-jw-page-small text-muted-foreground",
          className,
        )}
      >
        <span aria-hidden="true" className={cn(RULE, "flex-1")} data-orientation="horizontal" />
        <span data-slot="separator-label" className="shrink-0">
          {label}
        </span>
        <span aria-hidden="true" className={cn(RULE, "flex-1")} data-orientation="horizontal" />
      </div>
    </SeparatorPrimitive.Root>
  );
}

export { Separator };
