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
  press,
  StepFrame,
  ViewMode,
} from "@jadwigo/lesson-kit";
import { Button, Spinner } from "@jadwigo/ui";
import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { withMedia } from "../media.ts";
import { navigate, useLocation } from "../nav/location.ts";
import { ChildReview } from "../review/ChildReview.tsx";
import { specOf } from "../review/Still.tsx";
import { Column, KidPage } from "./KidPage.tsx";
import { Queen } from "./Queen.tsx";
import { queenDue } from "./queen.ts";
import { Results } from "./Results.tsx";
import { playPath, playRoute, reviewPath } from "./route.ts";
import { currentOf, progressOf } from "./runner.ts";
import { type Player, usePlayer } from "./usePlayer.ts";

const CATEGORY: Category = "child";

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
  // The page's half of the question, its picture refs already media URLs (src/media.ts).
  const spec = specOf(question);
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
              help: withMedia(state.help),
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
      <Column>
        <p data-not-found>{copy(language, "play_not_found")}</p>
      </Column>
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
  // Once she is gone (the clip ended, a tap) she stays gone; queenDue holds for one praise only.
  const [queenGone, setQueenGone] = useState(false);
  const hideQueen = useCallback(() => setQueenGone(true), []);
  const reviewing = seq !== undefined;
  const live = stage.kind === "playing" || stage.kind === "paused";
  useEffect(() => {
    if (reviewing && live) toList({ replace: true });
  }, [reviewing, live, toList]);
  switch (stage.kind) {
    case "loading":
      return (
        <KidPage>
          <Column>
            <Spinner label={copy(language, "loading")} />
          </Column>
        </KidPage>
      );
    case "playing":
      return (
        <KidPage>
          {player.state.phase === "resyncing" || currentOf(player.state) === null ? (
            <Column>
              <Spinner label={copy(language, "loading")} />
            </Column>
          ) : (
            <Question player={player} language={language} />
          )}
          {queenDue(player.state) && !queenGone && <Queen onDone={hideQueen} />}
        </KidPage>
      );
    case "paused":
      return (
        <KidPage>
          <Column>
            <p data-paused>{copy(language, "play_paused")}</p>
            <Button
              type="button"
              size="commit"
              className="text-jw-option"
              data-resume
              onClick={player.resume}
            >
              {copy(language, "play_paused_back")}
            </Button>
          </Column>
        </KidPage>
      );
    case "finished":
      return (
        <KidPage>
          {seq === undefined ? (
            <Results
              results={stage.results}
              review={player.review.kind === "ready" ? player.review.review : null}
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
          <Column>
            <p data-failed>{copy(language, "load_failed")}</p>
          </Column>
        </KidPage>
      );
  }
}
