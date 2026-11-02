/**
 * One lesson's workspace, /parent/lessons/<conversation> (dl-z5ja.108; decision 2026-11-01-the-
 * parent-app-is-a-sidebar-shell-and-a-3-column-lesson-workspac, dl-xo0q, handoff §5.4–5.5): the
 * frame (Workspace.tsx) filled from the engine.
 *
 *   chat     the conversation (ChatPane, parent variant): the parent's message, Jadwigo's lines,
 *            the tools folded, the composer that stays live; Esc stops a run, no Stop button
 *   band     the run's state in words, and the polite live region that speaks when a turn ends or
 *            needs the parent
 *   lesson   the latest revision (LessonPane), its changed steps marked, Cofnij and step edits
 *   footer   the steps so far, "Zapisz na później" and the one primary, quiet until giving exists
 *            (dl-z5ja.108.1.1)
 *   details  who the lesson is for, and about it
 *
 * The first screen made the conversation and left its words in the tab (engine.ts firstMessage):
 * once the page has read the conversation back and found no turn, it sends them, once. A route that
 * answers AiConsentMissing puts the consent screen in the chat until the parent agrees.
 */

import type { ConversationId, Learner, LearnerId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { type ReactElement, useEffect, useRef } from "react";
import { navigate } from "../../nav/location.ts";
import {
  announcementFor,
  ChatPane,
  STATUS_KEY,
  statusOf,
} from "../../playground/chat/ChatPane.tsx";
import { ConsentScreen, giveConsent } from "../../playground/chat/ConsentScreen.tsx";
import { isOpen } from "../../playground/chat/conversation.ts";
import { LessonPane } from "../../playground/chat/LessonPane.tsx";
import { lessonSummary, useLessonWiring } from "../../playground/chat/lessonWiring.ts";
import { holdServer } from "../../playground/chat/routesTransport.ts";
import { useConversation } from "../../playground/chat/useConversation.ts";
import { CATEGORY, pageLang } from "../adult.ts";
import { lessonsPath } from "../route.ts";
import { DetailsPanel } from "./DetailsPanel.tsx";
import { firstMessage, type LessonEngine } from "./engine.ts";
import { LessonFooter } from "./LessonFooter.tsx";
import { Workspace } from "./Workspace.tsx";

export function LessonWorkspace({
  language,
  conversation,
  engine,
  learners,
  forLearner,
  onAddChild,
  changeMenu,
}: {
  language: Language;
  /** The server's conversation: the route's id. */
  conversation: ConversationId;
  engine: LessonEngine;
  learners: readonly Learner[];
  /** Dla: who the lesson is for, or null. */
  forLearner: LearnerId | null;
  onAddChild: () => void;
  /** Wraps the details' "Zmień" in the Dla menu. */
  changeMenu: (trigger: ReactElement) => ReactElement;
}): ReactElement {
  const t = (key: CopyKey, vars: Record<string, string | number> = {}): string =>
    copy(language, key, vars, CATEGORY);
  // The route's id is the server's: it stands for itself in the transport, before the first read.
  holdServer(conversation);
  const { state, send, stop, edit, consentMissing, consented } = useConversation(
    engine.transport,
    conversation,
  );
  const lesson = useLessonWiring(state, edit);
  const { turns } = lesson;
  const restoring = state.connection === "restoring";
  const { ratings } = engine;

  // The first screen's words: sent once the page has read the conversation back with no turn in it.
  const firstDone = useRef(false);
  useEffect(() => {
    if (firstDone.current || restoring) return;
    firstDone.current = true;
    const text = firstMessage.take(conversation);
    if (text !== null && state.runs.length === 0) send(text);
  }, [restoring, conversation, state.runs.length, send]);

  const status = statusOf(turns);
  const announce = announcementFor(turns, restoring);
  const writing = turns.length > 0 && isOpen(turns[turns.length - 1] as (typeof turns)[number]);
  const summary = lessonSummary(lesson.shown);
  const child = learners.find((l) => l.id === forLearner) ?? null;

  const chat = consentMissing ? (
    <div className="p-4">
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
      language={language}
      turns={turns}
      queued={state.queued.map((q) => q.text)}
      restoring={restoring}
      stopping={state.stopping}
      sendFailed={state.sendFailed}
      sendLimit={state.sendLimit}
      onSend={send}
      onStop={stop}
      onRate={ratings === null ? undefined : (run, body) => ratings.rateRun(run, body)}
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
            data-status={status ?? "none"}
          >
            {status === null ? "" : t(STATUS_KEY[status])}
          </p>
          <p role="status" aria-live="polite" className="sr-only" data-live>
            {announce === null ? "" : t(announce)}
          </p>
        </>
      }
      {...(writing ? { chatFact: t("parent_writing") } : {})}
      lessonTitle={summary.title === "" ? t("parent_new_lesson") : summary.title}
      lesson={
        lesson.shown === null ? (
          <p className="text-jw-ink-soft" data-lesson-waiting>
            {t(writing ? "parent_writing" : "parent_lesson_empty")}
          </p>
        ) : (
          <LessonPane
            language={language}
            lesson={lesson.shown}
            changed={lesson.changed}
            onUndo={lesson.onUndo}
            undoRefused={lesson.undoRefused}
            undoPending={lesson.undoPending}
            onEdit={edit}
            outcomeOf={lesson.outcomeOf}
          />
        )
      }
      lessonFooter={
        <LessonFooter
          language={language}
          status={t("parent_steps_ready", { done: summary.steps, total: summary.steps })}
          // Giving the lesson comes with dl-z5ja.108.1.1; until then the primary stays quiet.
          ready={false}
          child={child}
          onSave={() => navigate(lessonsPath({ lang: pageLang() }))}
          onGive={() => {}}
        />
      }
      {...(lesson.key === null ? {} : { lessonKey: lesson.key })}
      details={
        <DetailsPanel
          language={language}
          child={child}
          onAddChild={onAddChild}
          changeMenu={changeMenu}
        />
      }
      detailsFact={child?.first_name ?? t("parent_no_child")}
    />
  );
}
