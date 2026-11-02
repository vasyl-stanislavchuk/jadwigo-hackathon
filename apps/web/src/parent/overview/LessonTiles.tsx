/** One attempt's row of outcome tiles, as the overview's heatmap draws it: the child's Przegląd
 * cards and the Historia table both show it (dl-z5ja.106.1). */

import type { AttemptResult } from "@jadwigo/contracts";
import type { Language } from "@jadwigo/copy";
import { OutcomeTile } from "@jadwigo/ui";
import type { ReactElement } from "react";
import { cellsOf } from "./grid.ts";
import { OUTCOME_TONE, OutcomeIcon, TwinMark, tileLabel } from "./outcome.tsx";

/** A lesson's tiles: one per planned question, its twins folded in, as the heatmap draws its row.
 * Each keeps the stored ended on its item. */
export function LessonTiles({
  results,
  language,
}: {
  results: AttemptResult[];
  language: Language;
}): ReactElement {
  return (
    <ol className="flex flex-wrap gap-2 pt-1" data-lesson-tiles>
      {cellsOf(results).map((cell, index) => (
        <li
          key={cell.planned.seq}
          data-seq={cell.planned.seq}
          data-ended={cell.planned.ended ?? "open"}
        >
          <OutcomeTile
            size="sm"
            tone={OUTCOME_TONE[cell.outcome]}
            outcome={cell.outcome}
            icon={<OutcomeIcon outcome={cell.outcome} />}
            label={tileLabel(language, index + 1, cell)}
          >
            {cell.twin && (
              <span className="absolute top-0.5 right-0.5">
                <TwinMark />
              </span>
            )}
          </OutcomeTile>
        </li>
      ))}
    </ol>
  );
}
