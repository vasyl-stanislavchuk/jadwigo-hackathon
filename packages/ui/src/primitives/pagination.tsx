// A table's pager (dl-uukj.47.67 §7.2): "1–20 z 214", a slot for the per-page select, "Strona 1 z 11"
// and the ‹ › buttons, all small (28 in the parent's density). Every word, and both buttons' names,
// come from the caller.
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../lib/utils.ts";
import { Button } from "./button.tsx";

function Pagination({
  label,
  range,
  perPage,
  page,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  className,
}: {
  /** The nav's name, from copy ("Strony"). */
  label: string;
  /** Which rows show, from copy: "1–20 z 214". */
  range: ReactNode;
  /** The per-page select and its label. */
  perPage?: ReactNode;
  /** The page, from copy: "Strona 1 z 11". */
  page: ReactNode;
  previousLabel: string;
  nextLabel: string;
  /** Unset on the first page, which disables ‹. */
  onPrevious?: (() => void) | undefined;
  /** Unset on the last page, which disables ›. */
  onNext?: (() => void) | undefined;
  className?: string;
}): ReactElement {
  return (
    <nav
      aria-label={label}
      data-slot="pagination"
      className={cn(
        "flex items-center justify-between gap-4 text-jw-page-small text-muted-foreground tabular-nums",
        className,
      )}
    >
      <span>{range}</span>
      <div className="flex items-center gap-4">
        {perPage}
        <span>{page}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            aria-label={previousLabel}
            disabled={!onPrevious}
            onClick={onPrevious}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={nextLabel}
            disabled={!onNext}
            onClick={onNext}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </nav>
  );
}

export { Pagination };
