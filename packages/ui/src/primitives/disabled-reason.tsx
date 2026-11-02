// A disabled control always says why (handoff dl-uukj.47.67 S5): the control stays focusable and is
// marked aria-disabled, a press does nothing, the reason opens as a tooltip on hover and on focus, a
// screen reader hears it as the control's description, and on a touch screen (no hover) it is the
// line under the control. Wrap the one control: <DisabledReason reason={…}><Button>…</Button>.
import { type ReactElement, type ReactNode, type SyntheticEvent, useId } from "react";
import { cn } from "../lib/utils.ts";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip.tsx";

function stop(event: SyntheticEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function DisabledReason({
  reason,
  className,
  children,
}: {
  /** Why it can't be pressed yet: "Napisz, czego ma się uczyć." */
  reason: ReactNode;
  className?: string;
  /** One control that takes a ref and aria props (a Button, a link). */
  children: ReactElement;
}): JSX.Element {
  const id = useId();
  return (
    // The press is stopped on its way down, before the control's own handler or a form's submit.
    <span
      data-slot="disabled-reason"
      className={cn("inline-flex flex-col items-start gap-1", className)}
      onClickCapture={stop}
    >
      <Tooltip>
        <TooltipTrigger asChild aria-disabled="true" aria-describedby={id}>
          {children}
        </TooltipTrigger>
        <TooltipContent>{reason}</TooltipContent>
      </Tooltip>
      <span
        id={id}
        className="hidden text-jw-page-small text-muted-foreground pointer-coarse:block"
      >
        {reason}
      </span>
    </span>
  );
}

export { DisabledReason };
