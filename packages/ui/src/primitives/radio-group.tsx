// One choice from two to five (dl-uukj.32.3, promoted from the System page's settings controls): a
// 24 px ring that turns the pick's edge with a dot, and the whole 48 px row is the target. data-plain
// keeps the lesson's option rules (a pressed edge, a sink on press; foundation.css) off it.
import { RadioGroup as RadioPrimitive } from "radix-ui";
import { type ReactElement, useId } from "react";
import { cn } from "../lib/utils.ts";
import { type Choice, FOCUS, HOVER, LEGEND } from "./choice.ts";

function RadioGroup({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly Choice[];
  value: string;
  onChange(value: string): void;
  className?: string;
}): ReactElement {
  const id = useId();
  return (
    <div data-slot="radio-group" className={cn("flex min-w-0 flex-col", className)}>
      <span className={LEGEND} id={`${id}-legend`}>
        {label}
      </span>
      <RadioPrimitive.Root
        aria-labelledby={`${id}-legend`}
        value={value}
        onValueChange={onChange}
        className="flex flex-col gap-1"
      >
        {options.map((o) => (
          <label
            key={o.value}
            htmlFor={`${id}-${o.value}`}
            data-slot="radio-group-row"
            className={cn(
              "group flex min-h-jw-control cursor-pointer items-center gap-3 rounded-jw-small px-3 text-jw-body text-jw-ink",
              HOVER,
              o.value === value && "font-bold",
            )}
          >
            <RadioPrimitive.Item
              id={`${id}-${o.value}`}
              value={o.value}
              data-plain
              className={cn(
                "relative grid size-6 shrink-0 place-items-center rounded-full border-2 border-jw-line bg-jw-card group-hover:border-jw-ink-soft data-[state=checked]:border-jw-pick-edge group-hover:data-[state=checked]:border-jw-pick-edge",
                FOCUS,
              )}
            >
              <RadioPrimitive.Indicator className="size-3 rounded-full bg-jw-pick-edge" />
            </RadioPrimitive.Item>
            {o.icon}
            {o.label}
          </label>
        ))}
      </RadioPrimitive.Root>
    </div>
  );
}

export { RadioGroup };
