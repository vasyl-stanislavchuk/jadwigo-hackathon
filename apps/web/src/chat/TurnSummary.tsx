/**
 * A done turn's spine folded to one row (handoff D5, §4.2): "Zrobione w {n} etapach" with
 * "{k} kroków · {t}" and a chevron. Enter, Space or a click opens it to the full card, its header
 * now the same trigger with a chevron up (Collapsible, `aria-expanded`). It folds in place where
 * the running card stood (§3); the reply, the lesson card and the rating sit under it.
 */

import type { Language } from "@jadwigo/copy";
import { Card, Collapsible, CollapsibleContent, CollapsibleTrigger, cn } from "@jadwigo/ui";
import { CheckIcon, ChevronRightIcon, ChevronUpIcon } from "lucide-react";
import type { ReactElement } from "react";
import { summaryOf } from "./phase.ts";
import type { TurnSpine } from "./spine/types.ts";
import { SPINE_FRAME, SPINE_HALO, SpineBody } from "./TurnSpine.tsx";

export function TurnSummary({
  spine,
  now,
  language,
  open,
  onOpenChange,
}: {
  spine: TurnSpine;
  now: number;
  language: Language;
  /** Whether the parent opened it; folded by default once the turn is done. */
  open: boolean;
  onOpenChange(open: boolean): void;
}): ReactElement {
  const { title, meta } = summaryOf(spine, now, language);
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} asChild>
      <Card className={cn(SPINE_FRAME, "bg-jw-side")} data-spine="done" data-summary>
        <CollapsibleTrigger
          className={cn(
            "flex min-h-9 w-full items-center gap-2.5 rounded-jw-card bg-jw-side px-3.5 py-2 hover:bg-jw-hover max-sm:min-h-10",
            open && "rounded-b-none border-b-jw border-jw-line",
            SPINE_HALO,
          )}
          data-summary-row
        >
          <CheckIcon aria-hidden className="size-4 shrink-0 text-jw-act" data-mark="done" />
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-left">
            <span className="text-jw-page-body font-medium text-jw-ink" data-title>
              {title}
            </span>
            <span className="text-jw-page-small text-jw-ink-soft tabular-nums" data-meta>
              {meta}
            </span>
          </span>
          {open ? (
            <ChevronUpIcon aria-hidden className="size-3.5 shrink-0 text-jw-ink-soft" />
          ) : (
            <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 text-jw-ink-soft" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="bg-jw-card">
          <SpineBody spine={spine} now={now} language={language} />
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
