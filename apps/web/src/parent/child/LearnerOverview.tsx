/**
 * A child's Przegląd tab (dl-uukj.47.3): their goals, weeks and newest report (LearnerKnowledge),
 * then their lessons, newest first, each a card with a link to its attempt page, the day, a tile per
 * question as the overview's heatmap draws that attempt's row, and a link to the overview. Moved
 * whole from the old parent home's card (decision 2026-10-30-app-pages-take-an-adult-type-scale-h1-
 * 28-h2-22-body-17-and-the-a).
 */

import type { ParentClient } from "@jadwigo/api-client";
import type { AttemptResult, Learner, LearnerAttempts } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { Card, CardContent, Link, OutcomeTile, Spinner } from "@jadwigo/ui";
import { type ReactElement, useEffect, useState } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { Failed } from "../Failed.tsx";
import { LearnerKnowledge } from "../learner/LearnerKnowledge.tsx";
import { cellsOf } from "../overview/grid.ts";
import { OUTCOME_TONE, OutcomeIcon, TwinMark, tileLabel } from "../overview/outcome.tsx";
import { assignmentPath, attemptPath } from "../route.ts";

export function LearnerOverview({
  api,
  learner,
  language,
}: {
  api: ParentClient;
  learner: Learner;
  language: Language;
}): ReactElement {
  const [attempts, setAttempts] = useState<LearnerAttempts["attempts"] | "failed" | null>(null);
  useEffect(() => {
    let live = true;
    api.getLearnerAttempts(learner.id).then(
      (reply) => live && setAttempts(reply.attempts),
      () => live && setAttempts("failed"),
    );
    return () => {
      live = false;
    };
  }, [api, learner.id]);
  const day = new Intl.DateTimeFormat(language, { dateStyle: "long" });
  return (
    <div className="flex flex-col gap-4" data-learner-overview={learner.id}>
      <LearnerKnowledge api={api} learner={learner.id} language={language} />
      {attempts === null && <Spinner label={copy(language, "loading", {}, CATEGORY)} />}
      {attempts === "failed" && <Failed language={language} />}
      {Array.isArray(attempts) && attempts.length === 0 && (
        <p>{copy(language, "parent_no_attempts", {}, CATEGORY)}</p>
      )}
      {Array.isArray(attempts) && attempts.length > 0 && (
        <ol className="flex flex-col gap-4">
          {attempts.map(({ attempt, title, results }) => (
            <li key={attempt.id} data-attempt={attempt.id}>
              <Card size="compact">
                <CardContent className="items-start gap-2">
                  <Link asChild>
                    <NavLink
                      href={attemptPath({
                        attempt: attempt.id,
                        learner: learner.id,
                        lang: pageLang(),
                      })}
                      data-attempt-link
                    >
                      {title}
                    </NavLink>
                  </Link>
                  <span className="text-jw-small text-jw-ink-soft">
                    {day.format(new Date(attempt.started_at))}
                  </span>
                  <Tiles results={results} language={language} />
                  <Link asChild size="small">
                    <NavLink
                      href={assignmentPath({ assignment: attempt.assignment_id, lang: pageLang() })}
                      data-overview-link
                    >
                      {copy(language, "parent_overview_link", {}, CATEGORY)}
                    </NavLink>
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** A lesson's tiles: one per planned question, its twins folded in, as the heatmap draws its row.
 * Each keeps the stored ended on its item. */
function Tiles({
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
