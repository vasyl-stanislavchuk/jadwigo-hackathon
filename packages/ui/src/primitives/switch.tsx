// shadcn/ui switch (radix-ui Switch), reshaped for the kid layer (dl-uukj.29.55): the whole row,
// its words and the track, is one --kid-tap-min button, so a child taps the words or the track.
// On or off takes effect at once (the pause sheet's "Dźwięk", lesson-frame README §3). On is the
// primary ink with the knob right, never green (green is kept for a correct answer). It is the one
// switch (dl-uukj.32.3): a settings row on an app page takes size md (48) or sm (44, a toolbar), as
// the System page's controls do (decision dl-og82). On an app page it is the adult's (handoff
// dl-uukj.47.67 §6.3): a 32×18 track, the ink when on, the label at 500 with the switch on the right;
// a lesson's (the pause sheet's) keeps its look.
import { Switch as SwitchPrimitive } from "radix-ui";
import type * as React from "react";
import { useRegister } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";
import { type ControlSize, ROW } from "./choice.ts";

function Switch({
  className,
  children,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { size?: "default" | ControlSize }) {
  if (useRegister() === "app") {
    return (
      <SwitchPrimitive.Root
        data-slot="switch"
        data-size={size}
        className={cn(
          "group/switch inline-flex w-full min-h-jw-control items-center justify-between gap-4 text-left text-jw-page-body font-medium text-foreground outline-none select-none disabled:pointer-events-none disabled:text-placeholder",
          className,
        )}
        {...props}
      >
        {children}
        <span
          aria-hidden="true"
          data-slot="switch-track"
          className="relative flex h-4.5 w-8 shrink-0 items-center rounded-full bg-input transition-colors duration-jw-fast group-data-[state=checked]/switch:bg-primary"
        >
          <SwitchPrimitive.Thumb
            data-slot="switch-thumb"
            className="block size-3.5 translate-x-0.5 rounded-full bg-background transition-[translate] duration-jw-fast data-[state=checked]:translate-x-4"
          />
        </span>
      </SwitchPrimitive.Root>
    );
  }
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "group/switch inline-flex w-full items-center justify-between gap-4 rounded-lg font-semibold outline-none select-none disabled:pointer-events-none disabled:opacity-50",
        size === "default" ? "min-h-kid-tap px-1 text-xl" : ["px-3", ROW[size]],
        className,
      )}
      {...props}
    >
      {children}
      <span
        aria-hidden="true"
        data-slot="switch-track"
        className="relative flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-border bg-muted transition-colors group-data-[state=checked]/switch:border-primary group-data-[state=checked]/switch:bg-primary"
      >
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className="block size-6 translate-x-0.5 rounded-full bg-muted-foreground transition-[translate,background-color] data-[state=checked]:translate-x-6 data-[state=checked]:bg-primary-foreground"
        />
      </span>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
