/**
 * A turn's spine from its run events (wave dl-uukj.47.71, handoff §2 items 1-6 and 8, §10): the
 * plan's stages, each holding the lines of the calls made while it was in progress; the now line;
 * the reply; and the foot of a turn that failed, stalled or was stopped. Pure: `now` comes in.
 *
 * No contract change (wave plan): a call joins the stage that is `in_progress` when it is called,
 * and a stage's visit count comes from its `in_progress` transitions, by plan index. Every line is
 * a copy key with values; the engine's own text never reaches one (S3, `dl-uukj.47.72`).
 */

import { RUN_ERROR_TYPE, type RunEvent, type VerbName } from "@jadwigo/contracts/run";
import type { CopyKey } from "@jadwigo/copy";
import { mergeLive } from "@jadwigo/core";
import type { RunPhase } from "../phase.ts";
import { SLOW_MS, STALL_MS } from "../phase.ts";
import { stepIds } from "./lessonFile.ts";
import {
  type DoneCall,
  emptyMerge,
  type Merge,
  mergeCall,
  mergeWords,
  plainWords,
  sayWords,
} from "./lines.ts";
import type {
  SpineFoot,
  SpineLine,
  SpinePhase,
  Stage,
  StageStatus,
  TurnSpine,
  Words,
} from "./types.ts";

const PHASE: Readonly<Record<RunPhase["kind"], SpinePhase>> = {
  connecting: "queued",
  queued: "queued",
  thinking: "thinking",
  tool: "tool",
  awaiting_input: "awaiting_input",
  slow: "slow",
  stalled: "stalled",
  done: "done",
  failed: "failed",
  cancelled: "cancelled",
};

const ENDED: ReadonlySet<SpinePhase> = new Set(["done", "failed", "cancelled"]);

/** The header's words before the turn has a title (S9, S10). */
const PHASE_WORDS: Readonly<Record<SpinePhase, CopyKey>> = {
  queued: "chat_phase_queued",
  thinking: "chat_phase_thinking_lesson",
  tool: "chat_phase_thinking_lesson",
  slow: "chat_phase_thinking_lesson",
  stalled: "chat_phase_thinking_lesson",
  awaiting_input: "chat_phase_awaiting_input",
  done: "chat_phase_done",
  failed: "chat_phase_failed",
  cancelled: "chat_status_cancelled",
};

/** A turn has fewer stages than this: no stage rows, the lines go under the header (§2 item 2). */
const MIN_STAGES = 3;
/** The title's longest clause (§2 item 1). */
const TITLE_MAX = 60;

/** What the page knows beside the turn's own log. */
export interface SpineContext {
  /** The lesson's revision before this turn: what stands when a stop changed nothing (S15). */
  priorRevision?: number;
}

/** No stage: a line made before the plan, or in a turn without one. */
const LOOSE = -1;
/**
 * Not placed yet: made while the plan had no stage in progress. The engine writes a call before the
 * plan event that starts its stage (jadwigo-ai run-step.ts, `runTool`), so the line joins the next
 * stage to start, else the last one that ran (dl-uukj.47.71.36).
 */
const NEXT = -2;

/** A line placed in the turn: its stage, and the order it came in. */
interface Placed {
  seq: number;
  stage: number;
  line: SpineLine;
}

interface Call {
  call_id: string;
  verb: VerbName;
  input: Record<string, unknown>;
  seq: number;
  at: number;
  stage: number;
  visit: number;
  result?: { seq: number; output: Record<string, unknown> | null; failed: boolean };
}

const at = (e: RunEvent): number => Date.parse(e.created_at);

/** The first clause of an agent sentence, at most TITLE_MAX characters (§2 item 1). */
export function titleOf(text: string): string {
  const clause = (text.trim().split(/[.,;:!?…](?:\s|$)/)[0] ?? "").trim();
  if (clause.length <= TITLE_MAX) return clause;
  const cut = clause.slice(0, TITLE_MAX - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** The phase from the log alone, for a turn the page gave none (an older turn, a test). */
function phaseFromLog(
  events: readonly RunEvent[],
  calls: readonly Call[],
  now: number,
): SpinePhase {
  let status: string | null = null;
  let complete = false;
  let asking = new Set<string>();
  for (const e of events) {
    if (e.type === "status" && !complete) status = e.payload.status;
    if (e.type === "turn_complete") complete = true;
    if (e.type === "approval_request") asking = new Set([...asking, e.payload.call_id]);
    if (e.type === "approval_resolved") asking.delete(e.payload.call_id);
  }
  if (status === "failed") return "failed";
  if (status === "cancelled") return "cancelled";
  if (complete || status === "completed") return "done";
  if (status === "awaiting_input" || asking.size > 0) return "awaiting_input";
  const last = events.at(-1);
  const quiet = last === undefined ? 0 : now - at(last);
  if (quiet >= STALL_MS) return "stalled";
  if (quiet >= SLOW_MS) return "slow";
  if (calls.some((c) => c.result === undefined)) return "tool";
  return status === null || status === "queued" ? "queued" : "thinking";
}

/**
 * The turn's spine at `now`, given its events and the page's phase for it (null for a turn the
 * page has no phase for: the phase is then read from the log).
 */
export function spineOf(
  events: readonly RunEvent[],
  phase: RunPhase | null,
  now: number,
  context: SpineContext = {},
): TurnSpine {
  const log = mergeLive(events, [], 0);
  const first = log[0];
  const startedAt = first === undefined ? now : at(first);

  // Walk the log: the plan's stages and visits, where each call and line lands.
  let entries: { text: string; status: string }[] = [];
  const visits: number[] = [];
  let lastActive: number | null = null;
  const calls = new Map<string, Call>();
  const placed: Placed[] = [];
  const agent: { text: string; seq: number; at: number; stage: number }[] = [];
  const revisions: { revision: number; call_id: string; seq: number; file: unknown }[] = [];
  const reads: { seq: number; ids: string[] }[] = [];
  const retried = new Set<number>();
  let tries = 0;
  let sawParent = false;
  let endedAt: number | undefined;

  const inProgress = (): number => entries.findIndex((e) => e.status === "in_progress");
  /** The stage open at the end, or the last that ran: where the now, wait and slow lines go. */
  const activeStage = (): number => {
    const open = inProgress();
    if (open !== -1) return open;
    if (lastActive !== null) return lastActive;
    return entries.length > 0 ? 0 : LOOSE;
  };
  /** Where a line made now lands: the stage in progress, else the next one to start. */
  const stageNow = (): number => {
    const open = inProgress();
    if (open !== -1) return open;
    return entries.length > 0 ? NEXT : LOOSE;
  };
  /** Gives every line and call still waiting for a stage the one that just started. */
  const place = (stage: number): void => {
    for (const p of placed) if (p.stage === NEXT) p.stage = stage;
    for (const m of agent) if (m.stage === NEXT) m.stage = stage;
    for (const c of calls.values())
      if (c.stage === NEXT) {
        c.stage = stage;
        c.visit = visits[stage] ?? 0;
      }
  };
  // The engine settles the plan as the turn ends: every stage not done reads failed (jadwigo-ai
  // plan.ts `settlePlan`), a stopped or completed turn too. That says nothing about the stages, so
  // the plan before it stands (dl-uukj.47.71.37).
  const settles = new Set(
    log.flatMap((e, i) => {
      const next = log[i + 1];
      return e.type === "plan" &&
        next?.type === "status" &&
        ["completed", "failed", "cancelled"].includes(next.payload.status)
        ? [e.seq]
        : [];
    }),
  );

  for (const e of log) {
    switch (e.type) {
      case "plan": {
        if (settles.has(e.seq)) break;
        const next = e.payload.entries;
        let started: number | null = null;
        next.forEach((entry, i) => {
          const was = entries[i]?.status;
          if (entry.status === "in_progress" && was !== "in_progress") {
            visits[i] = (visits[i] ?? 0) + 1;
            started ??= i;
          }
          if (entry.status === "in_progress") lastActive = i;
        });
        entries = next.map((entry) => ({ text: entry.text, status: entry.status }));
        if (started !== null) place(started);
        break;
      }
      case "tool_call": {
        if (calls.has(e.payload.call_id)) break;
        const stage = stageNow();
        calls.set(e.payload.call_id, {
          call_id: e.payload.call_id,
          verb: e.payload.verb,
          input: e.payload.input,
          seq: e.seq,
          at: at(e),
          stage,
          visit: stage < 0 ? 0 : (visits[stage] ?? 0),
        });
        break;
      }
      case "tool_result": {
        const call = calls.get(e.payload.call_id);
        if (call === undefined || call.result !== undefined) break;
        // A call belongs to the stage under way while it ran: the engine starts it after the call
        // and ends it after the result, and a model reply with several calls runs them in turn.
        const open = inProgress();
        if (open !== -1) {
          call.stage = open;
          call.visit = visits[open] ?? 0;
        }
        call.result = { seq: e.seq, output: e.payload.output, failed: e.payload.error !== null };
        const steps = e.payload.output?.["steps"];
        if (call.verb === "lesson_show" && Array.isArray(steps))
          reads.push({ seq: e.seq, ids: steps.filter((s): s is string => typeof s === "string") });
        break;
      }
      case "lesson_revision":
        revisions.push({
          revision: e.payload.revision,
          call_id: e.payload.call_id,
          seq: e.seq,
          file: e.payload.lesson_file,
        });
        break;
      case "message": {
        if (e.payload.from === "agent") {
          agent.push({ text: e.payload.text, seq: e.seq, at: at(e), stage: stageNow() });
          break;
        }
        // The first parent message is the turn's own bubble; a later one entered mid-turn (S17).
        if (!sawParent) {
          sawParent = true;
          break;
        }
        const photos = e.payload.attachments?.length ?? 0;
        const words = e.payload.text.trim();
        if (words === "" && photos === 0) break;
        placed.push({
          seq: e.seq,
          stage: stageNow(),
          line:
            words === ""
              ? {
                  kind: "steer",
                  copyKey: "chat_steer_photos",
                  values: { n: photos },
                  steerLabel: true,
                }
              : { kind: "steer", ...sayWords(words), steerLabel: true, quote: words },
        });
        break;
      }
      case "steer": {
        const words = e.payload.text.trim();
        const line: SpineLine =
          e.payload.source === "lesson_edit"
            ? { kind: "steer", copyKey: "chat_steered_edit", values: {} }
            : { kind: "steer", ...sayWords(words), steerLabel: true, quote: words };
        if (e.payload.source === "lesson_edit" || words !== "")
          placed.push({ seq: e.seq, stage: stageNow(), line });
        break;
      }
      case "error": {
        tries = Math.max(tries, e.payload.attempt);
        if (e.payload.error.type !== RUN_ERROR_TYPE.stepTimedOut) break;
        const stage = stageNow();
        // One quiet retry line per stage, however many deliveries timed out (S5).
        if (stage !== NEXT && retried.has(stage)) break;
        if (stage !== NEXT) retried.add(stage);
        // Named once it has a stage: one that starts after it may still take it in.
        placed.push({
          seq: e.seq,
          stage,
          line: { kind: "retry", copyKey: "chat_line_retry_plain", values: {} },
        });
        break;
      }
      case "status":
        if (["completed", "failed", "cancelled"].includes(e.payload.status)) endedAt ??= at(e);
        break;
      case "turn_complete":
        endedAt ??= at(e);
        break;
      default:
        break;
    }
  }

  // Nothing started after them: they join the last stage that ran, else the first.
  place(lastActive ?? 0);
  // One quiet retry line per stage (S5), however many timed out before their stage started.
  const firstRetry = new Map<number, Placed>();
  for (const p of placed)
    if (p.line.kind === "retry" && !firstRetry.has(p.stage)) firstRetry.set(p.stage, p);
  for (let i = placed.length - 1; i >= 0; i -= 1) {
    const p = placed[i];
    if (p?.line.kind === "retry" && firstRetry.get(p.stage) !== p) placed.splice(i, 1);
  }
  for (const p of placed) {
    if (p.line.kind !== "retry") continue;
    retried.add(p.stage);
    const name = p.stage < 0 ? undefined : entries[p.stage]?.text;
    if (name !== undefined)
      p.line = { kind: "retry", copyKey: "chat_line_retry", values: { stage: name } };
  }

  const all = [...calls.values()];
  const kind = phase === null ? phaseFromLog(log, all, now) : PHASE[phase.kind];
  const ended = ENDED.has(kind);

  // Done lines: one per verb per stage visit, merged (S2), placed where the first one landed.
  const merges = new Map<string, { seq: number; stage: number; merge: Merge }>();
  const finished = all
    .filter((c) => c.result !== undefined && !c.result.failed)
    .sort((a, b) => (a.result?.seq ?? 0) - (b.result?.seq ?? 0));
  for (const call of finished) {
    const key = `${call.stage}:${call.visit}:${call.verb}`;
    const slot = merges.get(key) ?? {
      seq: call.seq,
      stage: call.stage,
      merge: emptyMerge(call.verb),
    };
    merges.set(key, slot);
    mergeCall(slot.merge, doneCall(call, revisions, reads));
  }
  for (const { seq, stage, merge } of merges.values()) {
    const { words, tags } = mergeWords(merge);
    placed.push({ seq, stage, line: { kind: "done", ...words, ...(tags ? { tags } : {}) } });
  }

  // A failed call shows only once the turn is over, in plain words (S5, S13, §2 item 6).
  if (ended)
    for (const call of all) {
      if (call.result?.failed !== true) continue;
      const failedAt = call.result.seq;
      const recovered = all.some(
        (c) => c.result !== undefined && !c.result.failed && c.result.seq > failedAt,
      );
      placed.push({
        seq: failedAt,
        stage: call.stage,
        line: {
          kind: "skip",
          copyKey:
            recovered && call.verb === "question_types"
              ? "chat_line_recovered_types"
              : "chat_line_failed_generic",
          values: {},
        },
      });
    }

  // The reply: the last agent message with no tool call after it, once the turn is over (D4).
  const lastAgent = agent.at(-1);
  const reply =
    ended && lastAgent !== undefined && !all.some((c) => c.seq > lastAgent.seq)
      ? lastAgent
      : undefined;

  // A turn that ended with no reply (stopped or failed mid-call): its last sentence stays a line
  // in the stage it was said in, never the reply (§2 item 5, dl-uukj.47.71.38).
  if (ended && reply === undefined && lastAgent !== undefined && lastAgent.text.trim() !== "")
    placed.push({
      seq: Number.MAX_SAFE_INTEGER,
      stage: lastAgent.stage,
      line: { kind: "now", ...sayWords(lastAgent.text.trim()) },
    });

  // The open stage's tail: the now line, the waiting line, the slow line.
  const here = activeStage();
  const tail: SpineLine[] = [];
  if (!ended && kind !== "awaiting_input") {
    const now_ = nowLine(agent, all);
    if (now_ !== null) tail.push(now_);
  }
  if (kind === "awaiting_input")
    tail.push({ kind: "wait", copyKey: "chat_line_waiting", values: {} });
  if (kind === "slow" || kind === "stalled")
    tail.push({ kind: "slow", copyKey: "chat_slow_line", values: {} });

  const ordered = placed.sort((a, b) => a.seq - b.seq);
  const staged = entries.length >= MIN_STAGES;
  const stages: Stage[] = staged
    ? entries.map((entry, i) => {
        const lines = ordered
          .filter((p) => p.stage === i || (i === 0 && p.stage === LOOSE))
          .map((p) => p.line);
        const status = stageStatus(entry.status, i === here, kind);
        return {
          id: String(i),
          name: entry.text,
          status,
          visit: Math.max(1, visits[i] ?? 0),
          ...summaryOf(status, lines, retried.has(i), Math.max(1, tries)),
          lines: i === here ? [...lines, ...tail] : lines,
        };
      })
    : [];
  const looseLines = staged ? [] : [...ordered.map((p) => p.line), ...tail];

  // A failed turn whose plan never said which stage failed: the open one did, or, when the last
  // stage that ran had finished, the next one, which never got going.
  if (staged && kind === "failed" && !stages.some((s) => s.status === "failed")) {
    const at =
      stages[here]?.status === "done"
        ? stages.findIndex((s, i) => i > here && s.status === "todo")
        : here;
    const open = stages[at];
    if (open !== undefined) {
      stages[at] = {
        ...open,
        status: "failed",
        summary: { copyKey: "chat_stage_failed_sum", values: { n: Math.max(1, tries) } },
      };
    }
  }

  const title = agent.find((m) => m !== reply && titleOf(m.text) !== "");
  const foot = footOf(kind, Math.max(1, tries), revisions, context);
  return {
    phase: kind,
    title:
      title === undefined
        ? { copyKey: PHASE_WORDS[kind], values: {} }
        : { text: titleOf(title.text) },
    startedAt,
    ...(ended && endedAt !== undefined ? { endedAt } : {}),
    stepCount: calls.size,
    stages,
    looseLines,
    ...(foot ? { foot } : {}),
    ...(reply ? { reply: reply.text } : {}),
  };
}

/** A finished call with the lesson around it: what it wrote, what stood before, the known steps. */
function doneCall(
  call: Call,
  revisions: readonly { revision: number; call_id: string; seq: number; file: unknown }[],
  reads: readonly { seq: number; ids: string[] }[],
): DoneCall {
  const wrote = revisions.find((r) => r.call_id === call.call_id);
  const before = revisions.filter((r) => r.seq < call.seq).at(-1);
  const known = new Set<string>([
    ...revisions.filter((r) => r.seq < call.seq).flatMap((r) => stepIds(r.file)),
    ...reads.filter((r) => r.seq < call.seq).flatMap((r) => r.ids),
  ]);
  return {
    verb: call.verb,
    input: call.input,
    output: call.result?.output ?? null,
    ...(wrote ? { wrote: wrote.file } : {}),
    ...(before ? { before: before.file } : {}),
    known,
  };
}

/**
 * The now line (D4): the agent's latest sentence since the last finished call, else the running
 * call's own words. A sentence the same as the one before keeps its clock (S2's dedupe).
 */
function nowLine(
  agent: readonly { text: string; seq: number; at: number }[],
  calls: readonly Call[],
): SpineLine | null {
  const lastResult = Math.max(0, ...calls.flatMap((c) => (c.result ? [c.result.seq] : [])));
  const latest = agent.at(-1);
  if (latest !== undefined && latest.seq > lastResult && latest.text.trim() !== "") {
    let since = latest.at;
    for (let i = agent.length - 2; i >= 0 && agent[i]?.text.trim() === latest.text.trim(); i -= 1)
      since = agent[i]?.at ?? since;
    return { kind: "now", ...sayWords(latest.text.trim()), startedAt: since };
  }
  const running = calls.filter((c) => c.result === undefined).at(-1);
  if (running === undefined) return null;
  return { kind: "now", ...plainWords(running.verb, running.input), startedAt: running.at };
}

/** A stage's mark from its plan status, the open stage taking the turn's phase (§4.1). */
function stageStatus(plan: string, open: boolean, phase: SpinePhase): StageStatus {
  if (plan === "done") return "done";
  // A stopped turn: the stage it stopped in takes the square, the rest never ran (S15).
  if (phase === "cancelled") return open && plan === "in_progress" ? "stopped" : "todo";
  if (plan === "failed") return "failed";
  if (plan === "pending" && !open) return "todo";
  if (!open) return phase === "done" ? "done" : plan === "in_progress" ? "active" : "todo";
  switch (phase) {
    case "awaiting_input":
      return "waiting";
    case "failed":
      return plan === "in_progress" ? "failed" : "todo";
    case "done":
      return "done";
    default:
      return plan === "in_progress" ? "active" : "todo";
  }
}

/** A stage's one-line summary: failed, stopped, retried, else what it last did. */
function summaryOf(
  status: StageStatus,
  lines: readonly SpineLine[],
  retried: boolean,
  tries: number,
): { summary?: Words } {
  if (status === "failed")
    return { summary: { copyKey: "chat_stage_failed_sum", values: { n: tries } } };
  if (status === "stopped") return { summary: { copyKey: "chat_stage_stopped_sum", values: {} } };
  if (status !== "done") return {};
  if (retried) return { summary: { copyKey: "chat_stage_retry_sum", values: {} } };
  const last = lines.findLast((l) => l.kind === "done");
  return last === undefined ? {} : { summary: { copyKey: last.copyKey, values: last.values } };
}

/** The card's foot: failed with its tries, stalled, or stopped with the version that stands (D7, S11, S15). */
function footOf(
  phase: SpinePhase,
  tries: number,
  revisions: readonly { revision: number }[],
  context: SpineContext,
): SpineFoot | null {
  if (phase === "failed") return { kind: "failed", tries };
  if (phase === "stalled") return { kind: "stalled" };
  if (phase !== "cancelled") return null;
  const changed = revisions.length > 0;
  const stands = changed ? Math.max(...revisions.map((r) => r.revision)) : context.priorRevision;
  return { kind: "stopped", changed, ...(stands === undefined ? {} : { versionStands: stands }) };
}
