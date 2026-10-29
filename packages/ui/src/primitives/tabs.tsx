// Notebook divider tabs (dl-uukj.32.3, promoted from the System page's settings controls): 48 px
// triggers, the active one joins the panel under it. Arrows move, Home and End jump (radix).
import { Tabs as TabsPrimitive } from "radix-ui";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../lib/utils.ts";
import { type Choice, FOCUS } from "./choice.ts";

function Tabs({
  label,
  tabs,
  value,
  onChange,
  className,
}: {
  label: string;
  tabs: readonly (Choice & { panel: ReactNode })[];
  value: string;
  onChange(value: string): void;
  className?: string;
}): ReactElement {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      value={value}
      onValueChange={onChange}
      className={cn("flex min-w-0 flex-col", className)}
    >
      <TabsPrimitive.List
        aria-label={label}
        className="flex flex-wrap items-end gap-2 border-b-2 border-jw-line px-4"
      >
        {tabs.map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              "-mb-0.5 flex min-h-jw-control items-center gap-2.5 rounded-t-jw-small border-2 border-transparent px-5 text-jw-body font-bold text-jw-ink-soft transition-colors duration-jw-fast hover:bg-jw-act-quiet hover:text-jw-ink data-[state=active]:border-jw-line data-[state=active]:border-b-jw-card data-[state=active]:bg-jw-card data-[state=active]:text-jw-ink",
              FOCUS,
            )}
          >
            {t.icon}
            {t.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((t) => (
        <TabsPrimitive.Content
          key={t.value}
          value={t.value}
          className="rounded-b-jw-card border-2 border-t-0 border-jw-line bg-jw-card p-5"
        >
          {t.panel}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

export { Tabs };
