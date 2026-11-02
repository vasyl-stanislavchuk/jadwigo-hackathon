/**
 * What the chat knows about each kind of thing it can open (dl-uukj.47.58): its name, its icon and
 * its full page. PostHog keeps one such table of object kinds (path template, id guard), separate
 * from its tool widgets (`docs/research/chat-objects.md`).
 *
 * The right column draws a lesson with the lesson pane. A kind with no panel yet draws
 * `ObjectFallback`: its name and a link to its own page, the plain card's counterpart. The learner,
 * skill, assignment and attempt panels come with dl-uukj.47.59 to dl-uukj.47.61.
 */

import type { ParentClient } from "@jadwigo/api-client";
import {
  AssignmentId,
  AttemptId,
  ConversationId,
  type Learner,
  LearnerId,
} from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import {
  BookOpenIcon,
  ClipboardListIcon,
  type LucideIcon,
  SparklesIcon,
  UserRoundIcon,
} from "lucide-react";
import type { ReactElement } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { assignmentPath, attemptPath, childPath, lessonPath } from "../../parent/route.ts";
import { LearnerPanel } from "./LearnerPanel.tsx";
import type { ObjectKind, ObjectRef } from "./ref.ts";

interface ObjectEntry {
  kind: ObjectKind;
  /** The kind's name, the right column's heading while one of them is open. */
  title: CopyKey;
  icon: LucideIcon;
  /** The thing's own page, when it has one. */
  href?(ref: ObjectRef, lang: string | null): string | null;
  /** Its panel in the right column; a kind without one draws ObjectFallback. */
  Panel?(props: { object: ObjectRef; page: PanelPage }): ReactElement;
  /** The column's heading for this thing, when it says more than the kind's name (a child's name). */
  heading?(object: ObjectRef, page: PanelPage): string | null;
}

/** What the page gives a panel: its language, ?lang, the family's children and the parent's client. */
export interface PanelPage {
  language: Language;
  lang: string | null;
  learners: readonly Learner[];
  /** Null where the page has no client of its own (the playground's workspace). */
  api: ParentClient | null;
}

/** Reads an id as its kind's branded id; the ref was parsed through the same schema (ref.ts). */
function parsed<T>(
  schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } },
  id: string,
): T | null {
  const out = schema.safeParse(id);
  return out.success ? out.data : null;
}

const REGISTRY: Readonly<Record<ObjectKind, ObjectEntry>> = {
  lesson: {
    kind: "lesson",
    title: "chat_object_lesson",
    icon: BookOpenIcon,
    href: (ref, lang) => {
      const conversation = parsed(ConversationId, ref.id);
      return conversation === null ? null : lessonPath({ conversation, lang });
    },
  },
  learner: {
    kind: "learner",
    title: "chat_object_learner",
    icon: UserRoundIcon,
    href: (ref, lang) => {
      const learner = parsed(LearnerId, ref.id);
      return learner === null ? null : childPath({ learner, lang });
    },
    Panel: ({ object, page }) => (
      <LearnerPanel
        learner={object.id}
        learners={page.learners}
        api={page.api}
        language={page.language}
        lang={page.lang}
      />
    ),
    heading: (object, page) => page.learners.find((l) => l.id === object.id)?.first_name ?? null,
  },
  skill: { kind: "skill", title: "chat_object_skill", icon: SparklesIcon },
  assignment: {
    kind: "assignment",
    title: "chat_object_assignment",
    icon: ClipboardListIcon,
    href: (ref, lang) => {
      const assignment = parsed(AssignmentId, ref.id);
      return assignment === null ? null : assignmentPath({ assignment, lang });
    },
  },
  attempt: {
    kind: "attempt",
    title: "chat_object_attempt",
    icon: ClipboardListIcon,
    href: (ref, lang) => {
      const attempt = parsed(AttemptId, ref.id);
      return attempt === null ? null : attemptPath({ attempt, lang });
    },
  },
};

/** A kind's entry. */
const objectEntry = (kind: ObjectKind): ObjectEntry => REGISTRY[kind];

/**
 * A thing the right column has no panel for yet: its kind's name and the way to its own page, or
 * the line that says it can't be shown here yet.
 */
function ObjectFallback({
  object,
  language,
  lang,
}: {
  object: ObjectRef;
  language: Language;
  /** The page's ?lang, carried onto the link. */
  lang: string | null;
}): ReactElement {
  const say = (key: CopyKey) => copy(language, key, {}, "adult");
  const entry = objectEntry(object.kind);
  const Icon = entry.icon;
  const href = entry.href?.(object, lang) ?? null;
  return (
    <div className="flex flex-col items-start gap-3" data-object-fallback={object.kind}>
      <p className="flex items-center gap-2 text-jw-ink">
        <Icon aria-hidden className="size-4 text-jw-ink-soft" />
        {say(entry.title)}
      </p>
      {href === null ? (
        <p className="text-jw-ink-soft">{say("chat_object_not_here")}</p>
      ) : (
        <NavLink
          href={href}
          className="font-bold text-jw-ink underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-jw-focus"
        >
          {say("chat_object_open_page")}
        </NavLink>
      )}
    </div>
  );
}

/** A thing in the right column: its kind's panel, or the fallback (its name and its own page). */
export function ObjectPanel({
  object,
  page,
}: {
  object: ObjectRef;
  page: PanelPage;
}): ReactElement {
  const { Panel } = objectEntry(object.kind);
  return Panel === undefined ? (
    <ObjectFallback object={object} language={page.language} lang={page.lang} />
  ) : (
    <Panel object={object} page={page} />
  );
}

/** The right column's heading for a thing: what its kind says of it, else the kind's name. */
export function objectHeading(object: ObjectRef, page: PanelPage): string {
  const entry = objectEntry(object.kind);
  return entry.heading?.(object, page) ?? copy(page.language, entry.title, {}, "adult");
}
