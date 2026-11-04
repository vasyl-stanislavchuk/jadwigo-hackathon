/**
 * /playground/workspace (dl-uukj.47.27): the parent's lesson workspace (parent/workspace/
 * LessonWorkspace.tsx) on the dev server's in-process engine (dev/engine-plugin.ts, ScriptedMuse),
 * so the chat can be seen without Supabase or a paid run. Dev only.
 *
 * The page opens on a conversation of its own with the made-up parent's first words waiting, as the
 * first screen leaves them, so a turn plays at once; a reload keeps the conversation and draws it
 * again from the log. `?pace=slow|stall|fail` plays every turn slow, stalled or failed (wire.ts),
 * each pace on a conversation of its own. Consent and ratings have no route here, so neither shows;
 * Daj lekcję answers a made-up assignment (fixtures.ts madeUpGiven), with no network.
 */

import type { LearnerId } from "@jadwigo/contracts";
import { Conversation, ConversationId } from "@jadwigo/contracts/run";
import { copy, type Language } from "@jadwigo/copy";
import { DensityScope, setAudience } from "@jadwigo/ui";
import { type ReactElement, type ReactNode, useLayoutEffect, useMemo, useState } from "react";
import { newConversationId } from "../../chat/ids.ts";
import { type EngineTransport, hotTransport } from "../../chat/useConversation.ts";
import { type Pace, paceOf } from "../../chat/wire.ts";
import { queryLanguage, useLocation } from "../../nav/location.ts";
import { CATEGORY } from "../../parent/adult.ts";
import { firstMessage, type LessonEngine } from "../../parent/workspace/engine.ts";
import { LessonWorkspace } from "../../parent/workspace/LessonWorkspace.tsx";
import { ACCOUNT, FIRST_WORDS, LEARNERS, madeUpGiven, POD } from "./fixtures.ts";

const STORED = (pace: Pace | null) => `jadwigo.playground.workspace.${pace ?? "normal"}`;

/** The tab's conversation for this pace; a new one gets the first words waiting. */
function storedConversation(pace: Pace | null, held: Storage): ConversationId {
  const kept = ConversationId.safeParse(held.getItem(STORED(pace)));
  if (kept.success) return kept.data;
  const minted = newConversationId();
  held.setItem(STORED(pace), minted);
  firstMessage.put(minted, FIRST_WORDS, held);
  return minted;
}

/** The engine on a transport: conversations are minted here, and there is no consent or rating route. */
function devEngine(transport: EngineTransport): LessonEngine {
  return {
    conversations: {
      createConversation: async () =>
        Conversation.parse({
          id: newConversationId(),
          pod_id: POD,
          created_by: ACCOUNT,
          title: null,
          created_at: new Date().toISOString(),
        }),
    },
    transport,
    consent: null,
    ratings: null,
    give: { giveLesson: async () => madeUpGiven(), renameLesson: async () => ({ revision: 2 }) },
  };
}

/**
 * The parent shell's frame without its sidebar: the workspace fills it, in the adult's look
 * (`<html data-audience="adult">`, foundation.css), as the parent app draws it. The rest of the
 * playground keeps the child's (App.tsx), so leaving the page gives it back. The dialogs and
 * tooltips Radix portals to the body take it too, which a wrapper element would not give them.
 */
function Frame({ children }: { children: ReactNode }): ReactElement {
  useLayoutEffect(() => {
    setAudience(document.documentElement, "adult");
    return () => setAudience(document.documentElement, "kid");
  }, []);
  return (
    <DensityScope
      value="parent"
      className="flex h-dvh bg-jw-ground text-jw-page-body leading-jw-page text-jw-ink"
    >
      <div className="flex min-w-0 flex-1 flex-col" data-page="workspace">
        {children}
      </div>
    </DensityScope>
  );
}

export function WorkspacePlayground({
  transport,
  held = window.sessionStorage,
}: {
  /** A test's transport; the dev server's when absent. */
  transport?: EngineTransport;
  /** Where the tab keeps its conversations; a test's own. */
  held?: Storage;
} = {}): ReactElement {
  const { query } = useLocation();
  const language: Language = queryLanguage(query) ?? "pl";
  const pace = paceOf(query.get("pace"));
  const engine = useMemo(() => {
    const live = transport ?? hotTransport(pace);
    return live === null ? null : devEngine(live);
  }, [transport, pace]);
  const conversation = useMemo(() => storedConversation(pace, held), [pace, held]);
  const [forLearner, setForLearner] = useState<LearnerId | null>(null);

  if (engine === null)
    return <p className="p-4">{copy(language, "chat_dev_only", {}, CATEGORY)}</p>;
  return (
    <Frame>
      <LessonWorkspace
        key={conversation}
        language={language}
        conversation={conversation}
        engine={engine}
        learners={LEARNERS}
        forLearner={forLearner}
        onForChange={setForLearner}
        onAddChild={() => {}}
      />
    </Frame>
  );
}
