/**
 * The check's findings as a list: each with its level, the rule it cites, what is wrong and what to
 * do, and the path into the lesson file. Pinned under its step, or above the step table for the
 * lesson as a whole (step_id null).
 */

import type { Finding } from "@jadwigo/lesson-import";
import { cn } from "@jadwigo/ui";
import type { ReactElement } from "react";

const TONE = {
  error: "border-jw-miss-edge bg-jw-miss text-jw-miss-ink",
  warn: "border-jw-help-edge bg-jw-help text-jw-help-ink",
} as const;

export function FindingList({
  findings,
  label,
}: {
  findings: readonly Finding[];
  label: string;
}): ReactElement | null {
  if (findings.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-col gap-2">
      {findings.map((f, i) => (
        <li
          // A check may list the same rule twice at one path; its place in the list tells them apart.
          key={`${i}-${f.rule}-${f.path}`}
          data-level={f.level}
          data-step-finding={f.step_id ?? ""}
          className={cn("flex flex-col gap-1 rounded-lg border p-3 text-sm", TONE[f.level])}
        >
          <p>
            <span className="font-semibold">{f.level}</span> · <code>{f.rule}</code> · {f.text}
          </p>
          {f.fix !== "" && <p>Fix: {f.fix}</p>}
          {f.path !== "" && <p className="text-xs opacity-80">{f.path}</p>}
        </li>
      ))}
    </ul>
  );
}
