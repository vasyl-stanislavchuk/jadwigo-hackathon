/**
 * The playground's start page: what it is in two lines, then every question type in one table,
 * grouped by family, with where it stands and how many written examples it plays. Read from
 * lesson-kit's questionTypes.ts and the API's examples (examples/load.ts), so a type another lane
 * adds shows up here. At phone width each row is a card.
 */

import { FAMILIES, familyInfo, type QuestionTypeInfo, questionTypesOf } from "@jadwigo/lesson-kit";
import type { ReactElement, ReactNode } from "react";
import { type Examples, examplesFor, useExamples } from "../examples/index.ts";
import { linkTo } from "../route.ts";
import { NavLink } from "../shell/NavLink.tsx";
import { STATUS_LABEL, statusLabel, statusMeans } from "../status.ts";
import { Badge } from "../tool/badge.tsx";

/** A cell with its column name shown above it when the row is a card. */
function Cell({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <td className="flex flex-wrap items-baseline gap-x-2 px-3 py-1 md:table-cell md:py-2">
      <span className="text-muted-foreground text-xs md:hidden">{label}</span>
      {children}
    </td>
  );
}

/** How many examples a type plays, or what stands in for the number while it is read. */
function countOf(examples: Examples, type: QuestionTypeInfo): number | null {
  return examples.kind === "ready" ? examplesFor(examples.examples, type.name).length : null;
}

function Row({
  type,
  examples,
}: {
  type: QuestionTypeInfo;
  examples: number | null;
}): ReactElement {
  return (
    <tr
      data-question-type-row={type.name}
      className="flex flex-col rounded-xl border bg-card py-2 md:table-row md:rounded-none md:border-0 md:border-t md:bg-transparent md:py-0"
    >
      <td className="px-3 py-1 md:table-cell md:py-2">
        <NavLink
          href={linkTo(`/playground/${type.family}/${type.name}`)}
          data-question-type-link={type.name}
          title={`${statusLabel(type)}: ${type.does}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {type.label}
        </NavLink>
        <div className="text-muted-foreground text-xs">{type.does}</div>
      </td>
      <Cell label="Status">
        <Badge
          variant={type.status === "refined" ? "secondary" : "outline"}
          data-status={type.status}
          title={statusMeans(type)}
        >
          {statusLabel(type)}
        </Badge>
      </Cell>
      <Cell label="Examples">
        <span className="text-muted-foreground tabular-nums" data-examples={examples ?? undefined}>
          {examples === null
            ? "…"
            : examples === 0
              ? "Nothing to try yet"
              : `${examples} to try, in Polish and English`}
        </span>
      </Cell>
    </tr>
  );
}

export function StartPage(): ReactElement {
  const types = FAMILIES.flatMap((f) => questionTypesOf(f));
  const refined = types.filter((t) => t.status === "refined").length;
  // The counts are the same in both languages, so the Polish read serves them.
  const examples = useExamples("pl");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Question-type playground</h1>
        <p className="text-muted-foreground max-w-3xl text-base leading-relaxed">
          Every question type a lesson can use, {types.length} of them in {FAMILIES.length}{" "}
          families, each played in the lesson frame on its written examples.{" "}
          <span data-start-refined>
            {refined} are {STATUS_LABEL.refined.toLowerCase()}
          </span>
          , and the rest are drafts. Nothing is judged and nothing is saved: every state you see is
          written in the example.
        </p>
        {examples.kind === "failed" ? (
          <p data-examples-failed>
            The written examples could not be read from the API. Reload to try again.
          </p>
        ) : null}
      </header>

      <section aria-labelledby="types" className="flex flex-col gap-6">
        <h2 id="types" className="text-lg font-semibold">
          Question types
        </h2>
        {FAMILIES.map((family) => {
          const own = questionTypesOf(family);
          if (own.length === 0) return null;
          const info = familyInfo(family);
          return (
            <section
              key={family}
              aria-labelledby={`family-${family}`}
              className="flex flex-col gap-2"
              data-family={family}
            >
              <h3 id={`family-${family}`} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold">{info.label}</span>
                <span className="text-muted-foreground text-sm">{info.does}</span>
              </h3>
              <table className="w-full text-left text-sm md:rounded-xl md:border md:bg-card">
                <thead className="text-muted-foreground hidden md:table-header-group">
                  <tr>
                    {["Question type", "Status", "Examples"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="flex flex-col gap-3 md:table-row-group">
                  {own.map((type) => (
                    <Row key={type.name} type={type} examples={countOf(examples, type)} />
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </section>
    </div>
  );
}
