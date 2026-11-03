// A list's filter facet (handoff dl-uukj.47.67 §7.1, S14): a dashed outline button with `plus-circle`
// and the facet's name; once set, a divider and up to 2 value chips, then one "3 wybrane". It opens a
// Popover of checkbox rows (an optional leading disc, the name, a count), with "Wyczyść wybór" at the
// foot. No search (D13). `single` makes it a pick of one, for the Data facet's presets. The app owns
// the options, their order ("Bez dziecka" last, by count) and every word; `hidden` is its call (S17).
// FacetToggles draws the same choice as a group of toggles, for the phone's filter sheet (S22).
import { PlusCircleIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useId } from "react";
import { PAGE_FOCUS } from "../lib/register.tsx";
import { Button } from "../primitives/button.tsx";
import { Checkbox } from "../primitives/checkbox.tsx";
import { Chip } from "../primitives/chip.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../primitives/popover.tsx";

export type FacetOption = {
  value: string;
  label: string;
  /** How many rows it would show, given the other filters. */
  count?: number;
  /** Drawn before the name: a child's Disc. */
  leading?: ReactNode;
};

export type FacetChoice = {
  /** The facet's name, from copy: "Dziecko". */
  label: string;
  options: readonly FacetOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  /** One value at a time: picking one replaces the other. */
  single?: boolean;
  /** Replaces `plus-circle`: the Data facet's calendar. */
  icon?: ReactNode;
  /** Not drawn at all (S17: no Dziecko facet with one child). */
  hidden?: boolean;
};

type FacetProps = FacetChoice & {
  /** The footer's words: "Wyczyść wybór". */
  clearLabel: string;
  /** More than 2 picked: "3 wybrane". */
  countLabel: (count: number) => string;
};

function toggle(choice: FacetChoice, value: string, on: boolean): string[] {
  if (choice.single) return on ? [value] : [];
  return on ? [...choice.value, value] : choice.value.filter((v) => v !== value);
}

function Facet({ clearLabel, countLabel, ...choice }: FacetProps): ReactElement | null {
  const { label, options, value, icon, hidden } = choice;
  const id = useId();
  if (hidden) return null;
  const picked = options.filter((o) => value.includes(o.value));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="control"
          data-slot="facet"
          className="gap-1.5 border-dashed border-jw-facet-edge in-data-[audience=adult]:border-jw-facet-edge"
        >
          {icon ?? <PlusCircleIcon aria-hidden="true" />}
          {label}
          {picked.length > 0 && (
            <>
              <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
              {picked.length > 2 ? (
                <Chip>{countLabel(picked.length)}</Chip>
              ) : (
                picked.map((o) => <Chip key={o.value}>{o.label}</Chip>)
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 gap-0 p-1">
        <fieldset aria-label={label} className="flex max-h-80 flex-col overflow-y-auto">
          {options.map((o) => (
            // The row is the target: a click on its name checks the box, and Space on the box does.
            <label
              key={o.value}
              htmlFor={`${id}-${o.value}`}
              className="flex min-h-8 cursor-default items-center gap-2 rounded-jw-small px-2 text-jw-page-body hover:bg-muted"
            >
              <Checkbox
                id={`${id}-${o.value}`}
                aria-label={o.label}
                checked={value.includes(o.value)}
                onCheckedChange={(on) => choice.onChange(toggle(choice, o.value, on === true))}
                className={PAGE_FOCUS}
              />
              {o.leading}
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.count !== undefined && (
                <span className="text-jw-page-small text-muted-foreground tabular-nums">
                  {o.count}
                </span>
              )}
            </label>
          ))}
        </fieldset>
        {value.length > 0 && (
          <>
            <div aria-hidden="true" className="-mx-1 my-1 h-px bg-border" />
            <Button variant="ghost" size="sm" onClick={() => choice.onChange([])}>
              {clearLabel}
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** The same choice as a row of toggles, 36 tall, for the phone's filter sheet (§6.10 Drawer). */
function FacetToggles(choice: FacetChoice): ReactElement | null {
  if (choice.hidden) return null;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-jw-page-small font-medium text-muted-foreground">
        {choice.label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {choice.options.map((o) => {
          const on = choice.value.includes(o.value);
          return (
            <Button
              key={o.value}
              variant="outline"
              size="control"
              aria-pressed={on}
              onClick={() => choice.onChange(toggle(choice, o.value, !on))}
              className="min-h-9 gap-1.5 px-3 aria-pressed:border-selected-edge aria-pressed:bg-selected aria-pressed:text-selected-foreground aria-pressed:hover:bg-selected"
            >
              {o.leading}
              {o.label}
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}

export { Facet, FacetToggles };
