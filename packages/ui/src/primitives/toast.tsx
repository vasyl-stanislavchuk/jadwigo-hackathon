// Toasts on Sonner (handoff dl-uukj.47.67 D17, §6.10): bottom right, 3 at most, a white card on the
// warm line, corners 8, the soft shadow. Light, never dark (D6); the leading icon says the kind:
//   done    Zrobione: a blue check on the pick's disc, 4 s;
//   undo    Do cofnięcia: the action's own icon on the quiet disc, an outline Cofnij, 8 s;
//   failed  Nie wyszło: the ink alert, a darker edge, words at 500, Spróbuj ponownie, until closed.
// Sonner pauses the time while the mouse is on a toast. Every word comes from the caller.
import { CheckIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Toaster as SonnerToaster, toast as sonner } from "sonner";
import { cn } from "../lib/utils.ts";
import { Button } from "./button.tsx";

type ToastAction = { label: string; onClick: () => void };

export type ToastInput =
  | { kind: "done"; text: ReactNode }
  | { kind: "undo"; text: ReactNode; icon: ReactNode; action: ToastAction }
  | { kind: "failed"; text: ReactNode; action: ToastAction; closeLabel: string };

const DURATION = { done: 4000, undo: 8000, failed: Number.POSITIVE_INFINITY } as const;

const DISC = "flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-4";

function ToastCard({ input, id }: { input: ToastInput; id: string | number }): JSX.Element {
  const failed = input.kind === "failed";
  return (
    <div
      data-slot="toast"
      data-kind={input.kind}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border bg-popover p-3 text-jw-page-body text-popover-foreground shadow-float",
        failed ? "border-control-edge font-medium" : "border-border",
      )}
    >
      {input.kind === "done" && (
        <span className={cn(DISC, "bg-selected text-link")}>
          <CheckIcon aria-hidden="true" />
        </span>
      )}
      {input.kind === "undo" && <span className={cn(DISC, "bg-muted")}>{input.icon}</span>}
      {failed && (
        <span className={DISC}>
          <TriangleAlertIcon aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">{input.text}</span>
      {input.kind !== "done" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            input.action.onClick();
            sonner.dismiss(id);
          }}
        >
          {input.action.label}
        </Button>
      )}
      {failed && (
        <Button variant="ghost" size="sm" className="px-1.5" onClick={() => sonner.dismiss(id)}>
          <XIcon aria-hidden="true" />
          <span className="sr-only">{input.closeLabel}</span>
        </Button>
      )}
    </div>
  );
}

/** Shows a toast of one kind; returns its id. */
export function showToast(input: ToastInput): string | number {
  return sonner.custom((id) => <ToastCard input={input} id={id} />, {
    duration: DURATION[input.kind],
  });
}

/** The toasts' place, once per app. `label` names the region for a screen reader ("Powiadomienia"). */
export function Toaster({ label }: { label: string }): JSX.Element {
  return (
    <SonnerToaster
      position="bottom-right"
      visibleToasts={3}
      containerAriaLabel={label}
      toastOptions={{ unstyled: true, className: "w-full" }}
    />
  );
}
