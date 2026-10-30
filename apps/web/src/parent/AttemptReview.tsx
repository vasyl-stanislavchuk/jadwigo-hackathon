/**
 * One finished lesson for the parent, at /parent/attempts/<attempt> (dl-uukj.30.2, decision
 * jadwigo-hackathon 2026-10-29-a-parent-sees-the-full-answer-record-of-a-finished-lesson-and-th):
 *
 *   header   the lesson's title, the day, the time it took, the questions asked and how many were
 *            right on the first try: counts, never a percentage (no XP or percentage for anyone,
 *            decisions 2026-10-18 and 2026-10-03)
 *   grid     a tile per question with its seq and say, and an outcome tile in the tone of how it
 *            ended (src/review/outcome.ts): green for right, the miss red for a miss (decision
 *            2026-10-24-a-miss-is-marked-in-red), plain for a skip
 *   step     a tile opens the shared review step (src/review/ReviewStep.tsx) in the adult's lines,
 *            with the tries under it: each answer drawn beside the right one, its time, the help it
 *            had, and the mistake or the skip in plain words
 */

import { ApiError, type ParentClient } from "@jadwigo/api-client";
import type {
  AttemptId,
  LearnerId,
  ParentAttemptReview,
  ParentReviewQuestion,
  ReviewTry,
  SkipReason,
} from "@jadwigo/contracts";
import { type CopyKey, copy, type Language, mistakeCopyKey } from "@jadwigo/copy";
import { type Clock, FamilyView, type Instant, LessonTheme, ViewMode } from "@jadwigo/lesson-kit";
import { Card, CardContent, Heading, Link, Notice, OutcomeTile, Page, Spinner } from "@jadwigo/ui";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { NavLink } from "../nav/NavLink.tsx";
import { ENDED_ICON, ENDED_TONE, ENDED_WORD } from "../review/outcome.ts";
import { ReviewStep, specOf } from "../review/ReviewStep.tsx";
import { CATEGORY, pageLang } from "./adult.ts";
import { assignmentPath, parentPath } from "./route.ts";

const SKIPPED: Record<SkipReason, CopyKey> = {
  dont_know: "parent_skip_dont_know",
  asked_to_skip: "parent_skip_asked_to_skip",
  help_twin: "parent_skip_help_twin",
};

/** A still view has no timing to measure; a pinned clock keeps it the same on every draw. */
const clock: Clock = { now: (): Instant => ({ perf: 0, wall: "2026-10-29T00:00:00.000Z" }) };

const seconds = (ms: number): number => Math.round(ms / 1000);

/** The lesson's time, from every question's own: minutes and seconds. */
function totalTime(review: ParentAttemptReview): { minutes: number; seconds: number } {
  const total = seconds(review.questions.reduce((sum, q) => sum + q.result.time_ms, 0));
  return { minutes: Math.floor(total / 60), seconds: total % 60 };
}

/** The review under `learner`, or, with none named, under the first of the adult's learners whose
 * it is. Null when none of them has it. */
async function reviewOf(
  api: ParentClient,
  attempt: AttemptId,
  learner: LearnerId | null,
): Promise<ParentAttemptReview | null> {
  if (learner !== null) return api.getParentReview(learner, attempt);
  const me = await api.getMe();
  for (const { learner: candidate } of me.learners) {
    try {
      return await api.getParentReview(candidate.id, attempt);
    } catch (error) {
      if (!(error instanceof ApiError && error.type === "NotFound")) throw error;
    }
  }
  return null;
}

type View =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "ready"; review: ParentAttemptReview };

export function AttemptReview({
  api,
  attempt,
  learner,
  language,
}: {
  api: ParentClient;
  /** Null for a path whose id does not parse. */
  attempt: AttemptId | null;
  learner: LearnerId | null;
  language: Language;
}): ReactElement {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (attempt === null) {
      setView({ kind: "failed" });
      return;
    }
    let live = true;
    setView({ kind: "loading" });
    reviewOf(api, attempt, learner).then(
      (review) => live && setView(review === null ? { kind: "failed" } : { kind: "ready", review }),
      () => live && setView({ kind: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [api, attempt, learner]);

  const back = (
    <Link asChild className="self-start">
      <NavLink href={parentPath({ lang: pageLang() })} data-parent-home>
        {copy(language, "parent_review_back", {}, CATEGORY)}
      </NavLink>
    </Link>
  );

  if (view.kind === "loading")
    return (
      <ReviewPage>
        <Spinner label={copy(language, "loading", {}, CATEGORY)} />
      </ReviewPage>
    );
  if (view.kind === "failed")
    return (
      <ReviewPage>
        <Notice role="alert" data-failed>
          {copy(language, "parent_load_failed", {}, CATEGORY)}
        </Notice>
        {back}
      </ReviewPage>
    );

  const { review } = view;
  const { questions } = review;
  const question = open === null ? undefined : questions[open];
  if (open !== null && question !== undefined)
    return (
      <ReviewPage>
        {back}
        <ReviewStep
          question={question}
          index={open}
          total={questions.length}
          language={language}
          category={CATEGORY}
          onAll={() => setOpen(null)}
          {...(open > 0 ? { onPrev: () => setOpen(open - 1) } : {})}
          {...(open < questions.length - 1 ? { onNext: () => setOpen(open + 1) } : {})}
        >
          <Tries question={question} language={language} />
        </ReviewStep>
      </ReviewPage>
    );

  return (
    <ReviewPage>
      {back}
      <Header review={review} language={language} />
      <section className="flex w-full flex-col gap-3">
        <Heading level={2}>{copy(language, "parent_review_questions", {}, CATEGORY)}</Heading>
        <ol className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2" data-tiles>
          {questions.map((q, index) => (
            <li key={q.seq}>
              <QuestionTile question={q} language={language} onOpen={() => setOpen(index)} />
            </li>
          ))}
        </ol>
      </section>
    </ReviewPage>
  );
}

/** The attempt page: the app page's prose column. */
function ReviewPage({ children }: { children: ReactNode }): ReactElement {
  return (
    <Page width="prose" data-parent data-attempt-review>
      {children}
    </Page>
  );
}

/** A question on the grid: its outcome as a tile (an icon in its tone), its seq, say and word. */
function QuestionTile({
  question,
  language,
  onOpen,
}: {
  question: ParentReviewQuestion;
  language: Language;
  onOpen: () => void;
}): ReactElement {
  const Icon = ENDED_ICON[question.ended];
  const word = copy(language, ENDED_WORD[question.ended], {}, CATEGORY);
  return (
    <button
      type="button"
      className="flex h-full min-h-jw-control w-full items-start gap-3 rounded-jw-card border-2 border-jw-line bg-jw-card p-3 text-left text-jw-ink transition-colors duration-jw-fast hover:border-jw-line-strong"
      data-tile={question.seq}
      data-ended={question.ended}
      onClick={onOpen}
    >
      <OutcomeTile
        tone={ENDED_TONE[question.ended]}
        icon={<Icon aria-hidden="true" />}
        label={word}
      />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-jw-small font-bold">{question.seq}</span>
        <span>{question.say}</span>
        <span className="text-jw-small text-jw-ink-soft">{word}</span>
      </span>
    </button>
  );
}

function Header({
  review,
  language,
}: {
  review: ParentAttemptReview;
  language: Language;
}): ReactElement {
  const day = new Intl.DateTimeFormat(language, { dateStyle: "long" });
  const time = totalTime(review);
  const firstTry = review.questions.filter((q) => q.result.first_try_correct).length;
  return (
    <header className="flex flex-col items-start gap-2" data-review-header>
      <p className="text-jw-small text-jw-ink-soft">
        {copy(language, "parent_review_title", {}, CATEGORY)}
      </p>
      <Heading>{review.title}</Heading>
      <Link asChild size="small">
        <NavLink
          href={assignmentPath({ assignment: review.attempt.assignment_id, lang: pageLang() })}
          data-overview-link
        >
          {copy(language, "parent_overview_link", {}, CATEGORY)}
        </NavLink>
      </Link>
      <p data-day>{day.format(new Date(review.attempt.started_at))}</p>
      <p data-total-time>{copy(language, "parent_review_total_time", time, CATEGORY)}</p>
      <p data-asked={review.questions.length}>
        {copy(language, "parent_review_asked", { n: review.questions.length }, CATEGORY)}
      </p>
      <p data-first-try={firstTry}>
        {copy(language, "parent_review_first_try_count", { n: firstTry }, CATEGORY)}
      </p>
    </header>
  );
}

/** Próby: every try and skip of the question, in order. */
function Tries({
  question,
  language,
}: {
  question: ParentReviewQuestion;
  language: Language;
}): ReactElement {
  return (
    <section className="flex w-full flex-col gap-3" data-tries>
      <Heading level={3}>{copy(language, "parent_review_tries", {}, CATEGORY)}</Heading>
      <ol className="flex flex-col gap-3">
        {question.tries.map((t) => (
          <Try key={t.try_no} question={question} entry={t} language={language} />
        ))}
      </ol>
    </section>
  );
}

function Try({
  question,
  entry,
  language,
}: {
  question: ParentReviewQuestion;
  entry: ReviewTry;
  language: Language;
}): ReactElement {
  const mistake = mistakeCopyKey(entry.mistake_class);
  const said: CopyKey | null =
    entry.kind === "skip"
      ? entry.skip_reason === null
        ? null
        : SKIPPED[entry.skip_reason]
      : entry.correct === true
        ? "parent_review_try_right"
        : mistake;
  return (
    <li data-try={entry.try_no} data-kind={entry.kind}>
      <Card size="compact">
        <CardContent className="gap-2">
          {entry.kind === "try" && entry.value !== null && (
            <div className="kid-step min-w-0" data-try-view>
              <LessonTheme>
                <FamilyView
                  mode={ViewMode.Solution}
                  spec={specOf(question) as never}
                  language={language}
                  category={CATEGORY}
                  clock={clock}
                  value={entry.value as never}
                  solution={question.solution as never}
                />
              </LessonTheme>
            </div>
          )}
          <p className="text-jw-small text-jw-ink-soft">
            {copy(
              language,
              "parent_review_try_line",
              {
                time: copy(
                  language,
                  "parent_review_time",
                  { seconds: seconds(entry.latency_ms) },
                  CATEGORY,
                ),
                help: copy(language, "parent_review_help", { n: entry.help_used }, CATEGORY),
              },
              CATEGORY,
            )}
          </p>
          {said !== null && <p data-said>{copy(language, said, {}, CATEGORY)}</p>}
        </CardContent>
      </Card>
    </li>
  );
}
