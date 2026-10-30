/**
 * A step's data beside its drawing (dl-a38n.30), as md drops keeps the spec beside the page: the
 * step's JSON as the draft holds it (say, the question's data, the key behind the page's key
 * switch, the help rungs and the twin, based_on with its changes), each line a finding's path names
 * marked with its level, each line changed since the draft before marked as changed, and whom to
 * ask about the step: the bank item it was copied from, the agent's changes, or the agent alone.
 */

import type { Finding } from "@jadwigo/lesson-import/file";
import { cn } from "@jadwigo/ui";
import type { ReactElement } from "react";
import { changesSince, covers, jsonLines } from "./lines.ts";
import { originOf, originText } from "./origin.ts";

const LEVEL = {
  error: "bg-jw-miss text-jw-miss-ink",
  warn: "bg-jw-help text-jw-help-ink",
} as const;

type BasedOn = Parameters<typeof originOf>[0];

export function StepData({
  source,
  path,
  findings,
  previous,
  showKey,
}: {
  /** The step as the draft holds it, in its own language. */
  source: { based_on?: BasedOn };
  /** Where the step is in the file: the root of every line's path. */
  path: string;
  /** The check's and the render check's findings on the step. */
  findings: readonly Finding[];
  /** The same step in the draft before, or undefined when this page has seen no earlier one. */
  previous: unknown;
  showKey: boolean;
}): ReactElement {
  const lines = jsonLines(source, path, !showKey);
  const since = previous === undefined ? null : changesSince(previous, source, path);
  // A finding on the whole step marks no line: it is pinned under the step already.
  const pointed = findings.filter((f) => f.path !== path && covers(path, f.path));
  const levelAt = (at: string) =>
    pointed.find((f) => f.level === "error" && covers(f.path, at))?.level ??
    pointed.find((f) => covers(f.path, at))?.level;
  return (
    <section aria-label={`Data of ${path}`} className="flex flex-col gap-2 text-xs">
      <p data-origin={originOf(source.based_on).kind}>
        <span className="font-medium">Origin:</span> {originText(originOf(source.based_on))}
      </p>
      <p className="text-muted-foreground">
        {pointed.length} finding{pointed.length === 1 ? "" : "s"} marked
        {since === null
          ? " · no earlier draft seen on this page"
          : ` · ${since.changed.size} changed and ${since.removed.length} removed since the draft before`}
      </p>
      <pre className="overflow-x-auto rounded-lg border bg-muted p-2 font-mono leading-5">
        {lines.map((line, i) => {
          const level = levelAt(line.path);
          const changed = since?.changed.has(line.path) === true;
          return (
            <div
              // A closing bracket shares its container's path; its place tells the lines apart.
              key={`${i}-${line.path}`}
              data-path={line.path}
              data-level={level}
              data-changed={changed ? "" : undefined}
              className={cn(level === undefined ? "" : LEVEL[level], changed && "underline")}
              style={{ paddingLeft: `${line.depth * 2}ch` }}
            >
              {changed ? "~ " : ""}
              {line.text}
            </div>
          );
        })}
      </pre>
      {since !== null && since.removed.length > 0 && (
        <ul aria-label="Removed since the draft before" className="text-muted-foreground">
          {since.removed.map((p) => (
            <li key={p}>− {p}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
