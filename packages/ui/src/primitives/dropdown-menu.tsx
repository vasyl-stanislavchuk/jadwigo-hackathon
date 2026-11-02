// shadcn/ui dropdown menu (radix-ui) for actions and settings (handoff dl-uukj.47.67 §6.4, §6.6, S7):
// the account menu with its Język strony ▸ radio submenu, a row's ⋯, Widok's column toggles. Rows,
// checkbox and radio rows, a label, a separator and a submenu; the float's look (surface.ts). Radix
// moves through the rows with ↑ ↓, opens a submenu with →, closes on Esc and gives the focus back to
// the trigger. Words come from the caller.
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { DropdownMenu as MenuPrimitive } from "radix-ui";
import * as React from "react";
import { usePortalAudience } from "../lib/audience.ts";
import { useDensity } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";
import {
  MENU_CHOICE,
  MENU_CONTENT,
  MENU_ITEM,
  MENU_LABEL,
  MENU_MARK,
  MENU_SEPARATOR,
} from "./surface.ts";

function DropdownMenu(props: React.ComponentProps<typeof MenuPrimitive.Root>): JSX.Element {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Trigger>
>(function DropdownMenuTrigger(props, ref) {
  return <MenuPrimitive.Trigger ref={ref} data-slot="dropdown-menu-trigger" {...props} />;
});

function DropdownMenuContent({
  className,
  sideOffset = 4,
  align = "start",
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Content>): JSX.Element {
  // A portal leaves the density's and the audience's subtree, so the content carries them again.
  const density = useDensity();
  const audience = usePortalAudience();
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        data-slot="dropdown-menu-content"
        data-density={density}
        data-audience={audience}
        sideOffset={sideOffset}
        align={align}
        className={cn(MENU_CONTENT, className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item>): JSX.Element {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(MENU_ITEM, className)}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>): JSX.Element {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(MENU_CHOICE, className)}
      {...props}
    >
      <span className={MENU_MARK}>
        <MenuPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup(
  props: React.ComponentProps<typeof MenuPrimitive.RadioGroup>,
): JSX.Element {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.RadioItem>): JSX.Element {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(MENU_CHOICE, className)}
      {...props}
    >
      <span className={MENU_MARK}>
        <MenuPrimitive.ItemIndicator>
          <CircleIcon aria-hidden="true" className="size-2 fill-current" />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Label>): JSX.Element {
  return (
    <MenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn(MENU_LABEL, className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>): JSX.Element {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn(MENU_SEPARATOR, className)}
      {...props}
    />
  );
}

function DropdownMenuSub(props: React.ComponentProps<typeof MenuPrimitive.Sub>): JSX.Element {
  return <MenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubTrigger>): JSX.Element {
  return (
    <MenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(MENU_ITEM, "data-[state=open]:bg-accent", className)}
      {...props}
    >
      {children}
      <ChevronRightIcon aria-hidden="true" className="ml-auto" />
    </MenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubContent>): JSX.Element {
  const density = useDensity();
  const audience = usePortalAudience();
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.SubContent
        data-slot="dropdown-menu-sub-content"
        data-density={density}
        data-audience={audience}
        className={cn(MENU_CONTENT, className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
