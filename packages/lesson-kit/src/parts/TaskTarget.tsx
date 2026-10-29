/**
 * Part: the big readout a task shows beside its figure (dl-uukj.32): the expression FigureView
 * draws, the number or fraction to place on a line, the amount to pay in coins, the time to set on
 * a clock, the rectangle's size on a grid. Every one is the theme's target size (--jw-size-target,
 * text-jw-target), bold and in tabular figures, so the readouts match each other and the type scale.
 * A site adds only its own line height or alignment through `className`.
 */

import { cn } from "@jadwigo/ui";
import type { ReactNode } from "react";

/** The readout's classes, for a host that draws its own element (RichText's root). */
export const TASK_TARGET = "text-jw-target font-bold tabular-nums";

export function TaskTarget({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}): JSX.Element {
  return (
    <p data-task-target="" className={cn(TASK_TARGET, className)}>
      {children}
    </p>
  );
}
