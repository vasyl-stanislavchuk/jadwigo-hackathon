/**
 * The right-hand controls panel. The shell owns the panel; a view fills it with <Controls>, a
 * portal, so a lesson's own state (its simulated server, its log) stays in the lesson view while
 * its switches sit in the sidebar.
 */

import { createContext, type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";
import { Label } from "../tool/label.tsx";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "../tool/sidebar.tsx";
import { ToggleGroup, ToggleGroupItem } from "../tool/toggle-group.tsx";

export const ControlsTarget = createContext<HTMLElement | null>(null);

export function Controls({ children }: { children: ReactNode }): JSX.Element | null {
  const target = useContext(ControlsTarget);
  return target === null ? null : createPortal(children, target);
}

/** One group in the controls panel: a small heading, an optional line on what it does, its controls. */
export function ControlGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-3 px-2">
        {hint !== undefined && (
          <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
        )}
        {children}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/** The segments never clip their words (dl-w3.61 smoke test: "Same liczby" read "ame liczb" in a narrow column). Each segment is at least as wide as its label
 * (min-w-fit beats the toggle's small min-width) and grows to share the row; when the row is too
 * narrow the segments wrap onto a second line, and a label longer than the whole row wraps inside
 * its segment. Segments stand a hair apart (spacing 1), each with its own border and corners, so a
 * wrapped row still reads as buttons. */
const SEGMENTED_GROUP = "w-full flex-wrap";
const SEGMENTED_ITEM =
  "h-auto min-h-8 min-w-fit max-w-full flex-auto whitespace-normal py-1 text-center text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground";

/** A labelled single choice drawn as a segmented toggle: language, learner, network, feedback. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  /** `disabled` greys an option out and keeps it in place, with its title saying why. */
  options: readonly { value: T; label: string; title?: string; disabled?: boolean }[];
  onChange(next: T): void;
}): JSX.Element {
  const id = `seg-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label id={id} className="text-xs font-medium">
        {label}
      </Label>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={1}
        value={value}
        aria-labelledby={id}
        onValueChange={(next: string) => {
          if (next) onChange(next as T);
        }}
        className={SEGMENTED_GROUP}
      >
        {options.map((o) => (
          <ToggleGroupItem
            key={o.value}
            value={o.value}
            title={o.title}
            disabled={o.disabled}
            className={SEGMENTED_ITEM}
          >
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
