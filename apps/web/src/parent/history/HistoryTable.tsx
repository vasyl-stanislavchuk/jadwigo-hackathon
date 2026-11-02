/**
 * /parent/history, every attempt the family's children played, newest first, as one table
 * (dl-z5ja.106.1; handoff §3 "Lists = table + filter" and "Outcome tiles", §6 Historia): the
 * segmented filter and the search above it, a row per attempt with its lesson, its child, its day and
 * a tile per question, the legend under it. A row's lesson opens the attempt question by question
 * (AttemptReview). An attempt reaches the pod through its child, so every row has one and "Bez
 * dziecka" shows none for now. Grouping and more filters are open with the owner.
 */

import type { ParentClient } from "@jadwigo/api-client";
import type { Learner, LearnerAttempt } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import {
  Link,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@jadwigo/ui";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { Failed } from "../Failed.tsx";
import { shows, type Who } from "../lists/filter.ts";
import { ListControls } from "../lists/ListControls.tsx";
import { Legend } from "../overview/Legend.tsx";
import { LessonTiles } from "../overview/LessonTiles.tsx";
import { attemptPath } from "../route.ts";

interface Played {
  learner: Learner;
  played: LearnerAttempt;
}

type Loaded = readonly Played[] | "failed" | null;

/** Every child's attempts, newest first. */
async function everyAttempt(
  api: Pick<ParentClient, "getLearnerAttempts">,
  learners: readonly Learner[],
): Promise<Played[]> {
  const replies = await Promise.all(
    learners.map(async (learner) =>
      (await api.getLearnerAttempts(learner.id)).attempts.map((played) => ({ learner, played })),
    ),
  );
  return replies
    .flat()
    .sort((a, b) => b.played.attempt.started_at.localeCompare(a.played.attempt.started_at));
}

export function HistoryTable({
  api,
  language,
  learners,
}: {
  api: Pick<ParentClient, "getLearnerAttempts">;
  language: Language;
  learners: readonly Learner[];
}): ReactElement {
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  const [attempts, setAttempts] = useState<Loaded>(null);
  const [who, setWho] = useState<Who>("all");
  const [search, setSearch] = useState("");
  // The page hands a fresh array on every render: the children's ids say when to read again.
  const children = useRef(learners);
  children.current = learners;
  const ids = learners.map((learner) => learner.id).join(" ");
  useEffect(() => {
    let live = true;
    everyAttempt(api, children.current).then(
      (all) => live && setAttempts(all),
      () => live && setAttempts("failed"),
    );
    return () => {
      live = false;
    };
  }, [api, ids]);

  if (attempts === null) return <Spinner label={t("loading")} />;
  if (attempts === "failed") return <Failed language={language} />;

  const day = new Intl.DateTimeFormat(language, { dateStyle: "medium" });
  const rows = attempts.map(({ learner, played }) => ({
    learner: learner.id,
    child: learner,
    played,
    words: [played.title, learner.first_name],
  }));
  const shown = rows.filter((row) => shows(row, who, search));

  return (
    <section className="flex w-full flex-col gap-4" data-history-table>
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
            <TableHead>{t("parent_col_result")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map(({ child, played }) => (
            <TableRow key={played.attempt.id} data-attempt-row={played.attempt.id}>
              <TableCell className="max-w-0 w-full truncate">
                <Link asChild>
                  <NavLink
                    href={attemptPath({
                      attempt: played.attempt.id,
                      learner: child.id,
                      lang: pageLang(),
                    })}
                    data-attempt-link
                  >
                    {played.title}
                  </NavLink>
                </Link>
              </TableCell>
              <TableCell>{child.first_name}</TableCell>
              <TableCell>{day.format(new Date(played.attempt.started_at))}</TableCell>
              <TableCell>
                <LessonTiles results={played.results} language={language} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && (
        <p className="text-jw-ink-soft" data-history-empty>
          {t("parent_history_empty")}
        </p>
      )}
      {rows.length > 0 && shown.length === 0 && (
        <p className="text-jw-ink-soft" data-no-match>
          {t("parent_list_no_match")}
        </p>
      )}
      {rows.length > 0 && <Legend language={language} />}
    </section>
  );
}
