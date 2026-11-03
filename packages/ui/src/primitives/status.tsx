// A lesson's status as a pill (dl-uukj.47.67 S13, §6.8): 22 high on the warm line, with an 8 px dot
// whose shape says the state, so status never borrows a verdict's hue (S3): Szkic a dashed ring,
// Gotowa an ink ring, W trakcie half filled, Zrobiona filled. The words come from the caller.
import type { ReactElement, ReactNode } from "react";
import { cn } from "../lib/utils.ts";

export type LessonStatus = "draft" | "ready" | "in-progress" | "done";

const DOT: Record<LessonStatus, string> = {
  draft: "border border-dashed border-control-edge",
  ready: "border border-primary",
  "in-progress": "border border-primary bg-linear-to-r from-primary from-50% to-transparent to-50%",
  done: "bg-primary",
};

function Status({
  status,
  children,
  className,
}: {
  status: LessonStatus;
  /** The state's name, from copy. */
  children: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <span
      data-slot="status"
      data-status={status}
      className={cn(
        "inline-flex h-5.5 w-fit shrink-0 items-center gap-1.5 rounded-full border border-border px-2 text-jw-page-small font-medium whitespace-nowrap text-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", DOT[status])} />
      {children}
    </span>
  );
}

export { Status };
