/**
 * /parent/history, every attempt the family's children played, as a data table (handoff
 * dl-uukj.47.67 §7, D8, D11, S12-S18): the filter bar and the table, no header row. A row per
 * attempt with its lesson, its child, a result bar ("6 z 8") and when; a click anywhere on it opens
 * the attempt question by question (AttemptReview). Every attempt is done and has a child, so there
 * is no Status, and no "Bez dziecka" in the Dziecko facet. No action works on several attempts yet,
 * so the rows have no checkbox.
 */

import type { ParentClient } from "@jadwigo/api-client";
import type { Learner, LearnerAttempt } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Disc, dataTableColumns, ResultBar } from "@jadwigo/ui";
import { CalendarIcon } from "lucide-react";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { navigate } from "../../nav/location.ts";
import { CATEGORY, pageLang } from "../adult.ts";
import { childSlugs, DATE_PRESETS, inPreset } from "../lists/filter.ts";
import { ListView } from "../lists/ListView.tsx";
import { attemptPath } from "../route.ts";
import { learnerTone } from "../tone.ts";

interface Row {
  learner: Learner;
  played: LearnerAttempt;
  /** Right at once, right with help, and the rest. */
  right: number;
  help: number;
  total: number;
}

type Loaded = readonly Row[] | "failed" | null;

/** Every child's attempts, newest first. */
async function everyAttempt(
  api: Pick<ParentClient, "getLearnerAttempts">,
  learners: readonly Learner[],
): Promise<Row[]> {
  const replies = await Promise.all(
    learners.map(async (learner) =>
      (await api.getLearnerAttempts(learner.id)).attempts.map((played) => ({
        learner,
        played,
        right: played.results.filter((r) => r.first_try_correct).length,
        help: played.results.filter((r) => r.correct && !r.first_try_correct).length,
        total: played.results.length,
      })),
    ),
  );
  return replies
    .flat()
    .sort((a, b) => b.played.attempt.started_at.localeCompare(a.played.attempt.started_at));
}

const col = dataTableColumns<Row>();

export function HistoryTable({
  api,
  language,
  learners,
  now = () => new Date(),
}: {
  api: Pick<ParentClient, "getLearnerAttempts">;
  language: Language;
  learners: readonly Learner[];
  /** The clock the Data facet reads. */
  now?: () => Date;
}): ReactElement {
  const t = (key: CopyKey, vars: Record<string, string | number> = {}): string =>
    copy(language, key, vars, CATEGORY);
  const [attempts, setAttempts] = useState<Loaded>(null);
  const [tries, setTries] = useState(0);
  // The page hands a fresh array on every render: the children's ids say when to read again.
  const children = useRef(learners);
  children.current = learners;
  const ids = learners.map((learner) => learner.id).join(" ");
  useEffect(() => {
    let live = true;
    setAttempts(null);
    everyAttempt(api, children.current).then(
      (all) => live && setAttempts(all),
      () => live && setAttempts("failed"),
    );
    return () => {
      live = false;
    };
  }, [api, ids, tries]);

  const slugs = childSlugs(learners);
  const many = learners.length > 1;
  const day = new Intl.DateTimeFormat(language, { day: "2-digit", month: "short" });
  const when = (row: Row): string => day.format(new Date(row.played.attempt.started_at));
  const open = (row: Row): void =>
    navigate(
      attemptPath({ attempt: row.played.attempt.id, learner: row.learner.id, lang: pageLang() }),
    );
  const score = (row: Row): string =>
    t("parent_list_score", { right: row.right + row.help, total: row.total });

  const columns = col.columns([
    col.accessor((row) => row.played.title, {
      id: "lekcja",
      header: t("parent_lesson"),
      cell: ({ row }) => (
        <span className="font-medium" data-attempt-row={row.original.played.attempt.id}>
          {row.original.played.title}
        </span>
      ),
    }),
    col.accessor("learner", {
      id: "dla",
      header: t("parent_list_for"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <Disc
            name={row.original.learner.first_name}
            tone={learnerTone(learners, row.original.learner.id)}
            size={22}
          />
          {row.original.learner.first_name}
        </span>
      ),
    }),
    col.accessor((row) => (row.total === 0 ? 0 : (row.right + row.help) / row.total), {
      id: "wynik",
      header: t("parent_col_result"),
      // Never sorted: ranking a child's attempts best-first is the ranking Jadwigo promises not to
      // keep (the #765 review, dl-uukj.47.67.31).
      enableSorting: false,
      cell: ({ row }) =>
        row.original.total === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <ResultBar
            right={row.original.right}
            help={row.original.help}
            miss={row.original.total - row.original.right - row.original.help}
            label={score(row.original)}
          />
        ),
    }),
    col.accessor((row) => row.played.attempt.started_at, {
      id: "kiedy",
      header: t("parent_list_when"),
      cell: ({ row }) => <span className="tabular-nums">{when(row.original)}</span>,
    }),
  ]);

  const result = (row: Row): number => (row.total === 0 ? -1 : (row.right + row.help) / row.total);
  return (
    <ListView<Row>
      language={language}
      label={t("parent_nav_history")}
      rows={attempts}
      getRowId={(row) => row.played.attempt.id}
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
          options: learners.map((learner) => ({
            value: slugs.get(learner.id) ?? learner.id,
            label: learner.first_name,
            leading: (
              <Disc name={learner.first_name} tone={learnerTone(learners, learner.id)} size={20} />
            ),
          })),
          has: (row, value) => slugs.get(row.learner.id) === value,
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
          has: (row, value) => inPreset(row.played.attempt.started_at, value, now()),
        },
      ]}
      sorts={{
        lekcja: (a, b) => a.played.title.localeCompare(b.played.title, language),
        kiedy: (a, b) => a.played.attempt.started_at.localeCompare(b.played.attempt.started_at),
      }}
      defaultSort={{ id: "kiedy", desc: true }}
      sortOptions={[
        { value: "-kiedy", label: t("parent_list_sort_when_newest") },
        { value: "kiedy", label: t("parent_list_sort_when_oldest") },
        { value: "lekcja", label: t("parent_list_sort_title") },
      ]}
      onOpen={open}
      rowTitle={(row) => row.played.title}
      rowMenu={(row) => [{ label: t("parent_list_open"), onSelect: () => open(row) }]}
      phoneRow={(row) => (
        <>
          <span className="text-jw-page-body font-medium">{row.played.title}</span>
          <span className="text-jw-page-small text-muted-foreground">
            {[many ? row.learner.first_name : null, row.total > 0 ? score(row) : null, when(row)]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </>
      )}
      first={{ title: t("parent_list_history_first_title"), line: t("parent_history_empty") }}
      failedTitle={t("parent_list_failed_history")}
      onRetry={() => setTries((n) => n + 1)}
      storeKey="history"
    />
  );
}
