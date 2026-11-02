// A Combobox (handoff dl-uukj.47.67 §6.4, §6.5, S8): one pick with rich rows and an optional create
// item, a Popover with a radio list and no search input (D13). The screen fills it (the Dla picker:
// "Bez dziecka" first, a disc, a name and "klasa N" in each row). Keys: ↓ or Enter opens on the pick;
// ↑ ↓ move, Home and End jump, Enter or Space picks, a typed letter jumps to the next row whose
// words start with it, Esc closes; the focus goes back to the trigger. The footer item closes the list,
// gives the focus back to the trigger, then runs, so a dialog it opens returns the focus there too.
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/utils.ts";
import { ADULT_FIELD } from "./input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.tsx";
import { MENU_ITEM, MENU_SEPARATOR } from "./surface.ts";

export interface ComboboxOption {
  value: string;
  /** The row's words: what a typed letter matches, and the row's name. */
  label: string;
}

function Combobox<T extends ComboboxOption>({
  label,
  options,
  value,
  onChange,
  renderValue,
  renderOption,
  footer,
  className,
}: {
  /** The control's name ("Dla"). */
  label: string;
  options: readonly T[];
  value: string;
  onChange(value: string): void;
  /** The trigger's face for the pick (undefined when nothing matches the value). */
  renderValue?: (option: T | undefined) => ReactNode;
  /** A rich row; the label alone by default. The check on the pick is drawn after it. */
  renderOption?: (option: T) => ReactNode;
  /** A create item under a line: "+ Dodaj dziecko…". */
  footer?: { label: ReactNode; onSelect(): void };
  className?: string;
}): ReactElement {
  const id = useId();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const rows = useRef<(HTMLElement | null)[]>([]);
  const pending = useRef<(() => void) | null>(null);
  const picked = options.find((o) => o.value === value);
  const count = options.length + (footer === undefined ? 0 : 1);

  const focusRow = (i: number): void => rows.current[(i + count) % count]?.focus();
  const current = (): number => rows.current.indexOf(document.activeElement as HTMLElement);

  function pick(next: string): void {
    onChange(next);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const at = current();
    if (event.key === "ArrowDown") focusRow(at + 1);
    else if (event.key === "ArrowUp") focusRow(at < 0 ? count - 1 : at - 1);
    else if (event.key === "Home") focusRow(0);
    else if (event.key === "End") focusRow(count - 1);
    else if (event.key.length === 1 && /\p{L}|\p{N}/u.test(event.key)) {
      const letter = event.key.toLocaleLowerCase("pl");
      const from = at < 0 ? 0 : at + 1;
      const order = [...options.slice(from), ...options.slice(0, from)];
      const hit = order.find((o) => o.label.toLocaleLowerCase("pl").startsWith(letter));
      if (hit !== undefined) focusRow(options.indexOf(hit));
      else return;
    } else return;
    event.preventDefault();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={trigger}
          type="button"
          role="combobox"
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className={cn(
            ADULT_FIELD,
            "inline-flex min-h-jw-control w-auto items-center gap-2 text-left hover:bg-muted [&_svg]:shrink-0",
            className,
          )}
        >
          {renderValue === undefined ? picked?.label : renderValue(picked)}
          <ChevronsUpDownIcon aria-hidden="true" className="ml-auto size-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-70 gap-0 p-1 text-jw-page-body"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const at = options.findIndex((o) => o.value === value);
          focusRow(Math.max(at, 0));
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          trigger.current?.focus();
          const run = pending.current;
          pending.current = null;
          run?.();
        }}
      >
        {/* The rows take the focus one at a time; the keys move it, the footer included. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: it only hands its rows' keys on */}
        <div onKeyDown={onKeyDown} className="flex flex-col">
          <div
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            className="flex max-h-80 flex-col overflow-y-auto"
          >
            {options.map((o, i) => (
              <div
                key={o.value}
                ref={(el) => {
                  rows.current[i] = el;
                }}
                role="option"
                aria-selected={o.value === value}
                tabIndex={-1}
                onClick={() => pick(o.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    pick(o.value);
                  }
                }}
                className={cn(MENU_ITEM, "focus:bg-accent focus-visible:shadow-none")}
              >
                {renderOption === undefined ? o.label : renderOption(o)}
                {o.value === value && (
                  <CheckIcon aria-hidden="true" className="ml-auto text-primary" />
                )}
              </div>
            ))}
          </div>
          {footer !== undefined && (
            <>
              <div role="presentation" className={MENU_SEPARATOR} />
              <button
                ref={(el) => {
                  rows.current[options.length] = el;
                }}
                type="button"
                tabIndex={-1}
                onClick={() => {
                  pending.current = footer.onSelect;
                  setOpen(false);
                }}
                className={cn(MENU_ITEM, "w-full text-left focus:bg-accent")}
              >
                {footer.label}
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox };
