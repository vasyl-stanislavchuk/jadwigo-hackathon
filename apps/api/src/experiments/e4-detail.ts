// Experiment E4's ledger detail (dl-5ssh.90.53.6): the ledger before E4, the calls per step and the
// tasks split by size, derived from the Muse call log that `tools.experiments.e4 ledger` reads in
// jadwigo-bank. That tool emits none of the 3, so this records how e4.json's figures are made.
// Re-run, with the bank's main checkout (its runs/muse holds the log):
//   bun apps/api/src/experiments/e4-detail.ts ~/projects/jadwigo-bank/runs/muse
// It rewrites detail.ledger_before_e4, detail.by_step and detail.by_task in
// apps/docs/src/data/experiments/e4.json. No model call, no database.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** One line of runs/muse/<day>.jsonl, as much of it as the detail reads. */
export interface MuseRow {
  tag?: string | null;
  model?: string;
  seconds?: number;
  at?: string;
  usage?: {
    input_tokens?: number;
    cached_tokens?: number;
    output_tokens?: number;
    reasoning_tokens?: number;
    usd?: number;
  } | null;
}

/** E4's live run wrote its calls on this day; the ledger before E4 is every call before it. */
export const E4_DAY = "2026-11-03";
/** A task with at least this many calls is listed on its own; the rest are summed. */
const BIG_TASK = 10;
const SMALL_NOTE =
  "per-set and per-batch tags; the full table is experiments/e4/ledger.json in jadwigo-bank";

/** Rounded as Python's round() rounds, from the exact value: the ledger tool's own figures. */
const round = (x: number, places: number): number => Number(x.toFixed(places));
const sum = (rows: readonly MuseRow[], key: keyof NonNullable<MuseRow["usage"]>): number =>
  rows.reduce((total, r) => total + (r.usage?.[key] ?? 0), 0);
const tagOf = (row: MuseRow): string => row.tag || "(untagged)";

/**
 * A call's step: the tag's lane and its last part with the counter cut off (`enrich:<set>:draft2`
 * is `enrich:draft`, `filters:map:b07` is `filters:b`); `(none)` for a one-part tag or a bare
 * counter (`alt:12`, `items:<set>:0`).
 */
export function stepOf(tag: string): string {
  const parts = tag.split(":");
  const step = parts.length >= 2 ? (parts.at(-1) ?? "").replace(/\d+$/, "") : "";
  return `${parts[0]}:${step || "(none)"}`;
}

/** A call's task: the tag's first 2 parts (`eval:golden`, `enrich:<set>`). */
export function taskOf(tag: string): string {
  return tag.split(":").slice(0, 2).join(":");
}

function groupBy(rows: readonly MuseRow[], key: (row: MuseRow) => string): Map<string, MuseRow[]> {
  const groups = new Map<string, MuseRow[]>();
  for (const row of rows) {
    const k = key(row);
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  return groups;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function taskTotals(rows: readonly MuseRow[]) {
  const seconds = rows.map((r) => r.seconds ?? 0);
  return {
    calls: rows.length,
    input_tokens: sum(rows, "input_tokens"),
    cached_tokens: sum(rows, "cached_tokens"),
    output_tokens: sum(rows, "output_tokens"),
    reasoning_tokens: sum(rows, "reasoning_tokens"),
    usd: round(sum(rows, "usd"), 4),
    seconds_total: round(
      seconds.reduce((a, b) => a + b, 0),
      1,
    ),
    seconds_median: round(median(seconds), 1),
  };
}

/** The 3 detail blocks e4.json shows, from every logged call. */
export function e4Detail(rows: readonly MuseRow[]) {
  const before = rows.filter((r) => (r.at ?? "") < E4_DAY);
  const ledger_before_e4 = {
    rows: before.length,
    contributor_calls: before.filter((r) => (r.model ?? "").includes("contributor")).length,
    input_tokens: sum(before, "input_tokens"),
    output_tokens: sum(before, "output_tokens"),
    usd: round(sum(before, "usd"), 4),
  };

  // Most calls first; a tie keeps the order the log first met the step in.
  const by_step = Object.fromEntries(
    [...groupBy(rows, (r) => stepOf(tagOf(r)))]
      .map(([step, calls], first) => ({ step, calls, first }))
      .sort((a, b) => b.calls.length - a.calls.length || a.first - b.first)
      .map(({ step, calls }) => [
        step,
        {
          calls: calls.length,
          usd: round(sum(calls, "usd"), 4),
          input_tokens: sum(calls, "input_tokens"),
        },
      ]),
  );

  const tasks = groupBy(rows, (r) => taskOf(tagOf(r)));
  const big = [...tasks].filter(([, calls]) => calls.length >= BIG_TASK);
  const small = [...tasks].filter(([, calls]) => calls.length < BIG_TASK);
  const by_task = {
    tasks_with_10_plus_calls: Object.fromEntries(big.map(([t, calls]) => [t, taskTotals(calls)])),
    smaller_tasks: {
      tasks: small.length,
      calls: small.reduce((n, [, calls]) => n + calls.length, 0),
      // Each task's cost is rounded as the full table rounds it, then summed.
      usd: round(
        small.reduce((total, [, calls]) => total + round(sum(calls, "usd"), 4), 0),
        4,
      ),
      note: SMALL_NOTE,
    },
  };
  return { ledger_before_e4, by_step, by_task };
}

/** Every call in `logDir`'s day files, oldest day first. */
export function readMuseLog(logDir: string): MuseRow[] {
  return readdirSync(logDir)
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .flatMap((f) =>
      readFileSync(join(logDir, f), "utf8")
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line) => JSON.parse(line) as MuseRow),
    );
}

if (import.meta.main) {
  const logDir = process.argv[2];
  if (logDir === undefined) throw new Error("usage: bun e4-detail.ts <jadwigo-bank>/runs/muse");
  const here = dirname(fileURLToPath(import.meta.url));
  const out = join(here, "../../../docs/src/data/experiments/e4.json");
  const e4 = JSON.parse(readFileSync(out, "utf8")) as { detail: Record<string, unknown> };
  Object.assign(e4.detail, e4Detail(readMuseLog(logDir)));
  writeFileSync(out, `${JSON.stringify(e4, null, 2)}\n`);
}
