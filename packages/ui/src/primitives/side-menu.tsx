// The side menu (dl-uukj.32.3, promoted from the System page's settings controls): section
// headings, categories that fold open with their pages on an indented margin line, and pages. Three
// levels at most. The current page wears the pick; its category turns bold and opens, also when the
// current page changes (a scroll-spy). Rows are 48 px, sub-rows 44 px with smaller words.
import { ChevronRight } from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "../lib/utils.ts";
import { FOCUS, ROW } from "./choice.ts";

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
interface MenuHeading {
  heading: string;
}

export type MenuEntry = MenuItem | MenuHeading;

const holds = (it: MenuItem, id: string): boolean =>
  it.id === id || (it.items ?? []).some((c) => holds(c, id));

function SideMenu({
  label,
  items,
  current,
  onPick,
  framed = true,
  title,
  className,
}: {
  label: string;
  items: readonly MenuEntry[];
  current: string;
  onPick?: ((id: string) => void) | undefined;
  /** Draw the menu on its own card. */
  framed?: boolean;
  title?: string;
  className?: string;
}): ReactElement {
  const own = useId();
  const categories = items.filter((it): it is MenuItem => "id" in it && it.items !== undefined);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, c.open === true || holds(c, current)])),
  );
  // The current page moved into a closed category: open it. A category the menu opened that way
  // closes again once the current page leaves it; one the reader opened stays open.
  const opened = useRef(new Set<string>());
  // The categories are fixed for the menu's life, so current alone triggers it.
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

  const row = (it: MenuItem, sub: boolean): ReactElement => {
    const category = it.items !== undefined;
    const on = !category && it.id === current;
    const inside = category && holds(it, current);
    const isOpen = category && open[it.id] === true;
    const look = cn(
      "flex w-full items-center gap-3 rounded-jw-small border-2 px-3 py-2 text-left transition-colors duration-jw-fast",
      FOCUS,
      ROW[sub ? "sm" : "md"],
      on
        ? "border-jw-pick-edge bg-jw-pick font-bold text-jw-pick-ink"
        : "border-transparent text-jw-ink hover:bg-jw-act-quiet",
      !on && (inside ? "font-bold" : sub ? "font-normal" : "font-semibold"),
    );
    const body = (
      <>
        {it.icon && (
          <span
            className={cn(
              "grid w-6 shrink-0 place-items-center",
              on ? "text-jw-pick-ink" : "text-jw-ink-soft",
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
              "size-4 shrink-0 text-jw-ink-soft transition-transform duration-jw-fast ease-jw-out",
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
            id={`${own}-${it.id}`}
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
            // biome-ignore lint/a11y/useSemanticElements: a group of menu rows, not a form: a fieldset would draw a form group
            <div
              role="group"
              aria-labelledby={`${own}-${it.id}`}
              className="mb-1 ml-5.5 flex flex-col gap-0.5 border-l-2 border-jw-line pl-2.5"
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
      data-slot="side-menu"
      className={cn(
        "flex flex-col gap-1",
        framed && "rounded-jw-card border-2 border-jw-line bg-jw-card p-3",
        className,
      )}
    >
      {title && (
        <span className="px-3 pt-1 pb-2 text-jw-body font-bold text-jw-ink-soft">{title}</span>
      )}
      {items.map((it, i) =>
        "heading" in it ? (
          <span
            key={`h-${it.heading}`}
            className={cn(
              "px-3 pb-1.5 text-jw-small leading-tight font-bold tracking-wider text-jw-ink-soft uppercase",
              i > 0 ? "mt-4 border-t-2 border-jw-line pt-4" : "pt-1",
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

export { SideMenu };
