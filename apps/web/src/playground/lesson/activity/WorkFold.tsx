/**
 * What the session did for one answer (dl-a38n.15), as the channel froze it onto the reply when it
 * was sent: folded under the answer, open by itself when a step failed, so the answer never reads
 * smoother than the work behind it was (md's workFold).
 */
import { cn } from "@jadwigo/ui";
import type { ReactElement } from "react";
import type { Work } from "../../../../../../tools/builder/activity.ts";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function WorkFold({ work }: { work: Work }): ReactElement {
  const head = [
    "What Claude did",
    plural(work.calls, "step", "steps"),
    ...(work.failed ? [`${work.failed} failed`] : []),
  ].join(" · ");
  return (
    <details open={work.failed > 0} className="text-muted-foreground text-xs">
      <summary className={cn(work.failed > 0 && "text-jw-help-ink")}>{head}</summary>
      <ul className="flex flex-col gap-0.5 pt-1 pl-3">
        {work.steps.map((step, i) => (
          <li
            // The same words may come twice, apart; a frozen list never reorders.
            key={`${i}-${step.text}`}
            className={cn("flex gap-2", !step.ok && "text-jw-help-ink")}
          >
            <span aria-hidden className="w-3 flex-none text-center">
              {step.ok ? "✓" : "✕"}
            </span>
            <span className="sr-only">{step.ok ? "done" : "failed"}: </span>
            <span>{step.text}</span>
          </li>
        ))}
        {work.calls > work.steps.length && work.steps.length > 0 && (
          <li className="pl-5">Repeated steps are shown once.</li>
        )}
        {work.read.length > 0 && <li>Read: {work.read.join(", ")}</li>}
        {work.changed.length > 0 && <li>Changed: {work.changed.join(", ")}</li>}
      </ul>
    </details>
  );
}
