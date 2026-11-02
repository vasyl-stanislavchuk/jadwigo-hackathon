/**
 * /parent/lessons, the family's lessons as one table (dl-z5ja.106.1; handoff §3 "Lists = table +
 * filter", §6 Lekcje): the segmented filter and the search above it, a row per live conversation,
 * newest first, each opening its workspace. A lesson belongs to the family, not to a child, and a
 * conversation names no child, so every row reads "Bez dziecka" in muted ink until the data says
 * otherwise. "Nowa lekcja" is the page's first thing, a primary button at its top left above the
 * filters, on the empty page too (dl-uukj.47.18). Each row
 * has Archive, the parent's delete (dl-uukj.47.9, decision dl-84wo): it asks once with a line that
 * says what it does, and the row leaves only once the route answers; a failure keeps it and says
 * so. The rows come from the page (useLessons), which the sidebar reads too. Columns, sorting and
 * drafts against given are open with the owner; these are the columns the data has.
 */

import type { Conversation, ConversationId, Learner, LearnerId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import {
  Button,
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
import { Fragment, type ReactElement, useState } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { Failed } from "../Failed.tsx";
import { shows, type Who } from "../lists/filter.ts";
import { ListControls } from "../lists/ListControls.tsx";
import { lessonPath } from "../route.ts";
import { NewLessonRow } from "./NewLessonRow.tsx";
import type { LessonRows } from "./useLessons.ts";

/** The child a conversation is for. None names one yet, so every lesson is the family's. */
const learnerOf = (_conversation: Conversation): LearnerId | null => null;

export function LessonsTable({
  language,
  learners,
  lessons,
  onArchive,
}: {
  language: Language;
  learners: readonly Learner[];
  /** The family's conversations, newest first (useLessons). */
  lessons: LessonRows;
  /** Archives one; rejects when the route fails. */
  onArchive: (id: ConversationId) => Promise<void>;
}): ReactElement {
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  const [who, setWho] = useState<Who>("all");
  const [search, setSearch] = useState("");
  /** The row whose Archive asks to confirm, and the row whose archive failed. */
  const [asking, setAsking] = useState<ConversationId | null>(null);
  const [failed, setFailed] = useState<ConversationId | null>(null);
  const [busy, setBusy] = useState(false);

  if (lessons === null) return <Spinner label={t("loading")} />;
  if (lessons === "failed") return <Failed language={language} />;
  const conversations = lessons;

  const archive = (id: ConversationId): void => {
    setBusy(true);
    onArchive(id).then(
      () => {
        setAsking(null);
        setFailed(null);
        setBusy(false);
      },
      () => {
        setFailed(id);
        setAsking(null);
        setBusy(false);
      },
    );
  };

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
      <NewLessonRow language={language} />
      <ListControls
        language={language}
        learners={learners}
        who={who}
        onWho={setWho}
        search={search}
        onSearch={setSearch}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("parent_lesson")}</TableHead>
            <TableHead>{t("parent_col_child")}</TableHead>
            <TableHead>{t("parent_col_day")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map(({ conversation, learner, title, child }) => (
            <Fragment key={conversation.id}>
              <TableRow
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
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="control"
                    onClick={() => {
                      setAsking(conversation.id);
                      setFailed(null);
                    }}
                    data-archive={conversation.id}
                  >
                    {t("chat_list_archive")}
                  </Button>
                </TableCell>
              </TableRow>
              {asking === conversation.id && (
                <TableRow data-archive-confirm={conversation.id}>
                  <TableCell colSpan={4} className="whitespace-normal">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="min-w-0 flex-1">{t("chat_list_archive_confirm")}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="control"
                        onClick={() => setAsking(null)}
                      >
                        {t("parent_cancel")}
                      </Button>
                      <Button
                        type="button"
                        size="control"
                        disabled={busy}
                        onClick={() => archive(conversation.id)}
                        data-archive-yes
                      >
                        {t("chat_list_archive_yes")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {failed === conversation.id && (
                <TableRow data-archive-failed={conversation.id}>
                  <TableCell colSpan={4} className="whitespace-normal" role="alert">
                    {t("chat_list_archive_failed")}
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
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
