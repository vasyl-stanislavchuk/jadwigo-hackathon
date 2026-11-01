// The fold button of a side panel (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-
// column-lesson-workspac, dl-xo0q, "fold to a strip"): a panel icon in the panel's header that folds
// it to a strip and back. A real button with its name from copy ("Zwiń menu", "Rozwiń rozmowę"),
// aria-expanded for the panel's state and aria-controls for the panel it folds. A navigation
// control: 48 square, 34 in the parent's density.
import { PanelLeftIcon, PanelRightIcon } from "lucide-react";
import type { ReactElement } from "react";
import { cn } from "../lib/utils.ts";
import { FOCUS } from "./choice.ts";

function PanelToggle({
  side,
  expanded,
  onToggle,
  label,
  controls,
  className,
}: {
  /** Which edge the panel sits on: its icon draws that side. */
  side: "left" | "right";
  expanded: boolean;
  onToggle: () => void;
  /** What a press does, from copy: "Zwiń menu" while open, "Rozwiń menu" while folded. */
  label: string;
  /** The id of the panel it folds. */
  controls: string;
  className?: string;
}): ReactElement {
  const Icon = side === "left" ? PanelLeftIcon : PanelRightIcon;
  return (
    <button
      type="button"
      data-slot="panel-toggle"
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      className={cn(
        "grid min-h-jw-control min-w-jw-control shrink-0 place-items-center rounded-jw-small text-jw-ink-soft transition-colors duration-jw-fast hover:bg-jw-act-quiet hover:text-jw-ink",
        FOCUS,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4.5" />
    </button>
  );
}

export { PanelToggle };
