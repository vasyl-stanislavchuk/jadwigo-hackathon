// shadcn/ui collapsible over radix-ui's Collapsible (handoff dl-uukj.47.71 §9): a chat turn folds to
// its summary row, a done stage opens to its lines, "{n} wcześniej" shows the earlier ones. The
// trigger carries aria-expanded and aria-controls, and Enter, Space and a click toggle it, as Radix
// gives them. The content opens to and folds from the height Radix measures
// (--radix-collapsible-content-height, which a consumer may read too) over --jw-dur-fold, 200 ms
// ease-out (§6), and appears at once under reduced motion: the duration is 0 there, and no
// animation runs.
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "../lib/utils.ts";

function Collapsible(props: React.ComponentProps<typeof CollapsiblePrimitive.Root>): JSX.Element {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger(
  props: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>,
): JSX.Element {
  return <CollapsiblePrimitive.CollapsibleTrigger data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>): JSX.Element {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden data-[state=closed]:animate-jw-fold-shut data-[state=open]:animate-jw-fold-open motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
