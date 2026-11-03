// A filter chip (dl-uukj.47.67 §6.8, §7.1): a value the parent picked, in the selected colours, at
// radius 4, inside a facet or on its own, with an optional × that removes it. Its words and the ×'s
// name come from the caller.
import { XIcon } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { PAGE_FOCUS } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";

function Chip({
  children,
  onRemove,
  removeLabel,
  className,
}: {
  children: ReactNode;
  /** With removeLabel, draws a × that calls it. */
  onRemove?: () => void;
  /** The ×'s name, from copy ("Usuń filtr Marta"). */
  removeLabel?: string;
  className?: string;
}): ReactElement {
  return (
    <span
      data-slot="chip"
      className={cn(
        "inline-flex h-5.5 w-fit shrink-0 items-center gap-1 rounded-jw-small bg-selected px-1.5 text-jw-page-small font-medium whitespace-nowrap text-selected-foreground",
        onRemove && removeLabel !== undefined && "pr-0.5",
        className,
      )}
    >
      {children}
      {onRemove && removeLabel !== undefined && (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className={cn(
            "grid size-4.5 place-items-center rounded-jw-small hover:bg-selected-edge",
            PAGE_FOCUS,
          )}
        >
          <XIcon aria-hidden="true" className="size-3" />
        </button>
      )}
    </span>
  );
}

export { Chip };
