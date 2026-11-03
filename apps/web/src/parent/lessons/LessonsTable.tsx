/**
 * /parent/lessons, the family's lessons as a data table (handoff dl-uukj.47.67 §7, D8, D11, S12-S18):
 * the filter bar and the table, no header row; the sidebar's `+` starts a new lesson. A row per live
 * conversation, opened by a click anywhere on it. A conversation names no child, status or result
 * yet, so every row reads "Bez dziecka" and Wynik "—", and there is no Status column or facet until
 * the data carries one. Archive is the parent's delete (decision dl-84wo) and is never undone, so it
 * asks once (S4's permanent case) and the row leaves only once the route answers; a failure keeps it
 * and says so. Daj lekcję and Drukuj have no route from a conversation yet, so the menu has neither.
 */

import type { Conversation, ConversationId, Learner, LearnerId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  Button,
  Disc,
  dataTableColumns,
  Notice,
} from "@jadwigo/ui";
import { ArchiveIcon, CalendarIcon, CircleAlert } from "lucide-react";
import { type ReactElement, useState } from "react";
import { navigate } from "../../nav/location.ts";
import { CATEGORY, pageLang } from "../adult.ts";
import { childSlugs, DATE_PRESETS, inPreset, NO_CHILD } from "../lists/filter.ts";
import { ListView } from "../lists/ListView.tsx";
import { lessonPath } from "../route.ts";
import { learnerTone } from "../tone.ts";
import type { LessonRows } from "./useLessons.ts";

/** The child a conversation is for. None names one yet, so every lesson is the family's. */
const learnerOf = (_conversation: Conversation): LearnerId | null => null;

interface Row {
  id: ConversationId;
  title: string;
  learner: Learner | null;
  at: string;
}

const col = dataTableColumns<Row>();

export function LessonsTable({
  language,
  learners,
  lessons,
  onArchive,
  onRetry,
  now = () => new Date(),
}: {
  language: Language;
  learners: readonly Learner[];
  /** The family's conversations, newest first (useLessons). */
  lessons: LessonRows;
  /** Archives one; rejects when the route fails. */
  onArchive: (id: ConversationId) => Promise<void>;
  /** Reads the lessons again after a failed read. */
  onRetry: () => void;
  /** The clock the Data facet reads. */
  now?: () => Date;
}): ReactElement {
  const t = (key: CopyKey, vars: Record<string, string | number> = {}): string =>
    copy(language, key, vars, CATEGORY);
  /** The rows Archiwizuj asks about, and whether the last archive failed. */
  const [asking, setAsking] = useState<readonly ConversationId[]>([]);
  const [failed, setFailed] = useState(false);

  const slugs = childSlugs(learners);
  const many = learners.length > 1;
  const rows: readonly Row[] | "failed" | null =
    lessons === null || lessons === "failed"
      ? lessons
      : lessons.map((conversation) => {
          const id = learnerOf(conversation);
          return {
            id: conversation.id,
            title: conversation.title ?? t("parent_lesson_untitled"),
            learner: learners.find((l) => l.id === id) ?? null,
            at: conversation.created_at,
          };
        });

  const day = new Intl.DateTimeFormat(language, { day: "2-digit", month: "short" });
  const open = (row: Row): void => navigate(lessonPath({ conversation: row.id, lang: pageLang() }));
  const archive = (ids: readonly ConversationId[]): void => {
    setFailed(false);
    Promise.allSettled(ids.map(onArchive)).then((done) =>
      setFailed(done.some((d) => d.status === "rejected")),
    );
  };

  const columns = col.columns([
    col.accessor("title", {
      id: "lekcja",
      header: t("parent_lesson"),
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    }),
    col.accessor("learner", {
      id: "dla",
      header: t("parent_list_for"),
      enableSorting: false,
      cell: ({ row }) => {
        const learner = row.original.learner;
        return learner === null ? (
          <span className="flex items-center gap-2 text-muted-foreground" data-no-child>
            <Disc kind="none" size={22} />
            {t("parent_no_child")}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Disc name={learner.first_name} tone={learnerTone(learners, learner.id)} size={22} />
            {learner.first_name}
          </span>
        );
      },
    }),
    col.display({
      id: "wynik",
      header: t("parent_col_result"),
      cell: () => <span className="text-muted-foreground">—</span>,
    }),
    col.accessor("at", {
      id: "ostatnio",
      header: t("parent_list_last"),
      cell: ({ row }) => (
        <span className="tabular-nums">{day.format(new Date(row.original.at))}</span>
      ),
    }),
  ]);

  return (
    <>
      {failed && (
        <Notice role="alert" icon={<CircleAlert aria-hidden="true" />} data-archive-failed>
          {t("chat_list_archive_failed")}
        </Notice>
      )}
      <ListView<Row>
        language={language}
        label={t("parent_nav_lessons")}
        rows={rows}
        getRowId={(row) => row.id}
        columns={columns}
        viewColumns={[
          { id: "dla", label: t("parent_list_for") },
          { id: "wynik", label: t("parent_col_result") },
        ]}
        hiddenColumns={many ? [] : ["dla"]}
        facets={[
          {
            id: "dziecko",
            label: t("parent_col_child"),
            hidden: !many,
            byCount: true,
            options: [
              ...learners.map((learner) => ({
                value: slugs.get(learner.id) ?? learner.id,
                label: learner.first_name,
                leading: (
                  <Disc
                    name={learner.first_name}
                    tone={learnerTone(learners, learner.id)}
                    size={20}
                  />
                ),
              })),
              {
                value: NO_CHILD,
                label: t("parent_no_child"),
                leading: <Disc kind="none" size={20} />,
              },
            ],
            has: (row, value) =>
              value === NO_CHILD
                ? row.learner === null
                : row.learner !== null && slugs.get(row.learner.id) === value,
          },
          {
            id: "data",
            label: t("parent_list_date"),
            icon: <CalendarIcon aria-hidden="true" />,
            single: true,
            options: [
              { value: DATE_PRESETS[0], label: t("parent_list_today") },
              { value: DATE_PRESETS[1], label: t("parent_list_week") },
              { value: DATE_PRESETS[2], label: t("parent_list_month") },
            ],
            has: (row, value) => inPreset(row.at, value, now()),
          },
        ]}
        sorts={{
          lekcja: (a, b) => a.title.localeCompare(b.title, language),
          ostatnio: (a, b) => a.at.localeCompare(b.at),
        }}
        defaultSort={{ id: "ostatnio", desc: true }}
        sortOptions={[
          { value: "-ostatnio", label: t("parent_list_sort_newest") },
          { value: "ostatnio", label: t("parent_list_sort_oldest") },
          { value: "lekcja", label: t("parent_list_sort_title") },
        ]}
        onOpen={open}
        rowTitle={(row) => row.title}
        rowMenu={(row) => [
          { label: t("parent_list_open"), onSelect: () => open(row) },
          {
            label: t("chat_list_archive"),
            icon: <ArchiveIcon aria-hidden="true" />,
            onSelect: () => setAsking([row.id]),
          },
        ]}
        selectionActions={(ids, clear) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Every id is a row's, and a row's id is its conversation's.
              setAsking(ids as ConversationId[]);
              clear();
            }}
            data-archive-selected
          >
            <ArchiveIcon aria-hidden="true" />
            {t("chat_list_archive")}
          </Button>
        )}
        phoneRow={(row) => (
          <>
            <span className="text-jw-page-body font-medium">{row.title}</span>
            <span className="text-jw-page-small text-muted-foreground">
              {[
                many ? (row.learner?.first_name ?? t("parent_no_child")) : null,
                day.format(new Date(row.at)),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </>
        )}
        first={{ title: t("parent_list_first_title"), line: t("parent_list_first_line") }}
        failedTitle={t("parent_list_failed_lessons")}
        onRetry={onRetry}
        storeKey="lessons"
      />
      <AlertDialog open={asking.length > 0} onOpenChange={(on) => !on && setAsking([])}>
        <AlertDialogContent
          title={t("parent_list_archive_title", { n: asking.length })}
          description={t("chat_list_archive_confirm")}
        >
          <AlertDialogFooter>
            <AlertDialogCancel>{t("parent_cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => archive(asking)} data-archive-yes>
              {t("chat_list_archive_yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
