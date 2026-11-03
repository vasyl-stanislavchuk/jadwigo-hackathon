// The initial disc (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-column-lesson-
// workspac, dl-xo0q, "entity row"): a person's first initial in a round disc. With `swap`, the disc
// trades its initial for a pencil while its row (a `group/entity` ancestor) is hovered or holds the
// keyboard's focus: the disc edits, the rest of the row opens the item. Decorative by default; the
// row names the person.
//
// The adult kit (dl-uukj.47.67 §4, §6.8): a child's disc in the child's `tone` (lib/tone.ts), the
// parent's avatar in pale ink with an inset ring (never a child's tone, D7), "Bez dziecka" as a dashed
// empty disc, sizes 20 / 22 / 24 / 32, and DiscStack: discs overlapping by 6 with a white ring and a
// "+N" disc for the rest. Without tone, kind or size it draws as before.
import { PencilIcon } from "lucide-react";
import type { ReactElement } from "react";
import { toneClasses } from "../lib/tone.ts";
import { cn } from "../lib/utils.ts";

type DiscSize = 20 | 22 | 24 | 32;

const SIZE: Record<DiscSize, string> = {
  20: "size-5 text-jw-page-micro font-semibold",
  22: "size-5.5 text-jw-page-micro font-semibold",
  24: "size-6 text-jw-page-micro font-semibold",
  32: "size-8 text-jw-page-small font-semibold",
};

const KIND = {
  child: "",
  parent: "bg-jw-avatar text-jw-avatar-ink inset-ring inset-ring-selected-edge",
  // "Bez dziecka": an empty disc on the checkbox's edge, dashed.
  none: "border border-dashed border-control-edge bg-transparent",
} as const;

function Disc({
  name = "",
  swap = false,
  tone,
  kind = "child",
  size,
  className,
}: {
  /** The name the initial is taken from. Unused for kind "none". */
  name?: string;
  swap?: boolean;
  /** A child's tone, 0-9 (any integer wraps). */
  tone?: number;
  kind?: keyof typeof KIND;
  size?: DiscSize;
  className?: string;
}): ReactElement {
  const initial = kind === "none" ? "" : ([...name.trim()][0]?.toLocaleUpperCase() ?? "");
  return (
    <span
      data-slot="disc"
      data-kind={kind}
      aria-hidden="true"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full bg-jw-act-quiet text-jw-page-small font-bold text-jw-ink",
        size !== undefined && SIZE[size],
        kind === "child" && tone !== undefined && toneClasses(tone),
        KIND[kind],
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

/** Who a row is for, as overlapping discs: the first `max`, then "+N" for the rest. */
function DiscStack({
  people,
  label,
  max = 3,
  size = 22,
  className,
}: {
  people: readonly { name: string; tone?: number }[];
  /** Names everyone in the stack, from copy ("Marta, Ola i Kuba"). */
  label: string;
  max?: number;
  size?: DiscSize;
  className?: string;
}): ReactElement {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const ring = "ring-2 ring-background";
  return (
    <span
      role="img"
      aria-label={label}
      data-slot="disc-stack"
      className={cn("flex items-center -space-x-1.5", className)}
    >
      {shown.map((p, i) => (
        // A stack may hold two children of one name, so the place is the key.
        <Disc
          key={i}
          name={p.name}
          size={size}
          className={ring}
          {...(p.tone === undefined ? {} : { tone: p.tone })}
        />
      ))}
      {rest > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "grid shrink-0 place-items-center rounded-full bg-muted text-muted-foreground tabular-nums",
            SIZE[size],
            ring,
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}

export { Disc, DiscStack };
