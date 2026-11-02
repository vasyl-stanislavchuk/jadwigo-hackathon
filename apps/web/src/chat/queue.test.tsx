// @vitest-environment happy-dom
/**
 * The "Następne" queue (dl-uukj.47.34): words sent while a turn runs wait in the tab, never in the
 * running turn's inbox; "Wyślij teraz" sends one now as a chat steer; when a turn ends the rest go
 * in order, one turn each; a reload keeps them; the pane draws them under the composer.
 */

import { ConversationId, type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChatPane } from "./ChatPane.tsx";
import { heldQueue } from "./queue.ts";
import { type EngineTransport, useConversation } from "./useConversation.ts";
import type { SendBody } from "./wire.ts";

const CONVERSATION = ConversationId.parse("cnv_00000000000000000000000001");
const happy = (RUN_LOGS.find((l) => l.name === "happy-turn")?.events ?? []).map((e) =>
  RunEvent.parse(e),
);
const runOf = (n: number): Run => ({
  id: RunId.parse(`run_0000000000000000000000000${n}`),
  pod_id: "pod_00000000000000000000000001" as Run["pod_id"],
  created_by: "acc_00000000000000000000000001" as Run["created_by"],
  conversation_id: CONVERSATION,
  workflow: "jadwigo-lesson-compose",
  resumes: null,
  status: "queued",
  attempt: 1,
  cancel_requested_at: null,
  idle_deadline_at: null,
  max_deadline_at: "2026-09-01T08:30:00.000Z",
  cap_usd: 1,
  spent_usd: 0,
  created_at: "2026-09-01T08:00:00.000Z",
  completed_at: null,
});
/** The happy turn's closing events, for one run. */
const ending = (run: Run): RunEvent[] =>
  happy
    .filter((e) => e.seq >= 16)
    .map((e, i) =>
      RunEvent.parse({
        ...e,
        run_id: run.id,
        seq: i + 1,
        event_id: `00000000-0000-4000-800c-0000000000${run.id.slice(-1)}${i}`,
      }),
    );

/** Each message opens the next run; steers land on the open one. Pushes are the test's. */
function standIn() {
  const sent: SendBody[] = [];
  const runs: Run[] = [];
  const pushes = new Map<string, (events: readonly RunEvent[]) => void>();
  const transport: EngineTransport = {
    subscribe: (run, on) => {
      pushes.set(run, on);
      return () => {};
    },
    onConnection: () => () => {},
    runs: async () => runs,
    events: async () => [],
    send: async (body) => {
      sent.push(body);
      if (body.kind === "message") runs.push(runOf(runs.length + 1));
      return runs.at(-1) as Run;
    },
  };
  const end = async (n: number) => {
    const run = runs[n - 1] as Run;
    await act(async () => pushes.get(run.id)?.(ending(run)));
  };
  return { transport, sent, end };
}

const said = (sent: SendBody[]) =>
  sent.map((b) => (b.kind === "cancel" ? "cancel" : `${b.kind}:${b.text}`));

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

describe("the Następne queue", () => {
  it("queues words sent during an open turn, sends one now as a steer, and drains the rest in order", async () => {
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    await act(async () => result.current.send("Pierwsza"));
    for (const text of ["A", "B", "C"]) await act(async () => result.current.send(text));
    expect(said(s.sent)).toEqual(["message:Pierwsza"]);
    expect(result.current.next).toEqual(["A", "B", "C"]);
    expect(heldQueue(CONVERSATION)).toEqual(["A", "B", "C"]);

    await act(async () => result.current.sendNow(1));
    expect(s.sent.at(-1)).toMatchObject({ kind: "steer", source: "chat", text: "B" });
    expect(s.sent.at(-1)).not.toHaveProperty("question_ids");
    expect(result.current.next).toEqual(["A", "C"]);

    await s.end(1);
    expect(said(s.sent)).toEqual(["message:Pierwsza", "steer:B", "message:A"]);
    expect(result.current.next).toEqual(["C"]);
    await s.end(2);
    expect(said(s.sent)).toEqual(["message:Pierwsza", "steer:B", "message:A", "message:C"]);
    expect(result.current.next).toEqual([]);
    expect(window.sessionStorage.getItem(`jw.chat.next.${CONVERSATION}`)).toBeNull();
  });

  it("keeps the queue over a reload", async () => {
    const s = standIn();
    const first = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    await act(async () => first.result.current.send("Pierwsza"));
    await act(async () => first.result.current.send("Druga"));
    first.unmount();
    const again = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    expect(again.result.current.next).toEqual(["Druga"]);
  });

  it("draws the rows under the composer, with Wyślij teraz, Zmień back to the composer and Usuń", async () => {
    const taken: number[] = [];
    const now: number[] = [];
    render(
      <ChatPane
        language="pl"
        variant="parent"
        turns={[]}
        queued={[]}
        restoring={false}
        stopping={false}
        sendFailed={false}
        onSend={() => {}}
        onStop={() => {}}
        next={["A", "B"]}
        onSendNow={(i) => now.push(i)}
        onTakeNext={(i) => {
          taken.push(i);
          return ["A", "B"][i] ?? null;
        }}
      />,
    );
    const list = screen.getByRole("region", { name: "Następne" });
    const form = document.querySelector("form") as HTMLElement;
    expect(form.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect([...list.querySelectorAll("[data-next-row] span")].map((r) => r.textContent)).toEqual([
      "A",
      "B",
    ]);
    fireEvent.click(screen.getAllByRole("button", { name: "Wyślij teraz" })[0] as HTMLElement);
    expect(now).toEqual([0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Zmień" })[1] as HTMLElement);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("B");
    fireEvent.click(screen.getAllByRole("button", { name: "Usuń" })[0] as HTMLElement);
    expect(taken).toEqual([1, 0]);
  });
});
