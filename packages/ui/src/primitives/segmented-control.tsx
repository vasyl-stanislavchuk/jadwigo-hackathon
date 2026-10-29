// Two to four short choices as one row of joined segments on a quiet track (dl-uukj.32.3, promoted
// from the System page's settings controls). The track is the control's height, 48 (md) or 44 (sm);
// its segments stretch to fill it. The chosen one wears the pick.
import { RadioGroup as RadioPrimitive } from "radix-ui";
import { type ReactElement, useId } from "react";
import { cn } from "../lib/utils.ts";
import { type Choice, type ControlSize, FOCUS, LEGEND, ROW } from "./choice.ts";

function SegmentedControl({
  label,
  options,
  value,
  onChange,
  full = false,
  hideLabel = false,
  size = "md",
  className,
}: {
  label: string;
  options: readonly Choice[];
  value: string;
  onChange(value: string): void;
  /** Stretch across the row, each segment an equal share. */
  full?: boolean;
  /** Keep the legend for a screen reader only. */
  hideLabel?: boolean;
  size?: ControlSize;
  className?: string;
}): ReactElement {
  const id = useId();
  return (
    <div data-slot="segmented-control" className={cn("flex min-w-0 flex-col", className)}>
      <span className={cn(LEGEND, hideLabel && "sr-only")} id={`${id}-legend`}>
        {label}
      </span>
      <RadioPrimitive.Root
        aria-labelledby={`${id}-legend`}
        orientation="horizontal"
        value={value}
        onValueChange={onChange}
        data-size={size}
        className={cn(
          "gap-1 rounded-jw-card border-2 border-jw-line bg-jw-act-quiet p-1",
          ROW[size],
          full ? "flex" : "inline-flex self-start",
        )}
      >
        {options.map((o) => (
          <RadioPrimitive.Item
            key={o.value}
            value={o.value}
            data-plain
            className={cn(
              "flex items-center justify-center gap-2 rounded-jw-small border-2 border-transparent px-4 font-semibold whitespace-nowrap text-jw-ink transition-colors duration-jw-fast hover:bg-jw-card data-[state=checked]:border-jw-pick-edge data-[state=checked]:bg-jw-pick data-[state=checked]:font-bold data-[state=checked]:text-jw-pick-ink",
              FOCUS,
              full && "flex-1",
            )}
          >
            {o.icon}
            {o.label}
          </RadioPrimitive.Item>
        ))}
      </RadioPrimitive.Root>
    </div>
  );
}

export { SegmentedControl };
