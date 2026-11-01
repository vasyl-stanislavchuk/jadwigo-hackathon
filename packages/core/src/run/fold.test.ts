import { RunEvent, type RunStatus } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type BudgetLevel, budgetGuard, deadlineDue, foldRun, mergeLive } from "./index.ts";

/**
 * Every event shape the golden logs hold, plus an approval pair they don't, as templates. A log
 * here is a draw of templates renumbered 1..n, each with its own `event_id`, so it parses as a log
 * the store could have written: gapless `seq`, one `event_id` per event.
 */
const APPROVALS = [
  {
    type: "approval_request",
    payload: { call_id: "call_1", verb: "lesson_edit", summary: "Drop question 3." },
  },
  { type: "approval_resolved", payload: { call_id: "call_1", decision: "approved" } },
  { type: "approval_resolved", payload: { call_id: "call_1", decision: "rejected" } },
];
const TEMPLATES: readonly Record<string, unknown>[] = [
  ...RUN_LOGS.flatMap((log) => log.events as Record<string, unknown>[]),
  ...APPROVALS.map((a) => ({ ...(RUN_LOGS[0]?.events[0] as object), ...a })),
];

function eventId(seq: number): string {
  return `00000000-0000-4000-8fff-${seq.toString(16).padStart(12, "0")}`;
}

function numbered(picks: readonly number[]): RunEvent[] {
  return picks.map((pick, i) =>
    RunEvent.parse({ ...TEMPLATES[pick % TEMPLATES.length], seq: i + 1, event_id: eventId(i + 1) }),
  );
}

/** A clean log: 0 to 30 events in `seq` order. */
const log = fc.array(fc.nat(), { maxLength: 30 }).map(numbered);

/** The log as a reload might deliver it: some events twice, all of them shuffled. */
const delivered = log.chain((clean) =>
  fc
    .subarray(clean)
    .chain((extra) => {
      const all = [...clean, ...extra];
      return fc.shuffledSubarray(all, { minLength: all.length });
    })
    .map((messy) => ({ clean, messy })),
);

/** 2 overlapping slices of one log: the live buffer and the fetch, each out of order. */
const halves = log.chain((clean) =>
  fc
    .tuple(fc.shuffledSubarray(clean), fc.shuffledSubarray(clean), fc.nat({ max: 32 }))
    .map(([buffer, fetched, cursor]) => ({ clean, buffer, fetched, cursor })),
);

const RANK: Record<BudgetLevel, number> = { none: 0, steer: 1, stop: 2 };

describe("foldRun, properties", () => {
  it("folds a log with duplicates, out of order, like the clean log", () => {
    fc.assert(
      fc.property(delivered, ({ clean, messy }) => {
        expect(foldRun(messy)).toEqual(foldRun(clean));
      }),
    );
  });

  it("draws chat items in seq order and its cursor is the highest seq", () => {
    fc.assert(
      fc.property(log, (events) => {
        const view = foldRun(events);
        const seqs = view.chat.map((c) => c.seq);
        expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
        expect(view.cursor).toBe(events.at(-1)?.seq ?? 0);
      }),
    );
  });

  it("never reopens a turn, and a status after turn_complete moves nothing", () => {
    fc.assert(
      fc.property(log, (events) => {
        const end = events.findIndex((e) => e.type === "turn_complete");
        if (end < 0) return;
        const view = foldRun(events);
        expect(view.turn_open).toBe(false);
        expect(view.status).toBe(foldRun(events.slice(0, end + 1)).status);
      }),
    );
  });

  it("pins an approval to its first resolution", () => {
    fc.assert(
      fc.property(log, (events) => {
        const asked = events.find((e) => e.type === "approval_request");
        const item = foldRun(events).chat.find((c) => c.kind === "approval");
        if (!asked) {
          expect(item).toBeUndefined();
          return;
        }
        const first = events.find((e) => e.type === "approval_resolved" && e.seq > asked.seq);
        const decision = first?.type === "approval_resolved" ? first.payload.decision : null;
        expect(item?.decision).toBe(decision);
      }),
    );
  });
});

describe("mergeLive, properties", () => {
  it("fold(a ++ b) equals fold(mergeLive(a, b, 0))", () => {
    fc.assert(
      fc.property(halves, ({ buffer, fetched }) => {
        expect(foldRun(mergeLive(buffer, fetched, 0))).toEqual(foldRun([...buffer, ...fetched]));
      }),
    );
  });

  it("answers each seq after the cursor once, in seq order, with no gap the 2 inputs can fill", () => {
    fc.assert(
      fc.property(halves, ({ buffer, fetched, cursor }) => {
        const merged = mergeLive(buffer, fetched, cursor).map((e) => e.seq);
        const want = [...new Set([...buffer, ...fetched].map((e) => e.seq))]
          .filter((s) => s > cursor)
          .sort((a, b) => a - b);
        expect(merged).toEqual(want);
      }),
    );
  });
});

describe("budgetGuard, properties", () => {
  it("never steps down as the spend grows", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10, noNaN: true }),
        fc.double({ min: 0, max: 10, noNaN: true }),
        fc.double({ min: 0.01, max: 5, noNaN: true }),
        (a, b, cap) => {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          expect(RANK[budgetGuard(lo, cap)]).toBeLessThanOrEqual(RANK[budgetGuard(hi, cap)]);
        },
      ),
    );
  });
});

describe("deadlineDue, properties", () => {
  const MAX = Date.parse("2026-09-01T09:00:00.000Z");
  it("runs the 2 clocks apart: a passed max is max whatever idle says", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<RunStatus>("queued", "in_progress", "awaiting_input"),
        fc.option(fc.integer({ min: -3_600_000, max: 3_600_000 })),
        fc.integer({ min: 0, max: 3_600_000 }),
        (status, idleOffset, late) => {
          const run = {
            status,
            idle_deadline_at: idleOffset === null ? null : new Date(MAX + idleOffset).toISOString(),
            max_deadline_at: new Date(MAX).toISOString(),
          };
          expect(deadlineDue(run, new Date(MAX + late))).toBe("max");
        },
      ),
    );
  });
});
