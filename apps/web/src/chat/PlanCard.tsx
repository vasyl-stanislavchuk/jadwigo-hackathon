/**
 * The plan as a checklist (dl-uukj.47.31; research §15.3, "a plan checklist only when the turn has
 * 3 or more steps"; wave plan lead decision 4): one row per entry of the turn's last `plan` event
 * (`RunView.plan`) with its status in words, under "Plan · {n} z {m}". Pinned above the tool lines
 * while the turn runs (ChatPane pins its row, a direct child of the scrolling list), folded to its
 * header once the turn ends. No reasoning row: the log carries
 * none. Icons are decorative; the status word is the text.
 */

import type { PlanEntry, PlanStatus } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { CheckIcon, CircleIcon, LoaderCircleIcon, type LucideIcon, XIcon } from "lucide-react";
import type { ReactElement } from "react";

/** Fewer entries than this and the tool lines say enough on their own. */
export const PLAN_MIN = 3;

const STATUS: Readonly<Record<PlanStatus, { key: CopyKey; Icon: LucideIcon; tone: string }>> = {
  pending: { key: "chat_plan_pending", Icon: CircleIcon, tone: "text-jw-ink-soft" },
  in_progress: {
    key: "chat_plan_in_progress",
    Icon: LoaderCircleIcon,
    tone: "text-jw-ink motion-safe:animate-spin",
  },
  done: { key: "chat_plan_done", Icon: CheckIcon, tone: "text-jw-right-ink" },
  failed: { key: "chat_plan_failed", Icon: XIcon, tone: "text-jw-miss-ink" },
};

export function PlanCard({
  plan,
  open,
  language,
}: {
  plan: readonly PlanEntry[];
  /** Whether the turn still runs: pinned in view; else folded to its header. */
  open: boolean;
  language: Language;
}): ReactElement | null {
  if (plan.length < PLAN_MIN) return null;
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const done = plan.filter((e) => e.status === "done").length;
  const header = `${say("chat_plan")} · ${say("chat_plan_progress", { n: done, m: plan.length })}`;
  const rows = (
    <ol className="mt-1 flex flex-col gap-1">
      {plan.map((entry, i) => {
        const { key, Icon, tone } = STATUS[entry.status];
        return (
          // A plan may repeat a line; its place in the plan does not.
          <li
            key={`${i}-${entry.text}`}
            className="flex items-baseline gap-2"
            data-plan-entry
            data-status={entry.status}
          >
            <Icon aria-hidden className={cn("size-3.5 shrink-0 self-center", tone)} />
            <span className={cn("min-w-0", entry.status === "done" && "text-jw-ink-soft")}>
              {entry.text}
            </span>
            <span className="shrink-0 text-jw-page-small text-jw-ink-soft">{say(key)}</span>
          </li>
        );
      })}
    </ol>
  );
  const frame = "rounded-jw-small border-jw border-jw-line bg-jw-card px-3 py-2 text-sm";
  if (open)
    return (
      <section aria-label={say("chat_plan")} className={frame} data-plan="open">
        <p className="font-bold text-jw-ink" data-plan-header>
          {header}
        </p>
        {rows}
      </section>
    );
  return (
    <details className={frame} data-plan="folded">
      <summary className="cursor-pointer font-bold text-jw-ink" data-plan-header>
        {header}
      </summary>
      {rows}
    </details>
  );
}
