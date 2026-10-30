/**
 * The learner's knowledge base on the parent home, under each learner (dl-e8ov.5.7, decision
 * jadwigo-learner-knowledge 2026-10-30-parents-first-read-the-learner-report-on-the-learner-page-in-
 * the):
 *
 *   goals    GET /learners/{id}/skills: each goal's standing and its 3 lists (GoalLists.tsx)
 *   weeks    the last 4 weeks' counts, from the attempts and the reports' digests (WeekStrip.tsx)
 *   report   GET /learners/{id}/reports: the newest one's narrative and its proposals, decided
 *            with PATCH /learners/{id}/reports/{report} (ReportCard.tsx)
 *
 * Each part loads, fails and shows apart from the others. Every word is the copy's, in the adult's
 * lines; counts are digits; no level name, score, percentage, streak or countdown.
 */

import type { LearnerKnowledgeClient, ParentClient } from "@jadwigo/api-client";
import type {
  LearnerAttempt,
  LearnerId,
  LearnerReport,
  LearnerSkills,
  ProposalId,
} from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { Notice, Spinner } from "@jadwigo/ui";
import { type ReactElement, useEffect, useState } from "react";
import { CATEGORY } from "../adult.ts";
import { GoalLists } from "./GoalLists.tsx";
import { type Decision, ReportCard } from "./ReportCard.tsx";
import { WeekStrip } from "./WeekStrip.tsx";
import { weeksOf } from "./weeks.ts";

type KnowledgeClient = ParentClient & LearnerKnowledgeClient;

/** Whether `api` makes the knowledge base's calls too: the app's client does; a double of the
 * parent's calls alone does not, and then the section is left out. */
function knowsLearners(api: ParentClient): api is KnowledgeClient {
  return "getLearnerSkills" in api && "getLearnerReports" in api && "patchReport" in api;
}

/** A part's load: null while it loads. */
type Load<T> = T | "failed" | null;

export function LearnerKnowledge({
  api,
  learner,
  language,
}: {
  api: ParentClient;
  learner: LearnerId;
  language: Language;
}): ReactElement | null {
  if (!knowsLearners(api)) return null;
  return <Knowledge api={api} learner={learner} language={language} />;
}

/** Calls `read` once per `learner`, and keeps its answer or "failed". */
function useLoad<T>(read: () => Promise<T>, deps: readonly unknown[]): [Load<T>, (t: T) => void] {
  const [load, setLoad] = useState<Load<T>>(null);
  useEffect(() => {
    let live = true;
    setLoad(null);
    read().then(
      (value) => live && setLoad(value),
      () => live && setLoad("failed"),
    );
    return () => {
      live = false;
    };
  }, deps);
  return [load, setLoad];
}

function Knowledge({
  api,
  learner,
  language,
}: {
  api: KnowledgeClient;
  learner: LearnerId;
  language: Language;
}): ReactElement {
  const [skills] = useLoad<LearnerSkills>(() => api.getLearnerSkills(learner), [api, learner]);
  const [reports, setReports] = useLoad<LearnerReport[]>(
    () => api.getLearnerReports(learner).then((reply) => reply.reports),
    [api, learner],
  );
  const [attempts] = useLoad<LearnerAttempt[]>(
    () => api.getLearnerAttempts(learner).then((reply) => reply.attempts),
    [api, learner],
  );

  const decide = async (proposal: ProposalId, decision: Decision): Promise<void> => {
    if (!Array.isArray(reports) || reports[0] === undefined) return;
    const latest = reports[0];
    const saved = await api.patchReport(learner, latest.id, {
      decisions: [{ proposal_id: proposal, decision }],
    });
    setReports([saved, ...reports.slice(1)]);
  };

  return (
    <div className="flex w-full flex-col gap-6" data-learner-knowledge={learner}>
      <Part load={skills} language={language} name="goals">
        {(view) => <GoalLists goals={view.goals} catalogue={view.catalogue} language={language} />}
      </Part>
      <Part
        load={
          Array.isArray(attempts) && Array.isArray(reports)
            ? { attempts, reports }
            : attempts === "failed" || reports === "failed"
              ? "failed"
              : null
        }
        language={language}
        name="weeks"
      >
        {(both) => (
          <WeekStrip weeks={weeksOf(both.attempts, both.reports, new Date())} language={language} />
        )}
      </Part>
      <Part load={reports} language={language} name="report">
        {(list) => <ReportCard report={list[0] ?? null} language={language} onDecide={decide} />}
      </Part>
    </div>
  );
}

/** One part: a spinner while it loads, a line when it failed, else what `children` draws. */
function Part<T>({
  load,
  language,
  name,
  children,
}: {
  load: Load<T>;
  language: Language;
  name: string;
  children: (value: T) => ReactElement;
}): ReactElement {
  if (load === null) return <Spinner label={copy(language, "loading", {}, CATEGORY)} />;
  if (load === "failed")
    return (
      <Notice data-part-failed={name}>{copy(language, "parent_load_failed", {}, CATEGORY)}</Notice>
    );
  return children(load);
}
