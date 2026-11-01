// The initial disc (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-column-lesson-
// workspac, dl-xo0q, "entity row"): a person's first initial in a round disc. With `swap`, the disc
// trades its initial for a pencil while its row (a `group/entity` ancestor) is hovered or holds the
// keyboard's focus: the disc edits, the rest of the row opens the item. Decorative by default; the
// row names the person.
import { PencilIcon } from "lucide-react";
import type { ReactElement } from "react";
import { cn } from "../lib/utils.ts";

function Disc({
  name,
  swap = false,
  className,
}: {
  /** The name the initial is taken from. */
  name: string;
  swap?: boolean;
  className?: string;
}): ReactElement {
  const initial = [...name.trim()][0]?.toLocaleUpperCase() ?? "";
  return (
    <span
      data-slot="disc"
      aria-hidden="true"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full bg-jw-act-quiet text-jw-page-small font-bold text-jw-ink",
        className,
      )}
    >
      <span
        className={cn(
          swap && "group-focus-within/entity:hidden group-hover/entity:hidden",
          "col-start-1 row-start-1",
        )}
      >
        {initial}
      </span>
      {swap && (
        <PencilIcon className="col-start-1 row-start-1 hidden size-3.5 group-focus-within/entity:block group-hover/entity:block" />
      )}
    </span>
  );
}

export { Disc };
