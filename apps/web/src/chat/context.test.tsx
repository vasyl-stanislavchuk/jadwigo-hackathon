// @vitest-environment happy-dom
/**
 * A message's context (dl-uukj.47.36), with no chip to close it any more (handoff S21,
 * dl-uukj.47.71.13): each message goes with the context given (Dla's child), else the one the
 * conversation already has. A "closed" flag an earlier page left in the tab is ignored and cleared
 * (owner, 2026-11-03, decision dl-6rx6g).
 */

import { LearnerId } from "@jadwigo/contracts";
import { ConversationId, type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChatPane } from "./ChatPane.tsx";
import { type EngineTransport, useConversation } from "./useConversation.ts";
import type { SendBody } from "./wire.ts";

const CONVERSATION = ConversationId.parse("cnv_00000000000000000000000001");
const OLA = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
const happy = (RUN_LOGS.find((l) => l.name === "happy-turn")?.events ?? []).map((e) =>
  RunEvent.parse(e),
);
const at = (seq: number) => happy.find((e) => e.seq === seq) as RunEvent;

/** Each message is a whole turn at once: its own message event, as sent, then done. */
function standIn() {
  const sent: SendBody[] = [];
  const runs: Run[] = [];
  const logs = new Map<string, RunEvent[]>();
  const transport: EngineTransport = {
    subscribe: () => () => {},
    onConnection: () => () => {},
    runs: async () => runs,
    events: async (run, after) => (logs.get(run) ?? []).filter((e) => e.seq > after),
    send: async (body) => {
      sent.push(body);
      if (body.kind !== "message") return runs.at(-1) as Run;
      const n = runs.length + 1;
      const id = RunId.parse(`run_0000000000000000000000000${n}`);
      const event = (seq: number, from: RunEvent, payload?: unknown) =>
        RunEvent.parse({
          ...from,
          run_id: id,
          seq,
          event_id:
            n === 1 && seq === 1 ? body.event_id : `00000000-0000-4000-800d-0000000000${n}${seq}`,
          ...(payload === undefined ? {} : { payload }),
        });
      logs.set(id, [
        event(1, at(1), {
          from: "parent",
          text: body.text,
          ...(body.context === undefined ? {} : { context: body.context }),
        }),
        event(2, at(16)),
        event(3, at(17)),
      ]);
      const run = { ...(at(1) as unknown as Run), id, conversation_id: CONVERSATION } as Run;
      runs.push({
        id,
        pod_id: "pod_00000000000000000000000001" as Run["pod_id"],
        created_by: "acc_00000000000000000000000001" as Run["created_by"],
        conversation_id: run.conversation_id,
        workflow: "jadwigo-lesson-compose",
        resumes: null,
        status: "completed",
        attempt: 1,
        cancel_requested_at: null,
        idle_deadline_at: null,
        max_deadline_at: "2026-09-01T08:30:00.000Z",
        cap_usd: 1,
        spent_usd: 0,
        created_at: "2026-09-01T08:00:00.000Z",
        completed_at: null,
      });
      return runs.at(-1) as Run;
    },
  };
  return { transport, sent };
}

const contexts = (sent: SendBody[]) =>
  sent.map((b) => (b.kind === "message" ? (b.context ?? null) : "-"));

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

describe("a message's context, with no chip to close it", () => {
  it("goes on with the conversation's context, and Dla's child wins when one is given", async () => {
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    await act(async () => result.current.send("Pierwsza", { learner_id: OLA }));
    await act(async () => {});
    await act(async () => result.current.send("Druga"));
    expect(contexts(s.sent)).toEqual([{ learner_id: OLA }, { learner_id: OLA }]);
  });

  it("ignores and clears a 'closed' flag an earlier page left in the tab (decision dl-6rx6g)", async () => {
    const key = `jw.chat.context-closed.${CONVERSATION}`;
    window.sessionStorage.setItem(key, "1");
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    expect(window.sessionStorage.getItem(key)).toBeNull();
    await act(async () => result.current.send("Pierwsza", { learner_id: OLA }));
    expect(contexts(s.sent)).toEqual([{ learner_id: OLA }]);
  });

  it("draws no chip and no × (S21): Dla in the composer says who the lesson is for", () => {
    const turn = {
      run: { id: RunId.parse("run_00000000000000000000000001"), status: "completed" } as Run,
      view: {
        chat: [
          {
            kind: "message" as const,
            seq: 1,
            from: "parent" as const,
            text: "Pierwsza",
            attachments: [],
            context: { learner_id: OLA },
          },
        ],
        lesson: null,
        previous_lesson: null,
        status: "completed" as const,
        turn_open: false,
        spent_usd: 0,
        cap_usd: 1,
        budget: "none" as const,
        cursor: 1,
        plan: null,
      },
    };
    const props = {
      language: "pl" as const,
      variant: "parent" as const,
      turns: [turn],
      queued: [],
      restoring: false,
      stopping: false,
      sendFailed: false,
      onSend: () => {},
      onStop: () => {},
      nameOf: (id: string) => (id === OLA ? "Ola" : null),
    };
    render(<ChatPane {...props} />);
    // The chip is gone (handoff dl-uukj.47.71 S21): nothing to close, and closing stays the hook's.
    expect(document.querySelector("[data-context-chip]")).toBeNull();
    expect(screen.queryByRole("button", { name: "Ukryj kontekst" })).toBeNull();
  });
});
