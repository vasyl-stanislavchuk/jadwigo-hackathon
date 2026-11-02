// Radio Cards (handoff dl-uukj.47.67 §6.3, S9): a small fixed set that should all be visible, such as
// the class in Dodaj dziecko (1–6 klasa, each with its age line). One radio group of cards: arrows
// move and pick, the chosen card is the pick's fill on the ink edge (1 px and 1 px inside) with the
// pick's ink. 3 across on a laptop and 2 on a phone; compact puts 6 across, as the dialog does.
import { RadioGroup as RadioPrimitive } from "radix-ui";
import { type ReactElement, useId } from "react";
import { cn } from "../lib/utils.ts";
import type { Choice } from "./choice.ts";

function RadioCards({
  label,
  options,
  value,
  onChange,
  compact = false,
  className,
}: {
  label: string;
  options: readonly Choice[];
  value: string | undefined;
  onChange(value: string): void;
  /** Six across in one row, for a dialog. */
  compact?: boolean;
  className?: string;
}): ReactElement {
  const id = useId();
  return (
    <div data-slot="radio-cards" className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="text-jw-page-body font-medium text-foreground" id={`${id}-legend`}>
        {label}
      </span>
      <RadioPrimitive.Root
        aria-labelledby={`${id}-legend`}
        value={value ?? ""}
        onValueChange={onChange}
        className={cn("grid gap-2", compact ? "grid-cols-6" : "grid-cols-2 sm:grid-cols-3")}
      >
        {options.map((o) => (
          <RadioPrimitive.Item
            key={o.value}
            value={o.value}
            data-plain
            data-slot="radio-card"
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-jw-control border border-input bg-background text-left text-jw-page-body font-medium text-foreground transition-colors duration-jw-fast hover:bg-muted data-[state=checked]:border-primary data-[state=checked]:bg-selected data-[state=checked]:text-selected-foreground data-[state=checked]:ring-1 data-[state=checked]:ring-primary data-[state=checked]:ring-inset",
              compact ? "items-center px-1 py-2 text-center" : "px-3 py-2.5",
            )}
          >
            <span className="flex items-center gap-2">
              {o.icon}
              {o.label}
            </span>
            {o.hint !== undefined && (
              <span className="text-jw-page-small font-normal text-muted-foreground">{o.hint}</span>
            )}
          </RadioPrimitive.Item>
        ))}
      </RadioPrimitive.Root>
    </div>
  );
}

export { RadioCards };
