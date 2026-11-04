/**
 * Wydrukuj lekcję (decision dl-3h2e8, dl-1eieq.8.17): the play link's lesson as its PDF, to work
 * through on paper away from the app. A quiet printer key: its name is its label, and on a laptop
 * its tooltip, with what it is doing beside it. The PDF's tab opens inside the tap, so no popup
 * blocker stops it, and goes to the PDF once the print is ready; a print that does not come closes
 * the tab and says so beside the key.
 */

import { type AssignmentPrintClient, waitForAssignmentPrint } from "@jadwigo/api-client";
import type { AssignmentId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@jadwigo/ui";
import { PrinterIcon } from "lucide-react";
import { type ReactElement, useState } from "react";

type State = "idle" | "preparing" | "failed" | "slow";

const SAID: Readonly<Record<Exclude<State, "idle">, CopyKey>> = {
  preparing: "play_print_preparing",
  failed: "play_print_failed",
  slow: "play_print_slow",
};

/** The PDF's address, or why there is none: it failed, or it is still on its way. */
export async function printedUrl(
  client: AssignmentPrintClient,
  assignmentId: AssignmentId,
  sleep?: (ms: number) => Promise<void>,
): Promise<string | "failed" | "slow"> {
  try {
    const status = await waitForAssignmentPrint(client, assignmentId, sleep);
    if (status.status === "ready") return status.url;
    return status.status === "pending" ? "slow" : "failed";
  } catch {
    return "failed";
  }
}

export function PrintLesson({
  language,
  print,
}: {
  language: Language;
  /** The PDF's address once it is made, or why it is not. */
  print: () => Promise<string | "failed" | "slow">;
}): ReactElement {
  const [state, setState] = useState<State>("idle");
  const label = copy(language, "play_print");
  const press = (): void => {
    if (state === "preparing") return;
    const opened = window.open("about:blank", "_blank");
    setState("preparing");
    void print().then((got) => {
      if (got === "failed" || got === "slow") {
        opened?.close();
        setState(got);
        return;
      }
      setState("idle");
      if (opened === null) {
        window.open(got, "_blank", "noopener");
        return;
      }
      try {
        opened.opener = null;
      } catch {
        // Left as it is.
      }
      opened.location.href = got;
    });
  };
  return (
    <div className="flex items-center gap-3" data-print-lesson>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={label}
            aria-busy={state === "preparing"}
            onClick={press}
            data-print
            data-print-state={state}
          >
            <PrinterIcon aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <p role="status" className="text-jw-page-small text-jw-ink-soft" data-print-said>
        {state === "idle" ? "" : copy(language, SAID[state])}
      </p>
    </div>
  );
}
