// shadcn/ui table (shadcn@4.21.1 registry "table"), for the parent's lesson overview (dl-uukj.30.3):
// the wrapper scrolls sideways, so a wide grid never scrolls a phone's page. Rows are spaced by
// padding rather than a literal height, and every colour is a theme name.
import type * as React from "react";
import { cn } from "../lib/utils.ts";

function Table({ className, ...props }: React.ComponentProps<"table">): JSX.Element {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-base text-foreground", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">): JSX.Element {
  return (
    <thead data-slot="table-header" className={cn("[&_tr]:border-b-2", className)} {...props} />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">): JSX.Element {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">): JSX.Element {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t-2 border-border bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">): JSX.Element {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">): JSX.Element {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-2 py-2 text-left align-middle font-semibold whitespace-nowrap text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">): JSX.Element {
  return (
    <td
      data-slot="table-cell"
      className={cn("p-2 align-middle whitespace-nowrap", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">): JSX.Element {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
