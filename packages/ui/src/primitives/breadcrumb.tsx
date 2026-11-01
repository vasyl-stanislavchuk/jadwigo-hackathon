// The breadcrumb (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-column-lesson-
// workspac, dl-xo0q): "Section / Page" in the parent's top bar. Each step before the last is a link;
// the last is the current page, bold, with aria-current="page". A link is a real <a href>; the app
// moves client-side through onNavigate (it calls preventDefault for a plain click itself).
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { cn } from "../lib/utils.ts";
import { FOCUS } from "./choice.ts";

export interface Crumb {
  label: ReactNode;
  /** Where the step leads. The last step is the current page and needs none. */
  href?: string;
}

function Breadcrumb({
  label,
  trail,
  onNavigate,
  className,
}: {
  /** The nav's name, from copy. */
  label: string;
  trail: readonly Crumb[];
  onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}): ReactElement {
  const last = trail.length - 1;
  return (
    <nav aria-label={label} data-slot="breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-2 text-jw-page-body text-jw-ink-soft">
        {trail.map((step, i) => (
          // A trail never repeats a step at the same place, so the index is its key.
          <li key={i} className="flex min-w-0 items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === last || step.href === undefined ? (
              <span
                aria-current={i === last ? "page" : undefined}
                className={cn("truncate", i === last && "font-bold text-jw-ink")}
              >
                {step.label}
              </span>
            ) : (
              <a
                href={step.href}
                className={cn("truncate rounded-jw-small hover:text-jw-ink hover:underline", FOCUS)}
                onClick={(e) => {
                  if (!onNavigate || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
                  e.preventDefault();
                  onNavigate(step.href ?? "", e);
                }}
              >
                {step.label}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export { Breadcrumb };
