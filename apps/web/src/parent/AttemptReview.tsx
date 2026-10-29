/**
 * One finished lesson for the parent, at /parent/attempts/<attempt> (dl-uukj.30.2, decision
 * jadwigo-hackathon 2026-10-29-a-parent-sees-the-full-answer-record-of-a-finished-lesson-and-th):
 *
 *   header   the lesson's title, the day, the time it took, the questions asked and how many were
 *            right on the first try: counts, never a percentage (no XP or percentage for anyone,
 *            decisions 2026-10-18 and 2026-10-03)
 *   grid     a tile per question with its seq and say, coloured by how it ended: green for right,
 *            the miss red for a miss (decision 2026-10-24-a-miss-is-marked-in-red), plain for a skip
 *   step     a tile opens the shared review step (src/review/ReviewStep.tsx), with the tries under it: each answer
 *            drawn small beside the right one, its time, the help it had, and the mistake or the
 *            skip in plain words
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
import { Spinner } from "@jadwigo/ui";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { NavLink } from "../playground/shell/NavLink.tsx";
import { ReviewStep, specOf } from "../review/ReviewStep.tsx";
import { assignmentPath, parentPath } from "./route.ts";

const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

/** The tries are for the adult: the family views read the adult's lines. */
const CATEGORY = "adult";

const ENDED: Record<ParentReviewQuestion["ended"], CopyKey> = {
  correct: "play_ended_correct",
  missed: "play_ended_missed",
  skipped: "play_ended_skipped",
};

/** A tile's colours by how its question ended: the player's own right and miss (packages/ui kids.css). */
const TILE: Record<ParentReviewQuestion["ended"], string> = {
  correct: "border-kid-correct bg-kid-correct-soft text-kid-correct-ink",
  missed: "border-kid-try-again bg-kid-try-again-soft text-kid-try-again-ink",
  skipped: "border-border bg-background",
};

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
      if (!(isApiError(error) && error.type === "NotFound")) throw error;
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
    <NavLink
      href={parentPath({ lang: new URLSearchParams(window.location.search).get("lang") })}
      className="underline"
      data-parent-home
    >
      {copy(language, "parent_review_back", {}, CATEGORY)}
    </NavLink>
  );

  if (view.kind === "loading")
    return (
      <Page>
        <Spinner label={copy(language, "loading")} />
      </Page>
    );
  if (view.kind === "failed")
    return (
      <Page>
        <p data-failed>{copy(language, "load_failed")}</p>
        {back}
      </Page>
    );

  const { review } = view;
  const { questions } = review;
  const question = open === null ? undefined : questions[open];
  if (open !== null && question !== undefined)
    return (
      <Page>
        {back}
        <ReviewStep
          question={question}
          index={open}
          total={questions.length}
          language={language}
          onAll={() => setOpen(null)}
          {...(open > 0 ? { onPrev: () => setOpen(open - 1) } : {})}
          {...(open < questions.length - 1 ? { onNext: () => setOpen(open + 1) } : {})}
        >
          <Tries question={question} language={language} />
        </ReviewStep>
      </Page>
    );

  return (
    <Page>
      {back}
      <Header review={review} language={language} />
      <section className="flex w-full flex-col gap-3">
        <h2 className="text-2xl font-semibold">
          {copy(language, "parent_review_questions", {}, CATEGORY)}
        </h2>
        <ol className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3" data-tiles>
          {questions.map((q, index) => (
            <li key={q.seq}>
              <button
                type="button"
                className={`flex h-full w-full flex-col items-start gap-1 rounded-xl border-2 p-3 text-left ${TILE[q.ended]}`}
                data-tile={q.seq}
                data-ended={q.ended}
                onClick={() => setOpen(index)}
              >
                <span className="text-sm font-semibold">{q.seq}</span>
                <span>{q.say}</span>
                <span className="text-sm">{copy(language, ENDED[q.ended])}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </Page>
  );
}

function Page({ children }: { children: ReactNode }): ReactElement {
  return (
    <main
      data-parent
      data-attempt-review
      className="mx-auto flex max-w-3xl flex-col items-start gap-6 p-6 text-lg"
    >
      {children}
    </main>
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
    <header className="flex flex-col gap-2" data-review-header>
      <p className="text-sm">{copy(language, "parent_review_title", {}, CATEGORY)}</p>
      <h1 className="text-3xl font-semibold">{review.title}</h1>
      <NavLink
        href={assignmentPath({
          assignment: review.attempt.assignment_id,
          lang: new URLSearchParams(window.location.search).get("lang"),
        })}
        className="text-base underline"
        data-overview-link
      >
        {copy(language, "parent_overview_link", {}, CATEGORY)}
      </NavLink>
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
      <h3 className="text-xl font-semibold">
        {copy(language, "parent_review_tries", {}, CATEGORY)}
      </h3>
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
    <li
      className="flex flex-col gap-2 rounded-xl border p-3"
      data-try={entry.try_no}
      data-kind={entry.kind}
    >
      {entry.kind === "try" && entry.value !== null && (
        <div className="kid-step min-w-0 [zoom:0.6]" data-try-view>
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
      <p className="text-sm">
        {copy(language, "parent_review_time", { seconds: seconds(entry.latency_ms) }, CATEGORY)}
        {" · "}
        {copy(language, "parent_review_help", { n: entry.help_used }, CATEGORY)}
      </p>
      {said !== null && <p data-said>{copy(language, said, {}, CATEGORY)}</p>}
    </li>
  );
}
