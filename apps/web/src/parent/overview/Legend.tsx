/** The overview's legend: the 6 outcomes, each with its icon and colour, and the twin mark. */

import { copy, type Language } from "@jadwigo/copy";
import type { ReactElement } from "react";
import { OUTCOMES } from "./grid.ts";
import { CATEGORY, OUTCOME_TILE, OutcomeIcon, outcomeWord, TwinMark } from "./outcome.tsx";

export function Legend({ language }: { language: Language }): ReactElement {
  return (
    <section className="flex w-full flex-col gap-2" data-legend>
      <h2 className="text-xl font-semibold">
        {copy(language, "parent_overview_legend", {}, CATEGORY)}
      </h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-base">
        {OUTCOMES.map((outcome) => (
          <li key={outcome} className="flex items-center gap-2" data-legend-outcome={outcome}>
            <span
              className={`flex size-8 items-center justify-center rounded-md border-2 ${OUTCOME_TILE[outcome]}`}
            >
              <OutcomeIcon outcome={outcome} />
            </span>
            {outcomeWord(language, outcome)}
          </li>
        ))}
        <li className="flex items-center gap-2" data-legend-twin>
          <span className="flex size-8 items-center justify-center rounded-md border-2 border-border">
            <TwinMark />
          </span>
          {copy(language, "parent_overview_twin", {}, CATEGORY)}
        </li>
      </ul>
    </section>
  );
}
