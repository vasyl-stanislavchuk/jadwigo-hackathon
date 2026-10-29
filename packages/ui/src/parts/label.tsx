// A form label on an app page (dl-uukj.32.3): the body size, bold, in the ink.
import type { ComponentProps, ReactElement } from "react";
import { cn } from "../lib/utils.ts";

function Label({ className, ...props }: ComponentProps<"label">): ReactElement {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the caller names the control with htmlFor, or Field does
    <label
      data-slot="label"
      className={cn("text-jw-body font-bold text-jw-ink", className)}
      {...props}
    />
  );
}

export { Label };
