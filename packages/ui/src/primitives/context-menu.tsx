// shadcn/ui context menu (radix-ui): a right-click (or a long press) repeats a row's ⋯ actions
// (handoff dl-uukj.47.67 §6.4, S16: Otwórz · Daj lekcję · Drukuj · Archiwizuj). The dropdown menu's
// rows and look (surface.ts); Radix's keys, Esc closes. Words come from the caller.
import { ContextMenu as MenuPrimitive } from "radix-ui";
import type * as React from "react";
import { usePortalAudience } from "../lib/audience.ts";
import { useDensity } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";
import { MENU_CONTENT, MENU_ITEM, MENU_SEPARATOR } from "./surface.ts";

function ContextMenu(props: React.ComponentProps<typeof MenuPrimitive.Root>): JSX.Element {
  return <MenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuTrigger(
  props: React.ComponentProps<typeof MenuPrimitive.Trigger>,
): JSX.Element {
  return <MenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}

function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Content>): JSX.Element {
  const density = useDensity();
  const audience = usePortalAudience();
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        data-slot="context-menu-content"
        data-density={density}
        data-audience={audience}
        className={cn(MENU_CONTENT, className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

function ContextMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item>): JSX.Element {
  return (
    <MenuPrimitive.Item
      data-slot="context-menu-item"
      className={cn(MENU_ITEM, className)}
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>): JSX.Element {
  return (
    <MenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn(MENU_SEPARATOR, className)}
      {...props}
    />
  );
}

export {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
};
