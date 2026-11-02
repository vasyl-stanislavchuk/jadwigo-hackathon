// @vitest-environment happy-dom
/**
 * The closable context chip (dl-uukj.47.36): a conversation goes on with the context its messages
 * carry, until the parent closes the chip; then the next messages go with none, the chip stays
 * closed over a reload and a new turn, and another conversation starts open.
 */

import { LearnerId } from "@jadwigo/contracts";
import { ConversationId, type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChatPane } from "./ChatPane.tsx";
import { type EngineTransport, useConversation } from "./useConversation.ts";
import type { SendBody } from "./wire.ts";

const CONVERSATION = ConversationId.parse("cnv_00000000000000000000000001");
const OTHER = ConversationId.parse("cnv_00000000000000000000000002");
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

describe("the closable context chip", () => {
  it("keeps the conversation's context on the next message until the chip is closed, then sends none", async () => {
    const s = standIn();
    const { result, unmount } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    await act(async () => result.current.send("Pierwsza", { learner_id: OLA }));
    await act(async () => {});
    await act(async () => result.current.send("Druga"));
    expect(contexts(s.sent)).toEqual([{ learner_id: OLA }, { learner_id: OLA }]);

    expect(result.current.contextClosed).toBe(false);
    await act(async () => result.current.closeContext());
    await act(async () => result.current.send("Trzecia"));
    expect(contexts(s.sent).at(-1)).toBeNull();

    // A reload: still closed, and a new turn sends none either.
    unmount();
    const again = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    expect(again.result.current.contextClosed).toBe(true);
    await act(async () => again.result.current.send("Czwarta", { learner_id: OLA }));
    expect(contexts(s.sent).at(-1)).toBeNull();

    // Another conversation starts open.
    const other = renderHook(() => useConversation(s.transport, OTHER));
    expect(other.result.current.contextClosed).toBe(false);
  });

  it("draws an × on the chip that closes it, and no chip once closed", () => {
    let closed = 0;
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
      onCloseContext: () => {
        closed += 1;
      },
    };
    const { rerender } = render(<ChatPane {...props} />);
    expect(document.querySelector("[data-context-chip]")?.textContent).toBe(
      "Jadwigo AI widzi: Ola",
    );
    const close = screen.getByRole("button", { name: "Ukryj kontekst" });
    expect(close.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(close);
    expect(closed).toBe(1);
    rerender(<ChatPane {...props} contextClosed />);
    expect(document.querySelector("[data-context-chip]")).toBeNull();
  });
});
