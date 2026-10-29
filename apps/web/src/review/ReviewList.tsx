/**
 * The lesson's end list as cards (dl-uukj.30.1): each question asked, in order, with its number, a
 * soft icon and the kind word for how it ended, what was asked, and whether it was a similar
 * question added on the way and how much help it took. A card opens that question's review step.
 * No score and no count (decision 2026-10-27-the-child-s-after-lesson-list-shows-what-was-asked-how-it-ended).
 */

import type { PageAttemptResult } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import type { ReactElement } from "react";
import { NavLink } from "../playground/shell/NavLink.tsx";
import { ENDED_ICON, ENDED_WORD } from "./ended.ts";

export function ReviewList({
  rows,
  language,
  linkOf,
}: {
  rows: readonly PageAttemptResult[];
  language: Language;
  /** Where a card leads: its question's review step. */
  linkOf: (seq: number) => string;
}): ReactElement {
  return (
    <ol data-review-list className="flex flex-col gap-3">
      {rows.map((row, i) => {
        const ended = row.ended ?? "open";
        const Icon = ENDED_ICON[ended];
        return (
          <li
            key={row.seq}
            data-seq={row.seq}
            data-ended={ended}
            data-added={row.added}
            data-help-used={row.help_used}
          >
            <NavLink
              href={linkOf(row.seq)}
              data-review-card
              className="flex items-start gap-4 rounded-xl border p-4 hover:bg-muted"
            >
              <span data-review-number className="text-xl font-semibold">
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span>{row.say}</span>
                <span className="inline-flex items-center gap-2 font-semibold">
                  <Icon aria-hidden className="size-4" />
                  {copy(language, ENDED_WORD[ended])}
                </span>
                {row.added === "twin" && (
                  <span className="text-sm">{copy(language, "play_results_twin")}</span>
                )}
                {row.help_used > 0 && (
                  <span className="text-sm">
                    {copy(language, "play_results_help", { n: row.help_used })}
                  </span>
                )}
              </span>
            </NavLink>
          </li>
        );
      })}
    </ol>
  );
}
