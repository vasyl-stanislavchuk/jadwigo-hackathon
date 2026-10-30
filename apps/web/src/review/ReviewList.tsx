/**
 * The lesson's end list as cards (dl-uukj.30.1): each question asked, in order, with its number, a
 * soft icon and the kind word for how it ended, what was asked, and whether it was a similar
 * question added on the way and how much help it took. A card opens that question's review step.
 * No score and no count (decision 2026-10-27-the-child-s-after-lesson-list-shows-what-was-asked-how-it-ended).
 */

import type { PageAttemptResult } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { Card, CardContent, Link } from "@jadwigo/ui";
import type { ReactElement } from "react";
import { NavLink } from "../nav/NavLink.tsx";
import { ENDED_ICON, ENDED_WORD } from "./outcome.ts";

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
            {/* The card is one target: the link's box stretches over it (after:inset-0). */}
            <Card size="compact" className="relative has-[a:hover]:bg-muted">
              <CardContent className="flex-row items-start gap-4">
                <span data-review-number className="text-jw-instruction font-bold">
                  {i + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link asChild className="after:absolute after:inset-0">
                    <NavLink href={linkOf(row.seq)} data-review-card>
                      {row.say}
                    </NavLink>
                  </Link>
                  <span className="inline-flex items-center gap-2 font-bold">
                    <Icon aria-hidden className="size-4" />
                    {copy(language, ENDED_WORD[ended])}
                  </span>
                  {row.added === "twin" && (
                    <span className="text-jw-small">{copy(language, "play_results_twin")}</span>
                  )}
                  {row.help_used > 0 && (
                    <span className="text-jw-small">
                      {copy(language, "play_results_help", { n: row.help_used })}
                    </span>
                  )}
                </span>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
