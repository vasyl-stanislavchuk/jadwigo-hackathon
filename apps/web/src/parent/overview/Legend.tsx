/** The overview's legend: the 6 outcomes, each with its icon and colour, and the twin mark. */

import { copy, type Language } from "@jadwigo/copy";
import { Heading, OutcomeTile } from "@jadwigo/ui";
import type { ReactElement } from "react";
import { CATEGORY } from "../adult.ts";
import { OUTCOMES } from "./grid.ts";
import { OUTCOME_TONE, OutcomeIcon, outcomeWord, TwinMark } from "./outcome.tsx";

export function Legend({ language }: { language: Language }): ReactElement {
  return (
    <section className="flex w-full flex-col gap-2" data-legend>
      <Heading level={2}>{copy(language, "parent_overview_legend", {}, CATEGORY)}</Heading>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {OUTCOMES.map((outcome) => (
          <li key={outcome} className="flex items-center gap-2" data-legend-outcome={outcome}>
            <OutcomeTile
              size="sm"
              tone={OUTCOME_TONE[outcome]}
              outcome={outcome}
              icon={<OutcomeIcon outcome={outcome} />}
            />
            {outcomeWord(language, outcome)}
          </li>
        ))}
        <li className="flex items-center gap-2" data-legend-twin>
          <OutcomeTile size="sm" tone="plain" icon={<TwinMark />} />
          {copy(language, "parent_overview_twin", {}, CATEGORY)}
        </li>
      </ul>
    </section>
  );
}
