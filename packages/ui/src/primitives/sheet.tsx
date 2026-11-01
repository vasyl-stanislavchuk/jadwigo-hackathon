// shadcn/ui sheet (radix-ui Dialog), promoted from the playground's tool copy
// (apps/web/src/playground/tool/sheet.tsx) for the parent's lesson overview (dl-uukj.30.3): a panel
// that slides from one edge, closes on Escape, a tap outside or its close, and returns focus to its
// trigger. The close cross is a kid-sized ghost Button whose name the caller passes from copy;
// without a closeLabel it draws none. Colours are the theme's popover names.
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import type * as React from "react";
import { useDensity } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";
import { Button } from "./button.tsx";

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>): JSX.Element {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>): JSX.Element {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>): JSX.Element {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>): JSX.Element {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn("fixed inset-0 z-50 bg-foreground/20", className)}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  closeLabel,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  closeLabel?: string;
}): JSX.Element {
  // A portal leaves the density's subtree, so the content carries it again (lib/register.tsx).
  const density = useDensity();
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-density={density}
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 overflow-y-auto border-border bg-popover text-base text-popover-foreground shadow-lg outline-none data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:max-h-[85dvh] data-[side=bottom]:rounded-t-2xl data-[side=bottom]:border-t-jw data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:w-3/4 data-[side=left]:border-r-jw data-[side=left]:sm:max-w-sm data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:w-3/4 data-[side=right]:border-l-jw data-[side=right]:sm:max-w-sm data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:max-h-[85dvh] data-[side=top]:rounded-b-2xl data-[side=top]:border-b-jw",
          className,
        )}
        {...props}
      >
        {children}
        {closeLabel !== undefined && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button variant="ghost" size="icon" className="absolute top-2 right-2">
              <XIcon aria-hidden="true" />
              <span className="sr-only">{closeLabel}</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">): JSX.Element {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">): JSX.Element {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>): JSX.Element {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-xl font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>): JSX.Element {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-base text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
