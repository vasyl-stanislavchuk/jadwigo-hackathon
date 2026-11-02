// An empty list's state (dl-uukj.47.67 S18, §7.3): a 40 icon tile, a title, one line, and a slot for
// its one action. The app composes the four list states from it (first time, filtered, error); the
// words and the action come from the caller.
import type { ReactElement, ReactNode } from "react";
import { cn } from "../lib/utils.ts";

function Empty({
  icon,
  title,
  description,
  action,
  className,
}: {
  /** A lucide icon element: book, filter, alert. */
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div
      data-slot="empty"
      className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}
    >
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-jw-control bg-muted text-muted-foreground [&_svg]:size-5"
      >
        {icon}
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-jw-page-body font-semibold text-foreground">{title}</p>
        {description !== undefined && (
          <p className="text-jw-page-small text-muted-foreground">{description}</p>
        )}
      </div>
      {action !== undefined && <div className="mt-1">{action}</div>}
    </div>
  );
}

export { Empty };
