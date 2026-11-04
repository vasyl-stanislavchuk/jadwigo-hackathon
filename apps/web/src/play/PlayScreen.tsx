/**
 * The lesson a child plays at /play/<assignment> (dl-5ssh.3.1), with no login: the question on screen
 * drawn by lesson-kit's family view inside the lesson frame, the paused screen, and the results with
 * the congratulation at the end. The close button's pause sheet ends for today by pausing the
 * attempt (LessonFrame.onStop), and the paused screen goes back to the same question. Once it is
 * finished, a card on the list opens /play/<assignment>/review/<seq>, the question again
 * (dl-uukj.30.1); a review path on an attempt still being played goes back to the lesson. Before any
 * of it, a given lesson's link opens on its first screen, which says who is playing (IntroScreen).
 */

import {
  ApiError,
  type AssignmentIntroClient,
  type AttemptClient,
  createClient,
  TransientError,
} from "@jadwigo/api-client";
import type { AssignmentId, AssignmentIntro, LearnerId } from "@jadwigo/contracts";
import { type Category, copy, type Language } from "@jadwigo/copy";
import {
  browserClock,
  FamilyView,
  LessonFrame,
  press,
  QuestionCredit,
  StepFrame,
  ViewMode,
} from "@jadwigo/lesson-kit";
import { Button, Loading } from "@jadwigo/ui";
import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { withMedia } from "../media.ts";
import { navigate, useLocation } from "../nav/location.ts";
import { ChildReview } from "../review/ChildReview.tsx";
import { specOf } from "../review/Still.tsx";
import { castOf, celebrationDue, firstCast } from "./celebration.ts";
import { creditShown } from "./credit.ts";
import { IntroScreen, type Who } from "./IntroScreen.tsx";
import { Column, KidPage } from "./KidPage.tsx";
import { Iwona, Queen } from "./Queen.tsx";
import { Results } from "./Results.tsx";
import { playLearner, playPath, playRoute, reviewPath } from "./route.ts";
import { currentOf, progressOf } from "./runner.ts";
import { storedAttempt } from "./storedAttempt.ts";
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
  // A borrowed question's credit, in the language its text is shown in (dl-1eieq.3).
  const shownIn = player.lessonLanguage ?? language;
  return (
    <LessonFrame.Provider value={frame}>
      {/* The question's own text speaks the lesson's language, which may differ from the
          screens' (dl-9t2o.3); the controls keep the page's (dl-uukj.38). */}
      <QuestionCredit credit={creditShown(question.credit, shownIn)} language={shownIn}>
        <StepFrame key={question.seq} stepId={spec.id} lessonLanguage={player.lessonLanguage}>
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
              next:
                state.phase === "feedback" ? { press: press(clock, () => player.next()) } : null,
              progress: progressOf(state),
            }}
          />
        </StepFrame>
      </QuestionCredit>
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

/** The wait between tries of the first screen's read, while the network is away. */
const INTRO_RETRY_MS = 2000;

/** Who the tab already plays as, so a reload resumes: the link's child, or whoever said "To nie ja". */
function resumed(assignmentId: AssignmentId, learner: LearnerId | null): Who | null {
  if (storedAttempt.get(assignmentId, learner) !== null) return { learner, playerName: null };
  if (learner !== null && storedAttempt.get(assignmentId) !== null)
    return { learner: null, playerName: null };
  return null;
}

/**
 * A play link's way in (decision
 * 2026-11-03-a-play-link-opens-on-a-first-screen-title-and-question-count-the): no attempt starts
 * until the first screen knows who is playing. A lesson with no identity step, a featured one,
 * opens straight in, and so does a tab already playing.
 */
export function PlayScreen({
  assignmentId,
  language,
  client,
}: {
  assignmentId: AssignmentId;
  language: Language;
  /** The API, for tests; the page's own origin when absent. */
  client?: AttemptClient & AssignmentIntroClient;
}): ReactElement {
  const { query } = useLocation();
  const learner = playLearner(query);
  const [who, setWho] = useState<Who | null>(() => resumed(assignmentId, learner));
  const [intro, setIntro] = useState<AssignmentIntro | "not_found" | "failed" | null>(null);
  const reader = useMemo(() => client ?? createClient({ base: "" }), [client]);
  useEffect(() => {
    if (who !== null) return;
    let live = true;
    const read = (): void => {
      reader.getAssignmentIntro(assignmentId, learner).then(
        (answer) => {
          if (!live) return;
          if (answer.identity === "none") setWho({ learner, playerName: null });
          else setIntro(answer);
        },
        (error: unknown) => {
          if (!live) return;
          if (error instanceof TransientError) setTimeout(read, INTRO_RETRY_MS);
          else setIntro(error instanceof ApiError && error.status === 404 ? "not_found" : "failed");
        },
      );
    };
    read();
    return () => {
      live = false;
    };
  }, [reader, assignmentId, learner, who]);
  if (who !== null)
    return (
      <PlayerScreen
        assignmentId={assignmentId}
        language={language}
        who={who}
        {...(client === undefined ? {} : { client })}
      />
    );
  if (intro === "not_found") return <LessonNotFound language={language} />;
  if (intro === "failed")
    return (
      <KidPage>
        <Column>
          <p data-failed>{copy(language, "load_failed")}</p>
        </Column>
      </KidPage>
    );
  if (intro === null)
    return (
      <KidPage>
        <Loading character="olowek" label={copy(language, "loading")} />
      </KidPage>
    );
  return <IntroScreen intro={intro} learner={learner} language={language} onStart={setWho} />;
}

function PlayerScreen({
  assignmentId,
  language,
  who,
  client,
}: {
  assignmentId: AssignmentId;
  language: Language;
  who: Who;
  client?: AttemptClient;
}): ReactElement {
  const { path, query } = useLocation();
  const player = usePlayer(assignmentId, client, who.learner, who.playerName);
  const { stage } = player;
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
  // Who plays first is the attempt's coin, the same after a reload; the second is the other one.
  const first = firstCast(player.attemptId ?? assignmentId);
  // Once a clip is gone (it ended, a tap) it stays gone; celebrationDue holds for one praise only.
  const due = celebrationDue(player.state);
  const dueSeq = due === null ? null : player.state.seq;
  const [goneSeq, setGoneSeq] = useState<number | null>(null);
  const hide = useCallback(() => setGoneSeq(dueSeq), [dueSeq]);
  const celebrating = due !== null && dueSeq !== goneSeq ? castOf(due, first) : null;
  const reviewing = seq !== undefined;
  const live = stage.kind === "playing" || stage.kind === "paused";
  useEffect(() => {
    if (reviewing && live) toList({ replace: true });
  }, [reviewing, live, toList]);
  switch (stage.kind) {
    case "loading":
      return (
        <KidPage>
          <Loading character="olowek" label={copy(language, "loading")} />
        </KidPage>
      );
    case "playing":
      return (
        <KidPage>
          {player.state.phase === "resyncing" || currentOf(player.state) === null ? (
            <Loading character="olowek" label={copy(language, "loading")} />
          ) : (
            <Question player={player} language={language} />
          )}
          {celebrating === "queen" && <Queen key={dueSeq} onDone={hide} />}
          {celebrating === "iwona" && <Iwona key={dueSeq} language={language} onDone={hide} />}
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
    case "link_incomplete":
      return (
        <KidPage>
          <Column>
            <p data-link-incomplete>{copy(language, "play_link_incomplete")}</p>
          </Column>
        </KidPage>
      );
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
