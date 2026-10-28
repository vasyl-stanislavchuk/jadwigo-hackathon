/**
 * Part: the grip on a card or tile the child can drag (lesson-frame/README.md §3, "Draggables"): a
 * 2×3 grid of 3px dots, 3px apart, in the muted ink, and in the pick's ink while the card is
 * grabbed (picked up by a tap or a key, or dragged). It replaces Lucide's GripVertical, whose six
 * dots are drawn as strokes at another size. The dots are styles/stage.css's .kid-grip.
 */

import { cn } from "@jadwigo/ui";

export function Grip({
  grabbed = false,
  className,
}: {
  grabbed?: boolean | undefined;
  className?: string | undefined;
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-grip
      data-grabbed={grabbed ? "" : undefined}
      className={cn("kid-grip", className)}
    />
  );
}
