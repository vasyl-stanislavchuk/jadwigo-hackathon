// Notebook divider tabs (dl-uukj.32.3, promoted from the System page's settings controls): 48 px
// triggers, the active one joins the panel under it. Arrows move, Home and End jump (radix).
// The tabs stay one row: tighter on a phone, and a row wider than its column scrolls sideways
// rather than wrapping into what reads as 2 sets of tabs (dl-uukj.47.21). The line under them is
// the wrapper's, so the scrolling row never clips the active tab's join, and the row keeps room
// for the keyboard's outline. On an app page they are the adult's (handoff dl-uukj.47.67 §6.7): an
// underline, 14/500, the active tab in ink on a 2 px ink line and the rest muted, an optional count,
// and the panel with no box of its own. A lesson's keep the notebook look.
import { Tabs as TabsPrimitive } from "radix-ui";
import type { ReactElement, ReactNode } from "react";
import { useRegister } from "../lib/register.tsx";
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
  /** count: a number beside the tab's name, drawn on the adult's tabs ("Lekcje 12"). */
  tabs: readonly (Choice & { panel: ReactNode; count?: number })[];
  value: string;
  onChange(value: string): void;
  className?: string;
}): ReactElement {
  if (useRegister() === "app")
    return <UnderlineTabs {...{ label, tabs, value, onChange, className }} />;
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      value={value}
      onValueChange={onChange}
      className={cn("flex min-w-0 flex-col", className)}
    >
      <div className="border-b-2 border-jw-line">
        <TabsPrimitive.List
          aria-label={label}
          className="-mb-0.5 flex items-end gap-1 overflow-x-auto px-1.5 pt-1.5 sm:gap-2 sm:px-4"
        >
          {tabs.map((t) => (
            <TabsPrimitive.Trigger
              key={t.value}
              value={t.value}
              className={cn(
                "flex min-h-jw-control shrink-0 items-center gap-2.5 rounded-t-jw-small border-2 border-transparent px-3 whitespace-nowrap text-jw-body sm:px-5 font-bold text-jw-ink-soft transition-colors duration-jw-fast hover:bg-jw-act-quiet hover:text-jw-ink data-[state=active]:border-jw-line data-[state=active]:border-b-jw-card data-[state=active]:bg-jw-card data-[state=active]:text-jw-ink",
                FOCUS,
              )}
            >
              {t.icon}
              {t.label}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
      </div>
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

function UnderlineTabs({
  label,
  tabs,
  value,
  onChange,
  className,
}: {
  label: string;
  tabs: readonly (Choice & { panel: ReactNode; count?: number })[];
  value: string;
  onChange(value: string): void;
  className?: string | undefined;
}): ReactElement {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      value={value}
      onValueChange={onChange}
      className={cn("flex min-w-0 flex-col", className)}
    >
      <div className="border-b border-border">
        <TabsPrimitive.List
          aria-label={label}
          className="-mb-px flex items-end gap-5 overflow-x-auto"
        >
          {tabs.map((t) => (
            <TabsPrimitive.Trigger
              key={t.value}
              value={t.value}
              className="flex min-h-jw-control shrink-0 items-center gap-2 border-b-2 border-transparent whitespace-nowrap text-jw-page-body font-medium text-muted-foreground outline-none transition-colors duration-jw-fast hover:text-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground"
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">
                  {t.count}
                </span>
              )}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
      </div>
      {tabs.map((t) => (
        <TabsPrimitive.Content key={t.value} value={t.value} className="pt-4 outline-none">
          {t.panel}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

export { Tabs };
