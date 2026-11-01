// A dialog (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-column-lesson-workspac,
// dl-xo0q, "small creation = dialog"): making something with 1 to 3 fields opens it and leaves the
// page as it was. 440 wide, corners 14, on a 40% ink scrim. Radix Dialog traps the focus, closes on
// Escape or a tap on the scrim, and gives the focus back to the control that opened it. Its content
// carries the density through the portal (lib/register.tsx). The title is required: a dialog is
// named by it.
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { useDensity } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>): ReactElement {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>): ReactElement {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>): ReactElement {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogContent({
  title,
  description,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DialogPrimitive.Content>, "title"> & {
  title: ReactNode;
  /** A line under the title. Without one the dialog has no description. */
  description?: ReactNode;
}): ReactElement {
  const density = useDensity();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        data-density={density}
        className="fixed inset-0 z-50 bg-jw-ink/40"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-density={density}
        // Radix warns without a description; a dialog that has none says so.
        {...(description === undefined ? { "aria-describedby": undefined } : {})}
        className={cn(
          "fixed inset-x-4 top-1/2 z-50 mx-auto flex max-w-jw-dialog -translate-y-1/2 flex-col gap-4 rounded-jw-dialog border-jw border-jw-line bg-jw-card p-6 text-jw-page-body leading-jw-page text-jw-ink outline-none",
          className,
        )}
        {...props}
      >
        <div className="flex flex-col gap-1">
          <DialogPrimitive.Title className="text-jw-page-h1 leading-tight font-bold">
            {title}
          </DialogPrimitive.Title>
          {description !== undefined && (
            <DialogPrimitive.Description className="text-jw-page-small text-jw-ink-soft">
              {description}
            </DialogPrimitive.Description>
          )}
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** The dialog's buttons: secondary then primary, on the right. */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex justify-end gap-2 pt-2", className)}
      {...props}
    />
  );
}

export { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger };
