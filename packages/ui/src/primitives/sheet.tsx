// shadcn/ui sheet (radix-ui Dialog), promoted from the playground's tool copy
// (apps/web/src/playground/tool/sheet.tsx) for the parent's lesson overview (dl-uukj.30.3): a panel
// that slides from one edge, closes on Escape, a tap outside or its close, and returns focus to its
// trigger. The close cross is a kid-sized ghost Button whose name the caller passes from copy;
// without a closeLabel it draws none. Colours are the theme's popover names. The overlay forwards
// its ref: Radix's portal hands it one, and on React 18 a plain function component cannot take it
// (dl-uukj.47.26). On an app page it is the adult's (handoff dl-uukj.47.67 §6.10): the dialog shadow,
// a bottom sheet's corners 8, a title 16/600, and a close the control's size; a lesson's keeps its
// look.
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import * as React from "react";
import { usePortalAudience } from "../lib/audience.ts";
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

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(function SheetOverlay({ className, ...props }, ref) {
  return (
    <SheetPrimitive.Overlay
      ref={ref}
      data-slot="sheet-overlay"
      className={cn("fixed inset-0 z-50 bg-foreground/20", className)}
      {...props}
    />
  );
});

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
  const audience = usePortalAudience();
  const adult = audience === "adult";
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-density={density}
        data-audience={audience}
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 overflow-y-auto border-border bg-popover text-base text-popover-foreground outline-none data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:max-h-[85dvh] data-[side=bottom]:rounded-t-2xl data-[side=bottom]:border-t-jw data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:w-3/4 data-[side=left]:border-r-jw data-[side=left]:sm:max-w-sm data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:w-3/4 data-[side=right]:border-l-jw data-[side=right]:sm:max-w-sm data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:max-h-[85dvh] data-[side=top]:rounded-b-2xl data-[side=top]:border-b-jw",
          adult
            ? "shadow-dialog data-[side=bottom]:rounded-t-md data-[side=top]:rounded-b-md"
            : "shadow-lg",
          className,
        )}
        {...props}
      >
        {children}
        {closeLabel !== undefined && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button
              variant="ghost"
              size={adult ? "control" : "icon"}
              className={cn("absolute top-2 right-2", adult && "px-0")}
            >
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
  const adult = usePortalAudience() === "adult";
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        adult ? "text-jw-page-h2" : "text-xl",
        "font-semibold text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>): JSX.Element {
  const adult = usePortalAudience() === "adult";
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn(adult ? "text-jw-page-small" : "text-base", "text-muted-foreground", className)}
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
