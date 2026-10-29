/**
 * The lesson's end (dl-5ssh.3.1): a congratulation, the same whatever happened, and under it the
 * questions asked, in order (owner, 2026-10-28, in this lane's planning session). Each row says what
 * was asked, how it ended in kind words, whether it was a similar question added on the way, and the
 * help used, and each is a card that opens the question again (dl-uukj.30.1, review/ReviewList.tsx).
 * No score, no tries and no time: the list is not a score (decision
 * 2026-10-27-the-child-s-after-lesson-list-shows-what-was-asked-how-it-ended), and the end has no
 * can-do card (learner-experience decision 2026-10-27-the-can-do-card-and-the-look-back-review-at-a-lesson-s-end-are-o).
 */

import type { AttemptResults } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { Button } from "@jadwigo/ui";
import type { ReactElement } from "react";
import { NavLink } from "../nav/NavLink.tsx";
import { browserAuth } from "../parent/auth.ts";
import { parentPath } from "../parent/route.ts";
import { ReviewList } from "../review/ReviewList.tsx";

export function Results({
  results,
  language,
  linkOf,
}: {
  results: AttemptResults | null;
  language: Language;
  /** Where a question's card leads: its review step. */
  linkOf: (seq: number) => string;
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
        <ReviewList rows={rows} language={language} linkOf={linkOf} />
      )}
      <SaveProgress results={results} language={language} />
    </section>
  );
}

/**
 * For the adult, under the list (dl-e8ov.2.38): sign in and keep this attempt for the child. Only
 * when the build has a sign-in, and only for an attempt that can still be claimed.
 */
function SaveProgress({
  results,
  language,
}: {
  results: AttemptResults | null;
  language: Language;
}): ReactElement | null {
  if (browserAuth() === null || results === null) return null;
  const { attempt } = results;
  if (attempt.mode === "preview" || attempt.learner_id !== null) return null;
  const lang = new URLSearchParams(window.location.search).get("lang");
  return (
    <aside data-save className="flex flex-col items-start gap-3 border-t pt-6">
      <p>{copy(language, "play_save_note")}</p>
      <Button asChild variant="outline">
        <NavLink href={parentPath({ claim: attempt.assignment_id, lang })} data-save-link>
          {copy(language, "play_save")}
        </NavLink>
      </Button>
    </aside>
  );
}
