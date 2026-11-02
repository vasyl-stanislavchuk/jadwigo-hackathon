// shadcn/ui alert dialog (radix-ui), only for what can't be undone (handoff dl-uukj.47.67 S4, §6.10):
// "Usunąć Kubę na zawsze?", a body that names what disappears and the reversible way instead, then an
// outline Anuluj and the primary "Usuń na zawsze", never black and never red (D6, S3). The Dialog's
// box with the deeper shadow. Radix keeps the focus inside, starts it on Anuluj, closes on Esc but
// not on the scrim, and gives the focus back to the opener. Words come from the caller.
import { AlertDialog as AlertPrimitive } from "radix-ui";
import * as React from "react";
import { usePortalAudience } from "../lib/audience.ts";
import { useDensity } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";
import { Button } from "./button.tsx";
import { DIALOG_BOX, DIALOG_OVERLAY } from "./surface.ts";

function AlertDialog(props: React.ComponentProps<typeof AlertPrimitive.Root>): JSX.Element {
  return <AlertPrimitive.Root data-slot="alert-dialog" {...props} />;
}

const AlertDialogTrigger = React.forwardRef<
  React.ElementRef<typeof AlertPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AlertPrimitive.Trigger>
>(function AlertDialogTrigger(props, ref) {
  return <AlertPrimitive.Trigger ref={ref} data-slot="alert-dialog-trigger" {...props} />;
});

function AlertDialogContent({
  title,
  description,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof AlertPrimitive.Content>, "title"> & {
  title: React.ReactNode;
  /** What disappears, and the reversible way instead. */
  description: React.ReactNode;
}): JSX.Element {
  const density = useDensity();
  const audience = usePortalAudience();
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Overlay
        data-slot="alert-dialog-overlay"
        data-density={density}
        className={DIALOG_OVERLAY}
      />
      <AlertPrimitive.Content
        data-slot="alert-dialog-content"
        data-density={density}
        data-audience={audience}
        className={cn(DIALOG_BOX, "shadow-dialog", className)}
        {...props}
      >
        <div className="flex flex-col gap-1">
          <AlertPrimitive.Title className="text-jw-page-h2 font-semibold">
            {title}
          </AlertPrimitive.Title>
          <AlertPrimitive.Description className="text-jw-page-body text-muted-foreground">
            {description}
          </AlertPrimitive.Description>
        </div>
        {children}
      </AlertPrimitive.Content>
    </AlertPrimitive.Portal>
  );
}

/** The footer: Anuluj, then the one action, on the right. */
function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">): JSX.Element {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex justify-end gap-2 pt-2", className)}
      {...props}
    />
  );
}

/** The one thing that can't be undone, as the view's primary. */
function AlertDialogAction({
  children,
  ...props
}: React.ComponentProps<typeof AlertPrimitive.Action>): JSX.Element {
  return (
    <AlertPrimitive.Action asChild {...props}>
      <Button size="control">{children}</Button>
    </AlertPrimitive.Action>
  );
}

function AlertDialogCancel({
  children,
  ...props
}: React.ComponentProps<typeof AlertPrimitive.Cancel>): JSX.Element {
  return (
    <AlertPrimitive.Cancel asChild {...props}>
      <Button variant="outline" size="control">
        {children}
      </Button>
    </AlertPrimitive.Cancel>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
};
