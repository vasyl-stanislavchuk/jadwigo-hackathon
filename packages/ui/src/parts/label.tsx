// A form label (dl-uukj.32.3): bold, in the ink, at the page body size on an app page
// (dl-uukj.32.17) and the body size elsewhere.
import type { ComponentProps, ReactElement } from "react";
import { BODY, useRegister } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";

function Label({ className, ...props }: ComponentProps<"label">): ReactElement {
  const size = BODY[useRegister()];
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the caller names the control with htmlFor, or Field does
    <label data-slot="label" className={cn(size, "font-bold text-jw-ink", className)} {...props} />
  );
}

export { Label };
