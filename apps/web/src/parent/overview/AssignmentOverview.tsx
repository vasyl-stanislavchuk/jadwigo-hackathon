/**
 * The lesson overview at /parent/assignments/<assignment> (dl-uukj.30.4, wave 2 plan of
 * dl-uukj.30): every attempt the caller's pod reads of one assignment, against its questions.
 *
 *   header   the lesson's title, how many attempts, how many questions across them (the union)
 *   grid     a row per attempt, a column per planned question, a cell per outcome with its icon
 *            (Heatmap.tsx); for a family it is one row
 *   legend   the 6 outcomes and the twin mark
 *   sheet    a column's number opens the question's sheet (QuestionSheet.tsx)
 *
 * Counts, never a percentage (decisions 2026-10-18 and 2026-10-03). The rows are attempt_result's,
 * so a try's value and the solution stay on each attempt's own page.
 */

import type { ParentClient } from "@jadwigo/api-client";
import type { AssignmentAttempts, AssignmentId } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { Spinner } from "@jadwigo/ui";
import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { parentPath } from "../route.ts";
import { buildGrid, type Grid } from "./grid.ts";
import { Heatmap } from "./Heatmap.tsx";
import { Legend } from "./Legend.tsx";
import { CATEGORY, pageLang } from "./outcome.tsx";
import { QuestionSheet } from "./QuestionSheet.tsx";

type View =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "ready"; overview: AssignmentAttempts };

export function AssignmentOverview({
  api,
  assignment,
  language,
}: {
  api: ParentClient;
  /** Null for a path whose id does not parse. */
  assignment: AssignmentId | null;
  language: Language;
}): ReactElement {
  const [view, setView] = useState<View>({ kind: "loading" });
  useEffect(() => {
    if (assignment === null) {
      setView({ kind: "failed" });
      return;
    }
    let live = true;
    setView({ kind: "loading" });
    api.getAssignmentAttempts(assignment).then(
      (overview) => live && setView({ kind: "ready", overview }),
      () => live && setView({ kind: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [api, assignment]);

  const back = (
    <NavLink href={parentPath({ lang: pageLang() })} className="underline" data-parent-home>
      {copy(language, "parent_review_back", {}, CATEGORY)}
    </NavLink>
  );

  if (view.kind === "loading")
    return (
      <Page>
        <Spinner label={copy(language, "loading")} />
      </Page>
    );
  if (view.kind === "failed")
    return (
      <Page>
        <p data-failed>{copy(language, "load_failed")}</p>
        {back}
      </Page>
    );
  return (
    <Page>
      {back}
      <Ready overview={view.overview} language={language} />
    </Page>
  );
}

function Ready({
  overview,
  language,
}: {
  overview: AssignmentAttempts;
  language: Language;
}): ReactElement {
  const grid = useMemo(() => buildGrid(overview.attempts), [overview]);
  const [open, setOpen] = useState<number | null>(null);
  const column = open === null ? null : (grid.columns[open] ?? null);
  return (
    <>
      <Header title={overview.title} grid={grid} language={language} />
      <Heatmap grid={grid} language={language} onColumn={setOpen} />
      <Legend language={language} />
      <QuestionSheet
        column={column}
        index={open ?? 0}
        rows={grid.rows}
        language={language}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

function Page({ children }: { children: ReactNode }): ReactElement {
  return (
    <main
      data-parent
      data-assignment-overview
      className="mx-auto flex w-full max-w-3xl min-w-0 flex-col items-start gap-6 p-4 text-lg sm:p-6"
    >
      {children}
    </main>
  );
}

function Header({
  title,
  grid,
  language,
}: {
  title: string;
  grid: Grid;
  language: Language;
}): ReactElement {
  return (
    <header className="flex flex-col gap-2" data-overview-header>
      <p className="text-sm">{copy(language, "parent_overview_title", {}, CATEGORY)}</p>
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p data-attempts={grid.rows.length}>
        {copy(language, "parent_overview_attempts", { n: grid.rows.length }, CATEGORY)}
      </p>
      <p data-asked={grid.columns.length}>
        {copy(language, "parent_review_asked", { n: grid.columns.length }, CATEGORY)}
      </p>
    </header>
  );
}
