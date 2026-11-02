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
 * The run's state everywhere (the band, the folded strip, the lesson's placeholder, the footer and
 * the live region) is one `runPhase` (src/chat/phase.ts, dl-uukj.47.29), so they never disagree.
 *
 * The first screen made the conversation and left its words in the tab (engine.ts firstMessage):
 * once the page has read the conversation back and found no turn, it sends them, once. A route that
 * answers AiConsentMissing puts the consent screen in the chat until the parent agrees.
 */

import type { ConversationId, Learner, LearnerId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { type ReactElement, useEffect, useRef } from "react";
import { ChatPane } from "../../chat/ChatPane.tsx";
import { ConsentScreen, giveConsent } from "../../chat/ConsentScreen.tsx";
import { LessonPane } from "../../chat/LessonPane.tsx";
import { lessonSummary, useLessonWiring } from "../../chat/lessonWiring.ts";
import { elapsedSeconds, phaseAnnouncement, type RunPhase, usePhase } from "../../chat/phase.ts";
import { holdServer } from "../../chat/routesTransport.ts";
import { useConversation } from "../../chat/useConversation.ts";
import { navigate } from "../../nav/location.ts";
import { CATEGORY, pageLang } from "../adult.ts";
import { lessonsPath } from "../route.ts";
import { DetailsPanel } from "./DetailsPanel.tsx";
import { firstMessage, type LessonEngine } from "./engine.ts";
import { LessonFooter } from "./LessonFooter.tsx";
import { Workspace } from "./Workspace.tsx";

/**
 * The footer's line: the run's state while a turn is open or ended badly, then the steps once the
 * lesson has any; never "0 z 0" (dl-uukj.47.23).
 */
function footerStatus(
  phase: RunPhase | null,
  words: string,
  steps: number,
  t: (key: CopyKey, vars?: Record<string, string | number>) => string,
): string {
  const parts: string[] = [];
  if (phase !== null && phase.kind !== "done") parts.push(words);
  if (steps > 0) parts.push(t("parent_steps_ready", { done: steps, total: steps }));
  return parts.join(" · ");
}

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
  const { state, send, stop, edit, consentMissing, consented, refetch, retry } = useConversation(
    engine.transport,
    conversation,
  );
  const lesson = useLessonWiring(state, edit);
  const { turns } = lesson;
  const restoring = state.connection === "restoring";
  const { ratings } = engine;
  const { phase, now } = usePhase(turns, state, refetch);

  // The first screen's words: sent once the page has read the conversation back with no turn in it,
  // with Dla as their page, so the run reads that child's record (dl-uukj.47.12).
  const firstDone = useRef(false);
  useEffect(() => {
    if (firstDone.current || restoring) return;
    firstDone.current = true;
    const text = firstMessage.take(conversation);
    if (text !== null && state.runs.length === 0)
      send(text, forLearner === null ? undefined : { learner_id: forLearner });
  }, [restoring, conversation, state.runs.length, send, forLearner]);

  // One state, in words, for every place that says it.
  const words = phase === null ? "" : t(phase.copyKey);
  const seconds = phase?.kind === "awaiting_input" ? null : elapsedSeconds(phase, now);
  const announce = restoring ? null : phaseAnnouncement(phase);
  const said = phase !== null && phase.kind !== "done";
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
      phase={phase}
      now={now}
      pending={state.pending?.text ?? null}
      onRetry={retry}
      nameOf={(id) => learners.find((l) => l.id === id)?.first_name ?? null}
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
      {...(phase === null ? {} : { chatFact: words })}
      lessonTitle={summary.title === "" ? t("parent_new_lesson") : summary.title}
      lesson={
        lesson.shown === null ? (
          <p className="text-jw-ink-soft" data-lesson-waiting>
            {said ? words : t("parent_lesson_empty")}
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
          status={footerStatus(phase, words, summary.steps, t)}
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
          learners={learners}
          child={child}
          onAddChild={onAddChild}
          changeMenu={changeMenu}
        />
      }
      detailsFact={child?.first_name ?? t("parent_no_child")}
    />
  );
}
