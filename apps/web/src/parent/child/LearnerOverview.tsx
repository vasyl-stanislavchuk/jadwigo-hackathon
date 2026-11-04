/**
 * A child's Przegląd tab (dl-uukj.47.3): their goals, weeks and newest report (LearnerKnowledge),
 * then their lessons, newest first, each a card with a link to its attempt page, the day, a tile per
 * question as the overview's heatmap draws that attempt's row, and a link to the overview. Moved
 * whole from the old parent home's card (decision 2026-10-30-app-pages-take-an-adult-type-scale-h1-
 * 28-h2-22-body-17-and-the-a). With nothing played yet, the weeks start at the week the child was
 * added in and one muted line says what will appear (dl-uukj.47.22).
 */

import type { ParentClient } from "@jadwigo/api-client";
import type { Learner, LearnerAttempts } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { Card, CardContent, Link, Loading } from "@jadwigo/ui";
import { type ReactElement, useEffect, useState } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { Failed } from "../Failed.tsx";
import { LearnerKnowledge } from "../learner/LearnerKnowledge.tsx";
import { LessonTiles } from "../overview/LessonTiles.tsx";
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
      <LearnerKnowledge
        api={api}
        learner={learner.id}
        language={language}
        since={learner.created_at}
      />
      {attempts === null && (
        <Loading size="block" character="gumka" label={copy(language, "loading", {}, CATEGORY)} />
      )}
      {attempts === "failed" && <Failed language={language} />}
      {Array.isArray(attempts) && attempts.length === 0 && (
        <p className="text-jw-ink-soft" data-overview-empty>
          {copy(language, "parent_overview_empty", {}, CATEGORY)}
        </p>
      )}
      {Array.isArray(attempts) && attempts.length > 0 && (
        <ol className="flex flex-col gap-4">
          {attempts.map(({ attempt, title, results }) => (
            <li key={attempt.id} data-attempt={attempt.id}>
              <Card size="compact" className="shadow-none">
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
                  <span className="text-jw-page-small text-jw-ink-soft">
                    {day.format(new Date(attempt.started_at))}
                  </span>
                  <LessonTiles results={results} language={language} />
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
