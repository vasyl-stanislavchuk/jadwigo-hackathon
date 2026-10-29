// A stand-in for packages/ui's Table and Sheet (dl-uukj.30.3), with shadcn/ui's documented props,
// until the ui lane's branch is merged in. Then this file goes and the imports name @jadwigo/ui.
import { cn } from "@jadwigo/ui";
import { Dialog as SheetPrimitive } from "radix-ui";
import type * as React from "react";

export function Table({ className, ...props }: React.ComponentProps<"table">): React.JSX.Element {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader(props: React.ComponentProps<"thead">): React.JSX.Element {
  return <thead data-slot="table-header" {...props} />;
}

export function TableBody(props: React.ComponentProps<"tbody">): React.JSX.Element {
  return <tbody data-slot="table-body" {...props} />;
}

export function TableFooter(props: React.ComponentProps<"tfoot">): React.JSX.Element {
  return <tfoot data-slot="table-footer" {...props} />;
}

export function TableRow(props: React.ComponentProps<"tr">): React.JSX.Element {
  return <tr data-slot="table-row" {...props} />;
}

export function TableHead(props: React.ComponentProps<"th">): React.JSX.Element {
  return <th data-slot="table-head" {...props} />;
}

export function TableCell(props: React.ComponentProps<"td">): React.JSX.Element {
  return <td data-slot="table-cell" {...props} />;
}

export function TableCaption(props: React.ComponentProps<"caption">): React.JSX.Element {
  return <caption data-slot="table-caption" {...props} />;
}

export function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>): React.JSX.Element {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

export function SheetContent({
  className,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
}): React.JSX.Element {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/20" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col gap-4 overflow-y-auto bg-popover p-4 text-popover-foreground shadow-lg",
          className,
        )}
        {...props}
      />
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5", className)} {...props} />
  );
}

export function SheetTitle(
  props: React.ComponentProps<typeof SheetPrimitive.Title>,
): React.JSX.Element {
  return <SheetPrimitive.Title data-slot="sheet-title" {...props} />;
}

export function SheetDescription(
  props: React.ComponentProps<typeof SheetPrimitive.Description>,
): React.JSX.Element {
  return <SheetPrimitive.Description data-slot="sheet-description" {...props} />;
}
