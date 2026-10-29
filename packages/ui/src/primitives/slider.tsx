// shadcn/ui slider (radix-vega, shadcn@4.21.1), the number-line fallback (dl-0ax3). The whole
// row is at least --kid-tap-min high and a press anywhere on it moves the thumb (radix); the
// thumb's 40 px face gets a --kid-tap-min hit area, centred on it, from its ::after. Arrow keys step it.
import { Slider as SliderPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "../lib/utils.ts";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  );
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      {...(defaultValue === undefined ? {} : { defaultValue })}
      {...(value === undefined ? {} : { value })}
      min={min}
      max={max}
      className={cn(
        "relative flex min-h-kid-tap w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:min-w-kid-tap data-vertical:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-muted data-horizontal:h-3 data-horizontal:w-full data-vertical:h-full data-vertical:w-3"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-primary data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="relative block size-10 shrink-0 rounded-full border-4 border-primary bg-background shadow-sm transition-[box-shadow] select-none after:absolute after:top-1/2 after:left-1/2 after:size-kid-tap after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] hover:ring-4 hover:ring-ring/30 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-hidden disabled:pointer-events-none"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
