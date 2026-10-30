/**
 * What the builder session is doing (dl-a38n.15): its newest tool calls as plain lines, read from
 * its own transcript, never from what it says it did. A tick for a finished call, an arrow for one
 * still running, a cross for one that failed; a failure is never folded into a success.
 */
import { cn } from "@jadwigo/ui";
import type { ReactElement } from "react";
import { type Mark, useActivity } from "./source.ts";

const MARK: Record<Mark, { sign: string; label: string; tone: string }> = {
  done: { sign: "✓", label: "done", tone: "text-jw-right-ink" },
  current: { sign: "›", label: "running", tone: "text-foreground" },
  failed: { sign: "✕", label: "failed", tone: "text-jw-help-ink" },
};

export function ActivitySlot(): ReactElement | null {
  const payload = useActivity();
  if (!payload) return null;
  return (
    <section
      aria-label="What Claude is doing"
      className="flex flex-col gap-2 rounded-lg border p-3"
    >
      <h2 className="font-medium text-sm">What Claude is doing</h2>
      {!payload.session_id ? (
        <p className="text-muted-foreground text-sm">
          No builder session. Start one with make builder.
        </p>
      ) : payload.steps.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing yet in this session.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {payload.steps.map((step, i) => {
            const mark = MARK[step.mark];
            return (
              <li
                key={`${step.at}-${i}`}
                className={cn(
                  "flex items-baseline gap-2 text-sm",
                  step.mark === "current" ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span aria-hidden className={cn("w-3 flex-none text-center", mark.tone)}>
                  {mark.sign}
                </span>
                <span className="sr-only">{mark.label}: </span>
                <span className="min-w-0">{step.text}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
