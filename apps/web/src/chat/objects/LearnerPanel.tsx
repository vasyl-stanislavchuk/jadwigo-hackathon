/**
 * A child opened beside the chat (dl-uukj.47.59): what the child's page shows first, drawn with
 * that page's own parts, the goals, the weeks and the newest report (LearnerKnowledge, which loads
 * each apart), and the way to the child's own page. Status words only: no level, score, percentage
 * or comparison, as on the child's page.
 *
 * A child who is not one of the family's (an id the URL names that the family's list lacks) gets
 * one line and no read: the routes would refuse it anyway.
 */

import type { ParentClient } from "@jadwigo/api-client";
import type { Learner } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ReactElement } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { LearnerKnowledge } from "../../parent/learner/LearnerKnowledge.tsx";
import { childPath } from "../../parent/route.ts";

export function LearnerPanel({
  learner,
  learners,
  api,
  language,
  lang,
}: {
  /** The id `?open` names. */
  learner: string;
  /** The family's children: the panel draws only one of them. */
  learners: readonly Learner[];
  /** The parent's client, for the knowledge reads; null where the page has none (a playground). */
  api: ParentClient | null;
  language: Language;
  /** The page's ?lang, carried onto the link. */
  lang: string | null;
}): ReactElement {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const child = learners.find((l) => l.id === learner) ?? null;
  if (child === null)
    return (
      <p className="text-jw-ink-soft" data-learner-panel="unknown">
        {say("chat_object_not_here")}
      </p>
    );
  return (
    <div className="flex flex-col gap-4" data-learner-panel={child.id}>
      <NavLink
        href={childPath({ learner: child.id, lang })}
        className="w-fit font-bold text-jw-ink underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-jw-focus"
      >
        {say("chat_learner_open_page", { name: child.first_name })}
      </NavLink>
      {api === null ? (
        <p className="text-jw-ink-soft">{say("chat_object_not_here")}</p>
      ) : (
        <LearnerKnowledge
          api={api}
          learner={child.id}
          language={language}
          since={child.created_at}
        />
      )}
    </div>
  );
}
