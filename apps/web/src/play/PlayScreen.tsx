/**
 * The lesson a child plays at /play/<assignment> (dl-5ssh.3.1), with no login: the question on screen
 * drawn by lesson-kit's family view inside the lesson frame, the paused screen, and the results with
 * the congratulation at the end. The close button's pause sheet ends for today by pausing the
 * attempt (LessonFrame.onStop), and the paused screen goes back to the same question. Once it is
 * finished, a card on the list opens /play/<assignment>/review/<seq>, the question again
 * (dl-uukj.30.1); a review path on an attempt still being played goes back to the lesson.
 */

import type { AttemptClient } from "@jadwigo/api-client";
import type { AssignmentId } from "@jadwigo/contracts";
import { type Category, copy, type Language } from "@jadwigo/copy";
import {
  browserClock,
  FamilyView,
  LessonFrame,
  LessonTheme,
  type PageFamilySpec,
  press,
  StepFrame,
  ViewMode,
} from "@jadwigo/lesson-kit";
import { Button, Spinner } from "@jadwigo/ui";
import { type ReactElement, type ReactNode, useCallback, useEffect, useMemo } from "react";
import { navigate, useLocation } from "../playground/route.ts";
import { ChildReview } from "../review/ChildReview.tsx";
import { Results } from "./Results.tsx";
import { playPath, playRoute, reviewPath } from "./route.ts";
import { currentOf, progressOf } from "./runner.ts";
import { type Player, usePlayer } from "./usePlayer.ts";

const CATEGORY: Category = "child";

/** The page a learner sees: Zeszyt's kid page, with no tool chrome around it. */
function KidPage({ children }: { children: ReactNode }): ReactElement {
  return (
    <main className="kid-page" data-learner-view data-play>
      <LessonTheme>{children}</LessonTheme>
    </main>
  );
}

function Message({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 p-6 text-2xl">{children}</div>
  );
}

function Question({
  player,
  language,
}: {
  player: Player;
  language: Language;
}): ReactElement | null {
  const { state } = player;
  const question = currentOf(state);
  const frame = useMemo(() => ({ onStop: player.pause }), [player.pause]);
  if (question === null) return null;
  const spec = {
    id: `q${question.seq}`,
    say: question.say,
    question_type: question.question_type,
    family: question.question.family,
    data: question.question.data,
  } as PageFamilySpec;
  const live = state.phase === "live";
  const clock = browserClock;
  return (
    <LessonFrame.Provider value={frame}>
      <StepFrame key={question.seq} stepId={spec.id}>
        <FamilyView
          // A new question is a new view: nothing typed or placed carries over.
          key={question.seq}
          mode={ViewMode.Play}
          spec={spec as never}
          language={language}
          category={CATEGORY}
          clock={clock}
          live={live}
          attemptNo={state.attemptNo}
          feedback={state.feedback}
          workedSolution={state.workedSolution}
          onCommit={(c) => player.commit(c.value, c.t1)}
          around={{
            checking: state.phase === "sending",
            moveOn: {
              enabled: live,
              press: press(clock, (at) => {
                if (live) player.skip(at);
              }),
            },
            ladder: {
              help: state.help,
              ask:
                state.help === null || state.help.more
                  ? { enabled: live, press: press(clock, () => player.askHelp()) }
                  : null,
              refused: state.helpRefused,
            },
            next: state.phase === "feedback" ? { press: press(clock, () => player.next()) } : null,
            progress: progressOf(state),
          }}
        />
      </StepFrame>
    </LessonFrame.Provider>
  );
}

/** A /play path whose assignment the server does not have, or that names none at all. */
export function LessonNotFound({ language }: { language: Language }): ReactElement {
  return (
    <KidPage>
      <Message>
        <p data-not-found>{copy(language, "play_not_found")}</p>
      </Message>
    </KidPage>
  );
}

export function PlayScreen({
  assignmentId,
  language,
  client,
}: {
  assignmentId: AssignmentId;
  language: Language;
  /** The API, for tests; the page's own origin when absent. */
  client?: AttemptClient;
}): ReactElement {
  const player = usePlayer(assignmentId, client);
  const { stage } = player;
  const { path, query } = useLocation();
  const seq = playRoute(path)?.review;
  // The page's own query (the language) rides along from the list to a step and back.
  const search = query.toString();
  const withQuery = useCallback(
    (to: string): string => (search === "" ? to : `${to}?${search}`),
    [search],
  );
  const toList = useCallback(
    (options?: { replace: boolean }) => navigate(withQuery(playPath(assignmentId)), options),
    [assignmentId, withQuery],
  );
  const open = useCallback(
    (to: number) => navigate(withQuery(reviewPath(assignmentId, to))),
    [assignmentId, withQuery],
  );
  const reviewing = seq !== undefined;
  const live = stage.kind === "playing" || stage.kind === "paused";
  useEffect(() => {
    if (reviewing && live) toList({ replace: true });
  }, [reviewing, live, toList]);
  switch (stage.kind) {
    case "loading":
      return (
        <KidPage>
          <Message>
            <Spinner label={copy(language, "loading")} />
            <p>{copy(language, "loading")}</p>
          </Message>
        </KidPage>
      );
    case "playing":
      return (
        <KidPage>
          {player.state.phase === "resyncing" || currentOf(player.state) === null ? (
            <Message>
              <Spinner label={copy(language, "loading")} />
            </Message>
          ) : (
            <Question player={player} language={language} />
          )}
        </KidPage>
      );
    case "paused":
      return (
        <KidPage>
          <Message>
            <p data-paused>{copy(language, "play_paused")}</p>
            <Button
              type="button"
              size="commit"
              className="kid-action text-2xl"
              data-resume
              onClick={player.resume}
            >
              {copy(language, "play_paused_back")}
            </Button>
          </Message>
        </KidPage>
      );
    case "finished":
      return (
        <KidPage>
          {seq === undefined ? (
            <Results
              results={stage.results}
              language={language}
              linkOf={(to) => withQuery(reviewPath(assignmentId, to))}
            />
          ) : (
            <ChildReview
              load={player.review}
              seq={seq}
              language={language}
              onOpen={open}
              onAll={toList}
            />
          )}
        </KidPage>
      );
    case "not_found":
      return <LessonNotFound language={language} />;
    case "failed":
      return (
        <KidPage>
          <Message>
            <p data-failed>{copy(language, "load_failed")}</p>
          </Message>
        </KidPage>
      );
  }
}
