// A list's filter bar (handoff dl-uukj.47.67 §7.1, D9, S22, S23). On a laptop it is always one row:
// the facets in a strip that scrolls sideways under a 24 px fade, a 1 px divider, then Widok (an icon
// button with its tooltip) and "Wyczyść ×" (only while a filter is set) pinned right. Below 768 it is
// "Filtry (n)" and the sort, and the filters open in a bottom Sheet whose primary states the count
// ("Pokaż 38 lekcji"). Both are in the page and CSS shows one, so the first paint is already right.
// ViewMenu (Widok) and SortMenu are the two menus it pins; the app owns the state and every word.
import { ArrowUpDownIcon, FilterIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../lib/utils.ts";
import { Button } from "../primitives/button.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu.tsx";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../primitives/sheet.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../primitives/tooltip.tsx";
import { Facet, type FacetChoice, FacetToggles } from "./facet.tsx";

export type FilterBarFacet = FacetChoice & { id: string };

export type FilterBarLabels = {
  /** A facet's footer: "Wyczyść wybór". */
  clearChoice: string;
  /** More than 2 values in a facet: "3 wybrane". */
  chosen: (count: number) => string;
  /** Clears every filter: "Wyczyść". */
  clearAll: string;
  /** The phone's button: "Filtry (2)". */
  filters: (count: number) => string;
  /** The phone sheet's title and its close: "Filtry", "Zamknij". */
  sheetTitle: string;
  sheetClose: string;
  /** The phone sheet's primary, stating the result: "Pokaż 38 lekcji". */
  show: string;
};

const pickedCount = (facets: readonly FilterBarFacet[]) =>
  facets.reduce((n, f) => n + (f.hidden ? 0 : f.value.length), 0);

/**
 * The active filters in words, for the empty-filtered state (§7.3): "Marta, Ola · Zrobiona".
 * Empty when nothing is set.
 */
function activeFilterWords(facets: readonly FilterBarFacet[]): string {
  return facets
    .filter((f) => !f.hidden && f.value.length > 0)
    .map((f) =>
      f.options
        .filter((o) => f.value.includes(o.value))
        .map((o) => o.label)
        .join(", "),
    )
    .join(" · ");
}

function FilterBar({
  facets,
  labels,
  onClear,
  view,
  sort,
  className,
}: {
  facets: readonly FilterBarFacet[];
  labels: FilterBarLabels;
  onClear: () => void;
  /** Pinned right on a laptop: a ViewMenu. */
  view?: ReactNode;
  /** Beside "Filtry (n)" on a phone: a SortMenu. */
  sort?: ReactNode;
  className?: string;
}): ReactElement {
  const count = pickedCount(facets);
  return (
    <div data-slot="filter-bar" className={className}>
      <div data-slot="filter-bar-laptop" className="flex items-center gap-2 max-md:hidden">
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {facets.map(({ id, ...facet }) => (
              <Facet
                key={id}
                {...facet}
                clearLabel={labels.clearChoice}
                countLabel={labels.chosen}
              />
            ))}
            {/* Room for the last facet to scroll clear of the fade. */}
            <span aria-hidden="true" className="w-6 shrink-0" />
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-background to-transparent"
          />
        </div>
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
        {view}
        {count > 0 && (
          <Button variant="ghost" size="control" onClick={onClear} className="gap-1.5">
            {labels.clearAll}
            <XIcon aria-hidden="true" />
          </Button>
        )}
      </div>
      <div data-slot="filter-bar-phone" className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="control" className="min-h-9 gap-1.5">
              <FilterIcon aria-hidden="true" />
              {labels.filters(count)}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" closeLabel={labels.sheetClose} aria-describedby={undefined}>
            {/* The handle, 36 × 4 (§6.10). */}
            <span aria-hidden="true" className="mx-auto mt-2 h-1 w-9 rounded-full bg-border" />
            <SheetHeader className="flex-row items-center gap-3 py-0 pr-14">
              <SheetTitle>{labels.sheetTitle}</SheetTitle>
              {count > 0 && (
                <Button variant="ghost" size="sm" onClick={onClear}>
                  {labels.clearAll}
                </Button>
              )}
            </SheetHeader>
            <div className="flex flex-col gap-5 px-4">
              {facets.map(({ id, ...facet }) => (
                <FacetToggles key={id} {...facet} />
              ))}
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button size="lg" className="w-full">
                  {labels.show}
                </Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        {sort}
      </div>
    </div>
  );
}

export type TableDensity = "comfortable" | "compact";

/**
 * Widok (S23, §7.2): an icon button with its tooltip, opening the column toggles and the density.
 * Saving the choice per device is the app's.
 */
function ViewMenu({
  label,
  columnsLabel,
  columns,
  onColumnChange,
  densityLabel,
  densities,
  density,
  onDensityChange,
}: {
  /** The button's name and tooltip: "Widok". */
  label: string;
  /** "Kolumny". */
  columnsLabel: string;
  columns: readonly { id: string; label: string; visible: boolean }[];
  onColumnChange: (id: string, visible: boolean) => void;
  /** "Gęstość". */
  densityLabel: string;
  /** "Wygodnie", "Gęsto". */
  densities: Record<TableDensity, string>;
  density: TableDensity;
  onDensityChange: (density: TableDensity) => void;
}): ReactElement {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="control" aria-label={label} className="px-0">
              <SlidersHorizontalIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{columnsLabel}</DropdownMenuLabel>
        {columns.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={c.visible}
            onCheckedChange={(on) => onColumnChange(c.id, on)}
            onSelect={(e) => e.preventDefault()}
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{densityLabel}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={density}
          onValueChange={(v) => onDensityChange(v === "compact" ? "compact" : "comfortable")}
        >
          {(Object.keys(densities) as TableDensity[]).map((d) => (
            <DropdownMenuRadioItem key={d} value={d}>
              {densities[d]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The phone's sort (S22): a menu of the orders a list offers, each with its own words. */
function SortMenu({
  label,
  options,
  value,
  onChange,
  className,
}: {
  /** The button's words: "Sortuj". */
  label: string;
  /** Each order as the URL writes it ("-ostatnio") and its words ("Ostatnio, od najnowszych"). */
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="control" className={cn("min-h-9 gap-1.5", className)}>
          <ArrowUpDownIcon aria-hidden="true" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { activeFilterWords, FilterBar, SortMenu, ViewMenu };
