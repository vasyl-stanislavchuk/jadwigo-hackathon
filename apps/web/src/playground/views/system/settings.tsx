/**
 * The Zeszyt export's settings controls (claude-design/components/forms and navigation, the fourth
 * export): RadioGroup, Switch, SegmentedControl, Tabs and SideMenu, on the radix primitives shadcn
 * builds on, coloured from the --jw- roles. The export keeps them off the lesson screen: they are
 * for settings and topic screens, so they take its own sizes, not the lesson's 56 px tap target:
 * 48 px rows (md), and 44 px (sm) in a toolbar, the export's button scale (tokens/base.css).
 *
 * Chosen wears the pick (its fill, its ink edge), hover on a mouse is a quiet fill, and the keyboard
 * gets the 3px ink outline from styles/foundation.css. `data-plain` keeps the option rules there
 * (a pressed edge, a sink on press) off these controls, which stand on no edge.
 *
 * shortcut: they live with the System page, the one screen that uses them; move each to
 * components/ui (kid-sized, in primitives.test.tsx) when a learner screen needs it.
 */

import { cn } from "@jadwigo/ui";
import { ChevronRight } from "lucide-react";
import {
  RadioGroup as RadioPrimitive,
  Switch as SwitchPrimitive,
  Tabs as TabsPrimitive,
} from "radix-ui";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

export interface Choice {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
}

/** The export's button scale for these controls: md 48 px, sm 44 px for a toolbar. */
type Size = "md" | "sm";

const LEGEND = "pb-2 text-base font-bold text-muted-foreground";
const HOVER = "transition-colors duration-[var(--jw-dur-fast)] hover:bg-[var(--jw-act-quiet)]";

/** One choice from two to five, a 24 px ring that turns ink with a dot; the whole row is the target. */
export function RadioGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly Choice[];
  value: string;
  onChange(value: string): void;
}): JSX.Element {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col">
      <span className={LEGEND} id={`rg-${label}`}>
        {label}
      </span>
      <RadioPrimitive.Root
        aria-labelledby={`rg-${label}`}
        value={value}
        onValueChange={onChange}
        className="flex flex-col gap-1"
      >
        {options.map((o) => (
          <label
            key={o.value}
            htmlFor={`${id}-${o.value}`}
            className={cn(
              "group flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--jw-radius-small)] px-3 text-lg",
              HOVER,
              o.value === value && "font-bold",
            )}
          >
            <RadioPrimitive.Item
              id={`${id}-${o.value}`}
              value={o.value}
              data-plain
              className="relative grid size-6 shrink-0 place-items-center rounded-full border-2 border-[var(--jw-line)] bg-[var(--jw-card)] group-hover:border-[var(--jw-ink-soft)] data-[state=checked]:border-[var(--jw-pick-edge)] group-hover:data-[state=checked]:border-[var(--jw-pick-edge)]"
            >
              <RadioPrimitive.Indicator className="size-3 rounded-full bg-[var(--jw-pick-edge)]" />
            </RadioPrimitive.Item>
            {o.label}
          </label>
        ))}
      </RadioPrimitive.Root>
    </div>
  );
}

/** On or off, taking effect at once: an ink track with the knob right when on. The row toggles. */
export function Switch({
  label,
  checked,
  onChange,
  size = "md",
}: {
  label: ReactNode;
  checked: boolean;
  onChange(checked: boolean): void;
  size?: Size;
}): JSX.Element {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4 rounded-[var(--jw-radius-small)] px-3",
        size === "md" ? "min-h-12 text-lg" : "min-h-11 text-base",
        HOVER,
      )}
    >
      <span>{label}</span>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="relative h-8 w-[3.25rem] shrink-0 rounded-full border-2 border-[var(--jw-line)] bg-[var(--jw-act-quiet)] transition-colors duration-[var(--jw-dur-fast)] data-[state=checked]:border-[var(--jw-pick-edge)] data-[state=checked]:bg-[var(--jw-pick-edge)]"
      >
        <SwitchPrimitive.Thumb className="block size-[1.375rem] translate-x-[0.1875rem] rounded-full bg-[var(--jw-ink-soft)] transition-[translate,background-color] duration-[var(--jw-dur-fast)] ease-[var(--jw-ease-out)] data-[state=checked]:translate-x-[1.5rem] data-[state=checked]:bg-[var(--jw-card)]" />
      </SwitchPrimitive.Root>
    </label>
  );
}

/** Two to four short choices as one row of joined segments on a quiet track. */
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  full = false,
  hideLabel = false,
  size = "md",
}: {
  label: string;
  options: readonly Choice[];
  value: string;
  onChange(value: string): void;
  full?: boolean;
  hideLabel?: boolean;
  size?: Size;
}): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col">
      <span className={cn(LEGEND, hideLabel && "sr-only")} id={`sc-${label}`}>
        {label}
      </span>
      <RadioPrimitive.Root
        aria-labelledby={`sc-${label}`}
        orientation="horizontal"
        value={value}
        onValueChange={onChange}
        className={cn(
          "gap-1 rounded-[var(--jw-radius-card)] border-2 border-[var(--jw-line)] bg-[var(--jw-act-quiet)] p-1",
          full ? "flex" : "inline-flex self-start",
        )}
      >
        {options.map((o) => (
          <RadioPrimitive.Item
            key={o.value}
            value={o.value}
            data-plain
            className={cn(
              "flex items-center justify-center gap-2 rounded-[calc(var(--jw-radius-card)-0.25rem)] border-2 border-transparent px-4 font-semibold whitespace-nowrap text-foreground transition-colors duration-[var(--jw-dur-fast)] hover:bg-[var(--jw-card)] data-[state=checked]:border-[var(--jw-pick-edge)] data-[state=checked]:bg-[var(--jw-pick)] data-[state=checked]:font-bold data-[state=checked]:text-[var(--jw-pick-ink)]",
              size === "md" ? "min-h-9 text-lg" : "min-h-8 text-base",
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

/** Notebook divider tabs: the active one joins the panel under it. Arrows move, Home and End jump. */
export function Tabs({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: readonly (Choice & { panel: ReactNode })[];
  value: string;
  onChange(value: string): void;
}): JSX.Element {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onChange} className="flex min-w-0 flex-col">
      <TabsPrimitive.List
        aria-label={label}
        className="flex flex-wrap items-end gap-2 border-b-2 border-[var(--jw-line)] px-4"
      >
        {tabs.map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className="-mb-[var(--jw-border)] flex min-h-12 items-center gap-2.5 rounded-t-[var(--jw-radius-small)] border-2 border-transparent px-5 text-lg font-bold text-muted-foreground transition-colors duration-[var(--jw-dur-fast)] hover:bg-[var(--jw-act-quiet)] hover:text-foreground data-[state=active]:border-[var(--jw-line)] data-[state=active]:border-b-[var(--jw-card)] data-[state=active]:bg-[var(--jw-card)] data-[state=active]:text-foreground"
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
          className="rounded-b-[var(--jw-radius-card)] border-2 border-t-0 border-[var(--jw-line)] bg-[var(--jw-card)] p-5"
        >
          {t.panel}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

export interface MenuItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  /** A link to jump to; without one the item is a button that calls onPick. */
  href?: string;
  /** Sub-items: the row becomes a category that folds open. One level only. */
  items?: readonly MenuItem[];
  /** Start open; a category holding the current page always opens. */
  open?: boolean;
}

/** A section heading in the menu: a label, never a row. */
export interface MenuHeading {
  heading: string;
}

export type MenuEntry = MenuItem | MenuHeading;

const holds = (it: MenuItem, id: string): boolean =>
  it.id === id || (it.items ?? []).some((c) => holds(c, id));

/**
 * The export's SideMenu (fifth export): section headings, categories that fold open with their
 * pages on an indented margin line, and pages. Three levels at most. The current page wears the
 * pick; its category turns bold and opens, also when the current page changes (the System page's
 * scroll-spy). Hover on a mouse is a quiet fill. Rows are 48 px, sub-rows 44 px with smaller
 * words, as the export draws them.
 */
export function SideMenu({
  label,
  items,
  current,
  onPick,
  framed = true,
  title,
}: {
  label: string;
  items: readonly MenuEntry[];
  current: string;
  onPick?: ((id: string) => void) | undefined;
  framed?: boolean;
  title?: string;
}): JSX.Element {
  const categories = items.filter((it): it is MenuItem => "id" in it && it.items !== undefined);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, c.open === true || holds(c, current)])),
  );
  // The current page moved into a closed category: open it. A category the menu opened that way
  // closes again once the current page leaves it; one the reader opened stays open.
  const opened = useRef(new Set<string>());
  useEffect(() => {
    const home = categories.find((c) => holds(c, current))?.id;
    setOpen((o) => {
      const next = { ...o };
      for (const id of opened.current) {
        if (id === home) continue;
        next[id] = false;
        opened.current.delete(id);
      }
      if (home !== undefined && !next[home]) {
        next[home] = true;
        opened.current.add(home);
      }
      return next;
    });
    // The categories are fixed for the menu's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // A menu taller than its box scrolls: keep the current page in sight once its category is open.
  // Only the menu's own box moves, never the page (scrollIntoView would scroll the window too).
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = nav.current?.querySelector<HTMLElement>("[aria-current]");
    const box = nav.current?.parentElement;
    if (!el || !box || box.scrollHeight <= box.clientHeight) return;
    const r = el.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    if (r.top < b.top) box.scrollTop -= b.top - r.top;
    else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom;
  }, [current, open]);

  const row = (it: MenuItem, sub: boolean): JSX.Element => {
    const category = it.items !== undefined;
    const on = !category && it.id === current;
    const inside = category && holds(it, current);
    const isOpen = category && open[it.id] === true;
    const look = cn(
      "flex w-full items-center gap-3 rounded-[var(--jw-radius-small)] border-2 px-3 text-left transition-colors duration-[var(--jw-dur-fast)]",
      sub ? "min-h-11 py-2 text-base" : "min-h-12 py-2 text-lg",
      on
        ? "border-[var(--jw-pick-edge)] bg-[var(--jw-pick)] font-bold text-[var(--jw-pick-ink)]"
        : "border-transparent text-foreground hover:bg-[var(--jw-act-quiet)]",
      !on && (inside ? "font-bold" : sub ? "font-normal" : "font-semibold"),
    );
    const body = (
      <>
        {it.icon && (
          <span
            className={cn(
              "grid w-6 shrink-0 place-items-center",
              on ? "text-[var(--jw-pick-ink)]" : "text-muted-foreground",
            )}
          >
            {it.icon}
          </span>
        )}
        <span className="flex-1">{it.label}</span>
        {category && (
          <ChevronRight
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--jw-dur-fast)] ease-[var(--jw-ease-out)]",
              isOpen && "rotate-90",
            )}
          />
        )}
      </>
    );
    if (category) {
      return (
        <div key={it.id} className="flex flex-col">
          <button
            type="button"
            aria-expanded={isOpen}
            className={look}
            onClick={() => {
              opened.current.delete(it.id);
              setOpen((o) => ({ ...o, [it.id]: !isOpen }));
            }}
          >
            {body}
          </button>
          {isOpen && (
            <div
              role="group"
              aria-label={typeof it.label === "string" ? it.label : undefined}
              className="mb-1 ml-[1.375rem] flex flex-col gap-0.5 border-l-2 border-[var(--jw-line)] pl-2.5"
            >
              {it.items?.map((c) => row(c, true))}
            </div>
          )}
        </div>
      );
    }
    return it.href ? (
      <a
        key={it.id}
        href={it.href}
        aria-current={on ? "page" : undefined}
        className={look}
        onClick={() => onPick?.(it.id)}
      >
        {body}
      </a>
    ) : (
      <button
        key={it.id}
        type="button"
        aria-current={on ? "page" : undefined}
        className={look}
        onClick={() => onPick?.(it.id)}
      >
        {body}
      </button>
    );
  };

  return (
    <nav
      ref={nav}
      aria-label={label}
      className={cn(
        "flex flex-col gap-1",
        framed &&
          "rounded-[var(--jw-radius-card)] border-2 border-[var(--jw-line)] bg-[var(--jw-card)] p-3",
      )}
    >
      {title && (
        <span className="px-3 pt-1 pb-2 text-base font-bold text-muted-foreground">{title}</span>
      )}
      {items.map((it, i) =>
        "heading" in it ? (
          <span
            key={`h-${it.heading}`}
            className={cn(
              "px-3 pb-1.5 text-[0.8125rem] leading-tight font-bold tracking-[0.08em] text-muted-foreground uppercase",
              i > 0 ? "mt-4 border-t-2 border-[var(--jw-line)] pt-4" : "pt-1",
            )}
          >
            {it.heading}
          </span>
        ) : (
          row(it, false)
        ),
      )}
    </nav>
  );
}
