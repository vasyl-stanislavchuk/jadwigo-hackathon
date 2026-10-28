/**
 * Part: groups of the same object (dl-w3.47), the concrete level of a times-table fact: for 2 × 7,
 * two groups of seven apples. The objects are icons from the UI's icon library, never custom art
 * (decision 2026-10-18-2026-10-18-engagement-uses-simple-sounds-and-animations-from-ui). One
 * picture, read by a screen reader as its label; the groups and objects inside are decoration.
 * An icon not on the list falls back to the first, so a figure always draws.
 */

import { Apple, Cherry, Fish, Flower, Heart, type LucideIcon, Star } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  apple: Apple,
  star: Star,
  heart: Heart,
  fish: Fish,
  flower: Flower,
  cherry: Cherry,
};

/** Objects per row inside a group, so a group of nine reads as two rows, not a long line. */
const PER_ROW = 5;

export function Groups({
  groups,
  each,
  icon,
  label,
}: {
  groups: number;
  each: number;
  icon: string;
  label: string;
}): JSX.Element {
  const Icon = ICONS[icon] ?? Apple;
  const drawn = icon in ICONS ? icon : "apple";
  return (
    <div
      role="img"
      aria-label={label}
      data-groups={`${groups}x${each}`}
      data-icon={drawn}
      className="flex max-w-full flex-wrap gap-3"
    >
      {Array.from({ length: groups }, (_, g) => (
        <span
          key={g}
          className="grid gap-1 rounded-xl border-2 border-dashed border-border p-2"
          style={{ gridTemplateColumns: `repeat(${Math.min(each, PER_ROW)}, auto)` }}
        >
          {Array.from({ length: each }, (_, i) => (
            <Icon key={i} aria-hidden="true" className="size-6 shrink-0 text-primary" />
          ))}
        </span>
      ))}
    </div>
  );
}
