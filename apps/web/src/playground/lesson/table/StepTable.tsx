/**
 * The lesson at a glance, above the drawn steps (dl-a38n.12): one row per question step with its
 * number, step id, skills, family, key, rungs written and findings, tinted by its worst finding.
 * The key column follows the page's key switch. The step id is a link to the drawn step (`#<step_id>`), so a row is where a reader starts. A plain
 * table in the playground's neutral tool styles.
 */

import { cn } from "@jadwigo/ui";
import type { ReactElement } from "react";
import type { StepRow } from "./model.ts";

const TONE = {
  error: "bg-jw-miss text-jw-miss-ink",
  warn: "bg-jw-help text-jw-help-ink",
} as const;

const COLUMNS = ["n", "Step", "Skills", "Family", "Key", "Rungs", "Findings"] as const;

export function StepTable({
  rows,
  showKey,
}: {
  rows: readonly StepRow[];
  /** The page's key switch: off, the key column says so rather than show the answers. */
  showKey: boolean;
}): ReactElement {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table aria-label="Steps" className="w-full text-left text-sm">
        <thead className="bg-muted text-muted-foreground text-xs">
          <tr>
            {COLUMNS.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.step_id}
              data-row={row.step_id}
              data-tone={row.tone ?? undefined}
              className={cn("border-t align-top", row.tone === null ? "" : TONE[row.tone])}
            >
              <td className="px-3 py-2 tabular-nums">{row.n}</td>
              <th scope="row" className="px-3 py-2 font-medium">
                <a href={`#${row.step_id}`} className="underline-offset-4 hover:underline">
                  {row.step_id}
                </a>
              </th>
              <td className="px-3 py-2 text-xs">{row.skills.join(", ")}</td>
              <td className="px-3 py-2">{row.family ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-xs" data-key>
                {row.skipped !== null ? `not drawn: ${row.skipped}` : showKey ? row.key : "hidden"}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {row.rungs.written} of {row.rungs.of}
              </td>
              <td className="px-3 py-2 tabular-nums">{row.findings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
