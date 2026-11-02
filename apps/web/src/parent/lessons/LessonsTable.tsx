/**
 * /parent/lessons, the family's lessons as one table (dl-z5ja.106.1; handoff §3 "Lists = table +
 * filter", §6 Lekcje): the segmented filter and the search above it, a row per live conversation,
 * newest first, each opening its workspace. A lesson belongs to the family, not to a child, and a
 * conversation names no child, so every row reads "Bez dziecka" in muted ink until the data says
 * otherwise. "Nowa lekcja" stands atop the table, on the empty page too (dl-uukj.47.18). Columns, sorting and drafts against given are open with the owner; these are the
 * columns the data has.
 */

import type { ConversationListClient } from "@jadwigo/api-client";
import type { Conversation, Learner, LearnerId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import {
  cn,
  Link,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@jadwigo/ui";
import { type ReactElement, useEffect, useState } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { Failed } from "../Failed.tsx";
import { shows, type Who } from "../lists/filter.ts";
import { ListControls } from "../lists/ListControls.tsx";
import { lessonPath } from "../route.ts";
import { NewLessonRow } from "./NewLessonRow.tsx";

type Loaded = readonly Conversation[] | "failed" | null;

/** The child a conversation is for. None names one yet, so every lesson is the family's. */
const learnerOf = (_conversation: Conversation): LearnerId | null => null;

export function LessonsTable({
  language,
  learners,
  list,
}: {
  language: Language;
  learners: readonly Learner[];
  /** The conversation list's route, or null where there is none (a test's client): no rows. */
  list: Pick<ConversationListClient, "listConversations"> | null;
}): ReactElement {
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  const [conversations, setConversations] = useState<Loaded>(list === null ? [] : null);
  const [who, setWho] = useState<Who>("all");
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (list === null) return;
    let live = true;
    list.listConversations().then(
      (reply) => live && setConversations(reply.conversations),
      () => live && setConversations("failed"),
    );
    return () => {
      live = false;
    };
  }, [list]);

  if (conversations === null) return <Spinner label={t("loading")} />;
  if (conversations === "failed") return <Failed language={language} />;

  const day = new Intl.DateTimeFormat(language, { dateStyle: "medium" });
  const names = new Map(learners.map((learner) => [learner.id, learner.first_name]));
  const rows = conversations.map((conversation) => {
    const learner = learnerOf(conversation);
    const title = conversation.title ?? t("parent_lesson_untitled");
    const child = learner === null ? null : (names.get(learner) ?? null);
    return { conversation, learner, title, child, words: [title, child ?? ""] };
  });
  const shown = rows.filter((row) => shows(row, who, search));

  return (
    <section className="flex w-full flex-col gap-4" data-lessons-table>
      <ListControls
        language={language}
        learners={learners}
        who={who}
        onWho={setWho}
        search={search}
        onSearch={setSearch}
      />
      <NewLessonRow language={language} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("parent_lesson")}</TableHead>
            <TableHead>{t("parent_col_child")}</TableHead>
            <TableHead>{t("parent_col_day")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map(({ conversation, learner, title, child }) => (
            <TableRow
              key={conversation.id}
              data-lesson-row={conversation.id}
              data-no-child={learner === null ? "" : undefined}
              className={cn(learner === null && "text-jw-ink-soft")}
            >
              <TableCell className="max-w-0 w-full truncate">
                <Link asChild>
                  <NavLink
                    href={lessonPath({ conversation: conversation.id, lang: pageLang() })}
                    data-lesson-link
                  >
                    {title}
                  </NavLink>
                </Link>
              </TableCell>
              <TableCell>{child ?? t("parent_no_child")}</TableCell>
              <TableCell>{day.format(new Date(conversation.created_at))}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && (
        <p className="text-jw-ink-soft" data-lessons-empty>
          {t("parent_lessons_empty")}
        </p>
      )}
      {rows.length > 0 && shown.length === 0 && (
        <p className="text-jw-ink-soft" data-no-match>
          {t("parent_list_no_match")}
        </p>
      )}
    </section>
  );
}
