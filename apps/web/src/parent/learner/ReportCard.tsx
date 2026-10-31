/**
 * The latest report on the learner, as the parent first reads it (dl-e8ov.5.7, decision
 * jadwigo-learner-knowledge 2026-10-30-parents-first-read-the-learner-report-on-the-learner-page-in-
 * the): the period, the headline, the direction now, the answers to the 2 standing questions, the
 * proposals with Accept and Dismiss, and the asks. A proposal changes nothing until the parent
 * accepts it; once decided its buttons give way to the decision. The narrative restates only the
 * digest's numbers and names no level; a report not yet written up says so.
 */

import type {
  LearnerReport,
  ProposalDecision,
  ProposalId,
  StandingQuestion,
} from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, Card, CardContent, Heading, Notice } from "@jadwigo/ui";
import { type ReactElement, type ReactNode, useState } from "react";
import { CATEGORY } from "../adult.ts";

export type Decision = ProposalDecision["decision"];

const QUESTION: Record<StandingQuestion, CopyKey> = {
  skills_standing: "parent_report_skills_standing",
  next_focus: "parent_report_next_focus",
};

const DECIDED: Record<Decision, CopyKey> = {
  accepted: "parent_report_accepted",
  dismissed: "parent_report_dismissed",
};

export function ReportCard({
  report,
  language,
  onDecide,
}: {
  /** The newest report, or null when there is none yet. */
  report: LearnerReport | null;
  language: Language;
  /** PATCHes the decision; rejects when it did not save. */
  onDecide: (proposal: ProposalId, decision: Decision) => Promise<void>;
}): ReactElement {
  const line = (key: CopyKey, vars: Record<string, string> = {}): string =>
    copy(language, key, vars, CATEGORY);
  const [busy, setBusy] = useState<ProposalId | null>(null);
  const [failed, setFailed] = useState(false);

  const decide = (proposal: ProposalId, decision: Decision): void => {
    if (busy !== null) return;
    setBusy(proposal);
    setFailed(false);
    onDecide(proposal, decision)
      .catch(() => setFailed(true))
      .finally(() => setBusy(null));
  };

  const title = <Heading level={3}>{line("parent_report_title")}</Heading>;
  if (report === null)
    return (
      <section className="flex w-full flex-col gap-3" data-report="none">
        {title}
        <p>{line("parent_report_none")}</p>
      </section>
    );

  const day = new Intl.DateTimeFormat(language, { dateStyle: "long", timeZone: "Europe/Warsaw" });
  const period = line("parent_report_period", {
    from: day.format(new Date(report.period_starts_at)),
    to: day.format(new Date(report.period_ends_at)),
  });
  const narrative = report.narrative;
  const decided = new Map(report.decisions.map((d) => [d.proposal_id, d.decision]));

  return (
    <section className="flex w-full flex-col gap-3" data-report={report.id}>
      {title}
      <Card size="compact">
        <CardContent className="items-start gap-3">
          <span className="text-jw-small text-jw-ink-soft" data-period>
            {period}
          </span>
          {narrative === null ? (
            <p data-not-written>{line("parent_report_not_written")}</p>
          ) : (
            <>
              <p className="font-bold break-words" data-headline>
                {narrative.headline}
              </p>
              <p className="break-words" data-direction>
                {narrative.direction_now}
              </p>
              {narrative.answers.length === 0 ? (
                <Nothing language={language} part="answers" />
              ) : (
                narrative.answers.map((answer) => (
                  <Part key={answer.question} title={line(QUESTION[answer.question])}>
                    <p className="break-words" data-answer={answer.question}>
                      {answer.answer}
                    </p>
                  </Part>
                ))
              )}
              <Part title={line("parent_report_proposals")}>
                {narrative.proposals.length === 0 ? (
                  <Nothing language={language} part="proposals" />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {narrative.proposals.map((proposal) => {
                      const decision = decided.get(proposal.proposal_id);
                      return (
                        <li
                          key={proposal.proposal_id}
                          className="flex flex-col gap-2"
                          data-proposal={proposal.proposal_id}
                          data-decision={decision ?? "open"}
                        >
                          <span className="font-bold break-words">{proposal.claim}</span>
                          <span className="break-words">{proposal.rationale}</span>
                          {decision === undefined ? (
                            <div className="flex flex-wrap gap-3">
                              <Button
                                type="button"
                                size="control"
                                disabled={busy !== null}
                                onClick={() => decide(proposal.proposal_id, "accepted")}
                                data-accept
                              >
                                {line("parent_report_accept")}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="control"
                                disabled={busy !== null}
                                onClick={() => decide(proposal.proposal_id, "dismissed")}
                                data-dismiss
                              >
                                {line("parent_report_dismiss")}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-jw-ink-soft" data-decided>
                              {line(DECIDED[decision])}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {failed && (
                  <Notice data-decide-failed>{line("parent_report_decide_failed")}</Notice>
                )}
              </Part>
              <Part title={line("parent_report_asks")}>
                {narrative.asks.length === 0 ? (
                  <Nothing language={language} part="asks" />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {narrative.asks.map((ask) => (
                      <li key={ask.ask} className="flex flex-col gap-1" data-ask>
                        <span className="font-bold break-words">{ask.ask}</span>
                        <span className="break-words text-jw-ink-soft">{ask.why}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Part>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/** One part of the report under its bold title. */
function Part({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <span className="font-bold">{title}</span>
      {children}
    </div>
  );
}

/** The line an empty part of the report shows. */
function Nothing({ language, part }: { language: Language; part: string }): ReactElement {
  return (
    <p className="text-jw-ink-soft" data-nothing-recorded={part}>
      {copy(language, "parent_learner_nothing_recorded", {}, CATEGORY)}
    </p>
  );
}
