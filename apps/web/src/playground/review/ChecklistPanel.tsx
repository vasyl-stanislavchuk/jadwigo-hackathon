/**
 * The checklist panel (dl-w3.47): the lines of checklist.ts for this question, each with its source
 * and what code could tell. A tick is lucide's plain Check, never a verdict icon. Nothing is stored
 * here: the reviewer marks and notes through md's annotations (dl-w3.46).
 */

import type { FamilySpec } from "@jadwigo/lesson-kit";
import { Check, Minus, Square, TriangleAlert } from "lucide-react";
import type { ReactElement } from "react";
import { type ChecklistStatus, checklistFor } from "./checklist.ts";

const MARK: Record<ChecklistStatus, { Icon: typeof Check; words: string }> = {
  auto_yes: { Icon: Check, words: "Yes, by code" },
  auto_no: { Icon: TriangleAlert, words: "No, by code" },
  check: { Icon: Square, words: "For you to check" },
  not_built: { Icon: Minus, words: "Not built yet" },
};

export function ChecklistPanel({ spec }: { spec: FamilySpec }): ReactElement {
  return (
    <ol className="flex flex-col divide-y rounded-xl border bg-card" data-checklist>
      {checklistFor(spec).map((line) => {
        const { Icon, words } = MARK[line.status];
        return (
          <li
            key={line.id}
            data-check={line.id}
            data-status={line.status}
            className="flex gap-3 p-3"
          >
            <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="leading-relaxed">
                {line.text} <span className="text-muted-foreground text-xs">{words}</span>
              </p>
              {line.note && (
                <p className="text-muted-foreground text-xs leading-relaxed">{line.note}</p>
              )}
              <p className="text-muted-foreground font-mono text-xs break-all">{line.source}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
