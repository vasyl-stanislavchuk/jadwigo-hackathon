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
        const asked = events.find(
          (e): e is Extract<RunEvent, { type: "approval_request" }> =>
            e.type === "approval_request",
        );
        const item = foldRun(events).chat.find((c) => c.kind === "approval");
        if (!asked) {
          expect(item).toBeUndefined();
          return;
        }
        const call = asked.payload.call_id;
        const first = events.find(
          (e) => e.type === "approval_resolved" && e.payload.call_id === call && e.seq > asked.seq,
        );
        const decision = first?.type === "approval_resolved" ? first.payload.decision : null;
        expect(item?.decision).toBe(decision);
        // A rejection closes the call's line, unless the call started before it or ended at all.
        if (decision !== "rejected" || first === undefined) return;
        const ran = events.some(
          (e) =>
            (e.type === "tool_result" || (e.type === "tool_call" && e.seq < first.seq)) &&
            e.payload.call_id === call,
        );
        const line = foldRun(events).chat.find((c) => c.kind === "tool" && c.call_id === call);
        if (!ran) expect(line).toMatchObject({ state: "rejected" });
      }),
    );
  });
});

/** A log of `rows` (type and payload), numbered 1..n, parsed as the store would have written it. */
function logOf(rows: readonly { type: string; payload: Record<string, unknown> }[]): RunEvent[] {
  const base = RUN_LOGS[0]?.events[0] as object;
  return rows.map((row, i) =>
    RunEvent.parse({ ...base, ...row, seq: i + 1, event_id: eventId(i + 1) }),
  );
}

const ASK = {
  type: "approval_request",
  payload: { call_id: "call_1", verb: "lesson_edit", summary: "Drop question 3." },
};

describe("foldRun, the UX seams (dl-z5ja.50)", () => {
  it("closes a pending tool line as rejected and keeps the parent's feedback (dl-z5ja.39)", () => {
    const view = foldRun(
      logOf([
        ASK,
        {
          type: "approval_resolved",
          payload: { call_id: "call_1", decision: "rejected", feedback: "Keep it." },
        },
        {
          type: "approval_resolved",
          payload: { call_id: "call_1", decision: "approved", feedback: "Changed my mind." },
        },
      ]),
    );
    expect(view.chat).toMatchObject([
      { kind: "tool", call_id: "call_1", state: "rejected", error: null },
      { kind: "approval", call_id: "call_1", decision: "rejected", feedback: "Keep it." },
    ]);
  });

  it("leaves an approved line pending until its call runs, and keeps the answers", () => {
    const approved = {
      type: "approval_resolved",
      payload: { call_id: "call_1", decision: "approved", answers: ["5"] },
    };
    const view = foldRun(logOf([ASK, approved]));
    expect(view.chat).toMatchObject([
      { kind: "tool", state: "pending" },
      { kind: "approval", decision: "approved", answers: ["5"] },
    ]);
    expect(view.chat[1]).not.toHaveProperty("feedback");
  });

  it("never moves a line that already ran: a late rejection keeps it done", () => {
    const view = foldRun(
      logOf([
        ASK,
        { type: "tool_call", payload: { call_id: "call_1", verb: "lesson_edit", input: {} } },
        {
          type: "tool_result",
          payload: { call_id: "call_1", verb: "lesson_edit", output: {}, error: null },
        },
        { type: "approval_resolved", payload: { call_id: "call_1", decision: "rejected" } },
      ]),
    );
    expect(view.chat[0]).toMatchObject({ kind: "tool", state: "done" });
  });

  it("draws a tool line's view from its result, and only when the result has one", () => {
    const result = { call_id: "call_1", verb: "question_search", output: {}, error: null };
    const view = { kind: "question_search", data: { sets: [] } };
    const [withView] = foldRun(logOf([{ type: "tool_result", payload: { ...result, view } }])).chat;
    const [plain] = foldRun(logOf([{ type: "tool_result", payload: result }])).chat;
    expect(withView).toMatchObject({ kind: "tool", state: "done", view });
    expect(plain).not.toHaveProperty("view");
  });

  it("carries an agent message's citations, and none on a message without them", () => {
    const citations = [{ kind: "skill", skill_code: "math.add.within-20" }];
    const { chat } = foldRun(
      logOf([
        { type: "message", payload: { from: "agent", text: "Carrying.", citations } },
        { type: "message", payload: { from: "parent", text: "Thanks." } },
      ]),
    );
    expect(chat[0]).toMatchObject({ kind: "message", citations });
    expect(chat[1]).not.toHaveProperty("citations");
  });

  it("keeps the approval's choose form", () => {
    const choose = {
      questions: [
        {
          text: "How many?",
          options: [{ label: "5", recommended: true }, { label: "8" }],
          custom_allowed: false,
          skippable: true,
        },
      ],
    };
    const { chat } = foldRun(logOf([{ ...ASK, payload: { ...ASK.payload, choose } }]));
    expect(chat[1]).toMatchObject({ kind: "approval", choose, decision: null });
  });

  it("shows the last plan whole, and null before one", () => {
    const plan = (status: string) => ({
      type: "plan",
      payload: { entries: [{ text: "Find questions", status }] },
    });
    expect(foldRun([]).plan).toBeNull();
    expect(foldRun(logOf([plan("in_progress"), plan("done")])).plan).toEqual([
      { text: "Find questions", status: "done" },
    ]);
  });
});

describe("mergeLive, properties", () => {
  it("keeps one event per event_id, then the first per seq in input order (Lead, dl-z5ja.13)", () => {
    const clashing = fc
      .array(fc.tuple(fc.nat(), fc.integer({ min: 1, max: 5 }), fc.integer({ min: 1, max: 5 })), {
        maxLength: 12,
      })
      .map((rows) =>
        rows.map(([pick, seq, id]) =>
          RunEvent.parse({ ...TEMPLATES[pick % TEMPLATES.length], seq, event_id: eventId(id) }),
        ),
      );
    fc.assert(
      fc.property(clashing, (events) => {
        const ids = new Set<string>();
        const byId = events.filter((e) => !ids.has(e.event_id) && Boolean(ids.add(e.event_id)));
        const seqs = new Set<number>();
        const want = byId
          .filter((e) => !seqs.has(e.seq) && Boolean(seqs.add(e.seq)))
          .sort((a, b) => a.seq - b.seq);
        expect(mergeLive(events, [], 0)).toEqual(want);
        expect(foldRun(events)).toEqual(foldRun(want));
      }),
    );
  });

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
  it("stops on a cap of 0, below 0 or NaN, as on an unknown spend (Lead, dl-z5ja.13)", () => {
    expect(budgetGuard(0, 0)).toBe("stop");
    expect(budgetGuard(0, -1)).toBe("stop");
    expect(budgetGuard(0, Number.NaN)).toBe("stop");
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10, noNaN: true }),
        fc.oneof(fc.double({ max: 0, noNaN: true }), fc.constant(Number.NaN)),
        (spent, cap) => {
          expect(budgetGuard(spent, cap)).toBe("stop");
        },
      ),
    );
  });

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
