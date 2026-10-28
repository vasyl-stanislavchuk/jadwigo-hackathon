/**
 * The lesson's end (dl-5ssh.3.1): a congratulation, the same whatever happened, and under it the
 * questions asked, in order (owner, 2026-10-28, in this lane's planning session). Each row says what
 * was asked, how it ended in kind words, whether it was a similar question added on the way, and the
 * help used. No score, no tries and no time: the list is not a score (decision
 * 2026-10-27-the-child-s-after-lesson-list-shows-what-was-asked-how-it-ended), and the end has no
 * can-do card (learner-experience decision 2026-10-27-the-can-do-card-and-the-look-back-review-at-a-lesson-s-end-are-o).
 */

import type { AttemptResults, PageEnded } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ReactElement } from "react";

const ENDED: Record<PageEnded | "open", CopyKey> = {
  correct: "play_ended_correct",
  missed: "play_ended_missed",
  skipped: "play_ended_skipped",
  done: "play_ended_done",
  open: "play_ended_open",
};

export function Results({
  results,
  language,
}: {
  results: AttemptResults | null;
  language: Language;
}): ReactElement {
  const rows = results?.results ?? [];
  return (
    <section data-results className="kid-results mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 data-congrats className="text-3xl font-semibold">
        {copy(language, "play_congrats")}
      </h1>
      <h2 className="text-xl">{copy(language, "play_results_title")}</h2>
      {rows.length === 0 ? (
        <p>{copy(language, "play_results_none")}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.seq}
              data-seq={row.seq}
              data-ended={row.ended ?? "open"}
              data-added={row.added}
              data-help-used={row.help_used}
              className="flex flex-col gap-1 rounded-xl border p-4"
            >
              <span>{row.say}</span>
              <span className="font-semibold">{copy(language, ENDED[row.ended ?? "open"])}</span>
              {row.added === "twin" && (
                <span className="text-sm">{copy(language, "play_results_twin")}</span>
              )}
              {row.help_used > 0 && (
                <span className="text-sm">
                  {copy(language, "play_results_help", { n: row.help_used })}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
