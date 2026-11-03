/**
 * One lesson's workspace, /parent/lessons/<conversation> (dl-z5ja.108; decision 2026-11-01-the-
 * parent-app-is-a-sidebar-shell-and-a-3-column-lesson-workspac, dl-xo0q, handoff §5.4–5.5): the
 * frame (Workspace.tsx) filled from the engine.
 *
 *   chat     the conversation (ChatPane, parent variant): the parent's message, Jadwigo's lines,
 *            the tools folded, the composer that stays live; Esc stops a run, no Stop button
 *   band     the run's state in words, and the polite live region that speaks when a turn ends or
 *            needs the parent
 *   preview  over the chat, from the lesson card's expand button (dl-1eieq.1): the latest
 *            revision (LessonPane), its changed steps marked, Zmień ten krok on each, with the
 *            card's actions in its foot; or, when `?open` names another thing, that thing's panel
 *            (the inspector, dl-uukj.47.58)
 *   (no footer: giving the lesson, and when, happen in the chat; design review 2026-11-02)
 *
 * The run's state everywhere (the band, the lesson's placeholder and the live region) is one
 * `runPhase` (src/chat/phase.ts, dl-uukj.47.29), so they never disagree.
 *
 * The first screen made the conversation and left its words in the tab (engine.ts firstMessage):
 * once the page has read the conversation back and found no turn, it sends them, once. A route that
 * answers AiConsentMissing puts the consent screen in the chat until the parent agrees.
 */

import { ApiError, type ParentClient } from "@jadwigo/api-client";
import type { ConversationId, Learner, LearnerId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { type ReactElement, useEffect, useRef, useState } from "react";
import type { ReadAttachment } from "../../chat/attachments/ThreadAttachments.tsx";
import type { UploadDeps } from "../../chat/attachments/upload.ts";
import { ChatPane } from "../../chat/ChatPane.tsx";
import { ConsentScreen, giveConsent } from "../../chat/ConsentScreen.tsx";
import { addedSteps, LessonPane } from "../../chat/LessonPane.tsx";
import { lessonSummary, useLessonWiring } from "../../chat/lessonWiring.ts";
import { type GiveState, LessonActions } from "../../chat/objects/LessonActions.tsx";
import { lessonChanging } from "../../chat/objects/LessonCard.tsx";
import { type ObjectRef, sameObject } from "../../chat/objects/ref.ts";
import { ObjectPanel, objectHeading, type PanelPage } from "../../chat/objects/registry.tsx";
import { elapsedSeconds, phaseAnnouncement, usePhase } from "../../chat/phase.ts";
import { holdServer } from "../../chat/routesTransport.ts";
import { useConversation } from "../../chat/useConversation.ts";
import { NavLink } from "../../nav/NavLink.tsx";
import { playPath } from "../../play/route.ts";
import { CATEGORY, pageLang } from "../adult.ts";
import { DlaSelect } from "../newLesson/DlaSelect.tsx";
import { parentPath } from "../route.ts";
import { firstMessage, type LessonEngine } from "./engine.ts";
import { useInspector } from "./inspector.ts";
import { Workspace } from "./Workspace.tsx";

export function LessonWorkspace({
  language,
  conversation,
  engine,
  learners,
  forLearner,
  onForChange,
  onAddChild,
  api = null,
  readAttachment = null,
  uploadDeps = null,
}: {
  language: Language;
  /** The server's conversation: the route's id. */
  conversation: ConversationId;
  engine: LessonEngine;
  learners: readonly Learner[];
  /** Dla: who the lesson is for, or null. */
  forLearner: LearnerId | null;
  /** Dla's change, from the composer's picker. */
  onForChange: (learner: LearnerId | null) => void;
  /** Opens Dodaj dziecko from Dla's menu. */
  onAddChild: () => void;
  /** The parent's client, for a child opened beside the chat (dl-uukj.47.59); none in a playground. */
  api?: ParentClient | null;
  /** Reads a sent photo's link for the thread (dl-z5ja.11.6); none shows no photos. */
  readAttachment?: ReadAttachment | null;
  /** What a photo's upload runs on (dl-uukj.47.71.8): the chat's composer adds photos with it. */
  uploadDeps?: UploadDeps | null;
}): ReactElement {
  const t = (key: CopyKey, vars: Record<string, string | number> = {}): string =>
    copy(language, key, vars, CATEGORY);
  // The route's id is the server's: it stands for itself in the transport, before the first read.
  holdServer(conversation);
  // Who is signed in, for the queue kept in the tab (chat/queue.ts); unknown until the token reads.
  const [owner, setOwner] = useState<string | null | false>(
    engine.owner === undefined ? null : false,
  );
  useEffect(() => {
    if (engine.owner === undefined) return;
    let live = true;
    void engine.owner().then(
      (who) => live && setOwner(who),
      () => live && setOwner(null),
    );
    return () => {
      live = false;
    };
  }, [engine]);
  const {
    state,
    send,
    stop,
    edit,
    consentMissing,
    consented,
    refetch,
    retry,
    next,
    sendNow,
    takeNext,
    contextClosed,
    closeContext,
    resend,
  } = useConversation(engine.transport, conversation, owner, engine.owner);
  const lesson = useLessonWiring(state);
  const { turns } = lesson;
  const restoring = state.connection === "restoring";
  const { ratings } = engine;
  const { phase, now } = usePhase(turns, state, refetch);
  // The preview over the chat (dl-1eieq.1): this conversation's lesson, or another thing the URL
  // opened; shut while `?open` names nothing.
  const inspector = useInspector();
  const ownLesson: ObjectRef = { kind: "lesson", id: conversation };
  const opened = inspector.current;
  const panelPage: PanelPage = { language, lang: pageLang(), learners, api };

  // The first screen's words and photos: sent once the page has read the conversation back with no turn in it,
  // with Dla as their page, so the run reads that child's record (dl-uukj.47.12).
  const firstDone = useRef(false);
  useEffect(() => {
    if (firstDone.current || restoring) return;
    firstDone.current = true;
    const first = firstMessage.take(conversation);
    // A message has words or a photo; one with neither (a kept value that did not read) goes nowhere.
    const sendable = first !== null && (first.text !== "" || first.attachment_ids.length > 0);
    if (first !== null && sendable && state.runs.length === 0)
      send(
        first.text,
        forLearner === null ? undefined : { learner_id: forLearner },
        first.attachment_ids,
      );
  }, [restoring, conversation, state.runs.length, send, forLearner]);

  // One state, in words, for every place that says it.
  const words = phase === null ? "" : t(phase.copyKey);
  const seconds = phase?.kind === "awaiting_input" ? null : elapsedSeconds(phase, now);
  const announce = restoring ? null : phaseAnnouncement(phase);
  const said = phase !== null && phase.kind !== "done";
  const summary = lessonSummary(lesson.shown);
  const child = learners.find((l) => l.id === forLearner) ?? null;

  // Daj lekcję (dl-uukj.47.55): the revision the parent sees, given to the Dla child or to nobody
  // in particular, as one link to send or open. The route refuses a revision no check passed
  // (harsh words included) or that is no longer the latest, and a child outside the family.
  const [given, setGiven] = useState<GiveState>({ kind: "idle" });
  const shownRevision = lesson.shown?.revision;
  // A link is for one child and one revision: either changing takes it off the card, and a reply
  // still on its way for the old pair says nothing.
  const giveFor = `${forLearner}:${shownRevision}`;
  const giveForNow = useRef(giveFor);
  giveForNow.current = giveFor;
  useEffect(() => setGiven({ kind: "idle" }), [giveFor]);
  const giveTo = async (to: Learner | null): Promise<void> => {
    if (engine.give === null || !lesson.ready) return;
    const asked = giveFor;
    setGiven({ kind: "giving" });
    try {
      const { assignment } = await engine.give.giveLesson(conversation, {
        ...(shownRevision === undefined ? {} : { revision: shownRevision }),
        ...(to === null ? {} : { learner_id: to.id }),
      });
      if (giveForNow.current !== asked) return;
      const search = to === null ? "" : `?${new URLSearchParams({ learner: to.id })}`;
      setGiven({
        kind: "given",
        name: to?.first_name ?? null,
        href: `${playPath(assignment.id)}${search}`,
      });
    } catch (error) {
      if (giveForNow.current !== asked) return;
      const type = error instanceof ApiError ? error.type : null;
      setGiven({
        kind: "refused",
        reason:
          type === "LessonNotPublishable" ? "changed" : type === "NotFound" ? "child" : "failed",
      });
    }
  };

  // A lesson URL the routes refuse (another family's, or gone): one line and the way to a new one,
  // never 3 empty columns stuck restoring (dl-uukj.47.33).
  if (state.notFound)
    return (
      <div className="flex flex-col items-start gap-3 p-6" data-not-found>
        <p className="text-jw-ink">{t("chat_not_found")}</p>
        <NavLink
          href={parentPath({ lang: pageLang() })}
          className="font-bold text-jw-ink underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-jw-focus"
        >
          {t("parent_new_lesson")}
        </NavLink>
      </div>
    );

  // The lesson's actions, in its card and again in its preview's foot (dl-1eieq.1): one give state.
  const actions = (
    <LessonActions
      language={language}
      ready={lesson.ready}
      child={child}
      lesson={lesson.shown}
      forWhom={
        <DlaSelect
          language={language}
          learners={learners}
          value={forLearner}
          onChange={onForChange}
          onAddChild={onAddChild}
        />
      }
      given={given}
      {...(engine.give === null
        ? {}
        : {
            onGive: () => void giveTo(child),
          })}
    />
  );

  const chat = consentMissing ? (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <ConsentScreen
        language={language}
        onAgree={async () => {
          if (engine.consent === null) throw new Error("no route to give consent through");
          await giveConsent(engine.consent);
          consented();
        }}
      />
    </div>
  ) : (
    <ChatPane
      variant="parent"
      readAttachment={readAttachment ?? undefined}
      language={language}
      turns={turns}
      queued={state.queued.map((q) => q.text)}
      restoring={restoring}
      stopping={state.stopping}
      sendFailed={state.sendFailed}
      sendLimit={state.sendLimit}
      // Each message carries Dla as its page, as the first one did, so the run reads that child.
      onSend={(text, attachmentIds) =>
        send(text, forLearner === null ? undefined : { learner_id: forLearner }, attachmentIds)
      }
      uploadDeps={uploadDeps ?? undefined}
      composerLead={
        <DlaSelect
          language={language}
          learners={learners}
          value={forLearner}
          onChange={onForChange}
          onAddChild={onAddChild}
        />
      }
      onStop={stop}
      onRate={ratings === null ? undefined : (run, body) => ratings.rateRun(run, body)}
      phase={phase}
      now={now}
      pending={state.pending?.text ?? null}
      onRetry={retry}
      nameOf={(id) => learners.find((l) => l.id === id)?.first_name ?? null}
      next={next}
      onSendNow={sendNow}
      onTakeNext={takeNext}
      contextClosed={contextClosed}
      onCloseContext={closeContext}
      onResend={resend}
      lessonObject={ownLesson}
      onOpen={inspector.open}
      // How and when to give the lesson live in its card (dl-uukj.47.55, decision dl-hz9ks).
      lessonActions={actions}
    />
  );

  return (
    <Workspace
      language={language}
      chat={chat}
      chatBand={
        <>
          {/* The run's state as words, never a coloured dot alone. */}
          <p
            className="truncate text-jw-page-small text-jw-ink-soft"
            data-status={phase?.kind ?? "none"}
          >
            {words}
            {seconds !== null && ` · ${t("chat_phase_elapsed", { seconds })}`}
          </p>
          <p role="status" aria-live="polite" className="sr-only" data-live>
            {announce === null ? "" : t(announce)}
          </p>
        </>
      }
      preview={
        opened === null
          ? null
          : sameObject(opened, ownLesson)
            ? {
                title: summary.title === "" ? t("parent_new_lesson") : summary.title,
                body:
                  lesson.shown === null && lesson.ghosts === 0 ? (
                    <p className="text-jw-ink-soft" data-lesson-waiting>
                      {said ? words : t("parent_lesson_empty")}
                    </p>
                  ) : (
                    <LessonPane
                      language={language}
                      lesson={lesson.shown}
                      changed={lesson.changed}
                      added={addedSteps(lesson.turns, lesson.changed)}
                      onEdit={edit}
                      ghosts={lesson.ghosts}
                      withChild={child !== null}
                      bare
                    />
                  ),
                actions,
                band: lessonChanging(lesson.turns),
              }
            : {
                title: objectHeading(opened, panelPage),
                body: <ObjectPanel object={opened} page={panelPage} />,
              }
      }
      onClosePreview={inspector.close}
    />
  );
}
