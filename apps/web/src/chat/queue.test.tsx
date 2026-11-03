// @vitest-environment happy-dom
/**
 * The "Następne" queue (dl-uukj.47.34): words sent while a turn runs wait in the tab, never in the
 * running turn's inbox; "Wyślij teraz" sends one now as a chat steer; when a turn ends the rest go
 * in order, one turn each; a reload keeps them, photos included; the pane draws them above the
 * composer (D6), a photo-only row as its count.
 */

import { ApiError } from "@jadwigo/api-client";
import { ConversationId, type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChatPane } from "./ChatPane.tsx";
import { clearChatQueues, heldQueue, useNextQueue } from "./queue.ts";
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
  /** How many sends to refuse next, as a network failure would. */
  const refuse = { next: 0 };
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
      if (refuse.next > 0) {
        refuse.next -= 1;
        throw new Error("the network went away");
      }
      sent.push(body);
      if (body.kind === "message") runs.push(runOf(runs.length + 1));
      return runs.at(-1) as Run;
    },
  };
  const end = async (n: number) => {
    const run = runs[n - 1] as Run;
    await act(async () => pushes.get(run.id)?.(ending(run)));
  };
  return { transport, sent, end, refuse };
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
    expect(heldQueue(CONVERSATION, null)).toEqual(["A", "B", "C"]);

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

  // Rewritten for the chat handoff's D6 (dl-uukj.47.71.5, the lead's call): the rows wait above
  // the composer with Wyślij teraz and ×; Zmień and the "Następne" heading are gone.
  it("draws the rows above the composer, with Wyślij teraz and × (D6)", async () => {
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
    const list = document.querySelector("[data-queue]") as HTMLElement;
    const form = document.querySelector("form") as HTMLElement;
    expect(list.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Następne" })).toBeNull();
    expect([...list.querySelectorAll("[data-queue-words]")].map((r) => r.textContent)).toEqual([
      "A",
      "B",
    ]);
    expect(list.querySelector("[data-next-row]")?.textContent).toContain("Wyślę, gdy skończę");
    expect(screen.queryByRole("button", { name: "Zmień" })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Wyślij teraz" })[0] as HTMLElement);
    expect(now).toEqual([0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Usuń" })[1] as HTMLElement);
    expect(taken).toEqual([1]);
  });

  it("reads a photo-only row as its count, never empty, and says why its photos wait (dl-uukj.47.70)", () => {
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
        next={[{ text: "", attachmentIds: ["att_1", "att_2"] }]}
        onSendNow={(i) => now.push(i)}
        onTakeNext={() => null}
      />,
    );
    const words = document.querySelector("[data-queue-words]") as HTMLElement;
    expect(words.textContent?.trim()).not.toBe("");
    expect(words.textContent).toContain("2");
    const sendNow = screen.getByRole("button", { name: "Wyślij teraz" });
    expect(sendNow.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(sendNow);
    expect(now).toEqual([]);
    expect(document.body.textContent).toContain("Zdjęcia wyślę dopiero po tej odpowiedzi.");
  });

  it("keeps a row's photos over a reload, and an old words-only queue still reads", () => {
    const { result } = renderHook(() => useNextQueue(CONVERSATION, null));
    act(() => result.current.add("", ["att_1"]));
    act(() => result.current.add("Druga"));
    const again = renderHook(() => useNextQueue(CONVERSATION, null));
    expect(again.result.current.rows).toEqual([
      { text: "", attachmentIds: ["att_1"] },
      { text: "Druga", attachmentIds: [] },
    ]);
    expect(heldQueue(CONVERSATION, null)).toEqual(["", "Druga"]);
    window.sessionStorage.setItem(
      `jw.chat.next.${CONVERSATION}`,
      JSON.stringify({ owner: null, items: ["Stara"] }),
    );
    expect(renderHook(() => useNextQueue(CONVERSATION, null)).result.current.rows).toEqual([
      { text: "Stara", attachmentIds: [] },
    ]);
  });

  it("keeps a row whose Wyślij teraz failed, and Spróbuj ponownie sends those exact words", async () => {
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    await act(async () => result.current.send("Pierwsza"));
    for (const text of ["A", "B"]) await act(async () => result.current.send(text));
    s.refuse.next = 1;
    await act(async () => result.current.sendNow(1));
    expect(result.current.state.sendFailed).toBe(true);
    expect(result.current.next).toEqual(["A", "B"]);
    await act(async () => result.current.resend());
    expect(s.sent.at(-1)).toMatchObject({ kind: "steer", text: "B" });
    expect(result.current.next).toEqual(["A"]);
  });

  it("keeps a drained row whose send failed, and waits for Spróbuj ponownie to send it", async () => {
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    await act(async () => result.current.send("Pierwsza"));
    await act(async () => result.current.send("A"));
    s.refuse.next = 1;
    await s.end(1);
    expect(said(s.sent)).toEqual(["message:Pierwsza"]);
    expect(result.current.next).toEqual(["A"]);
    await act(async () => result.current.resend());
    expect(said(s.sent)).toEqual(["message:Pierwsza", "message:A"]);
    expect(result.current.next).toEqual([]);
  });

  it("reads no other account's queue, drops it, and sign-out clears every queue", async () => {
    const key = `jw.chat.next.${CONVERSATION}`;
    window.sessionStorage.setItem(key, JSON.stringify({ owner: "acc_a", items: ["A's words"] }));
    window.sessionStorage.setItem(
      "jw.chat.next.cnv_00000000000000000000000009",
      JSON.stringify({ owner: "acc_a", items: ["more of A's"] }),
    );
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION, "acc_b"));
    await act(async () => {});
    expect(result.current.next).toEqual([]);
    expect(window.sessionStorage.getItem(key)).toBeNull();
    expect(window.sessionStorage.getItem("jw.chat.next.cnv_00000000000000000000000009")).toBeNull();
    expect(said(s.sent)).toEqual([]);

    window.sessionStorage.setItem(key, JSON.stringify({ owner: "acc_b", items: ["B's"] }));
    clearChatQueues();
    expect(window.sessionStorage.getItem(key)).toBeNull();
  });

  it("reads and drains nothing until the account is known, nor on a lesson that is not there", async () => {
    const key = `jw.chat.next.${CONVERSATION}`;
    window.sessionStorage.setItem(key, JSON.stringify({ owner: "acc_b", items: ["B's"] }));
    const s = standIn();
    const unknown = renderHook(() => useConversation(s.transport, CONVERSATION, false));
    await act(async () => {});
    expect(unknown.result.current.next).toEqual([]);
    expect(s.sent).toEqual([]);
    unknown.unmount();

    s.transport.runs = async () => {
      throw new ApiError("no such conversation", 404, null);
    };
    const missing = renderHook(() => useConversation(s.transport, CONVERSATION, "acc_b"));
    await act(async () => {});
    expect(missing.result.current.state.notFound).toBe(true);
    expect(missing.result.current.next).toEqual(["B's"]);
    expect(s.sent).toEqual([]);
  });

  it("sends no queued words once another account has signed in on another tab, and drops them", async () => {
    const s = standIn();
    const who = { now: "acc_a" as string | null };
    const whoNow = async () => who.now;
    const { result } = renderHook(() =>
      useConversation(s.transport, CONVERSATION, "acc_a", whoNow),
    );
    await act(async () => {});
    await act(async () => result.current.send("Pierwsza"));
    for (const text of ["A", "B"]) await act(async () => result.current.send(text));
    expect(result.current.next).toEqual(["A", "B"]);

    // Tab 2 signs in parent B: this tab's token is now B's.
    who.now = "acc_b";
    await act(async () => result.current.sendNow(1));
    await s.end(1);
    expect(said(s.sent)).toEqual(["message:Pierwsza"]);
    expect(result.current.next).toEqual([]);
    expect(window.sessionStorage.getItem(`jw.chat.next.${CONVERSATION}`)).toBeNull();
  });

  it("holds the queue after a failed Stop, and Spróbuj ponownie stops again, then the queue goes", async () => {
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    await act(async () => result.current.send("Pierwsza"));
    await act(async () => result.current.send("A"));
    s.refuse.next = 1;
    await act(async () => result.current.stop());
    expect(result.current.state.sendFailed).toBe(true);
    await s.end(1);
    // The failure stands: nothing drains behind it.
    expect(said(s.sent)).toEqual(["message:Pierwsza"]);
    await act(async () => result.current.resend());
    await act(async () => {});
    expect(said(s.sent)).toEqual(["message:Pierwsza", "cancel", "message:A"]);
    expect(result.current.next).toEqual([]);
  });

  it("sends a failed lesson-edit steer again on Spróbuj ponownie", async () => {
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    await act(async () => result.current.send("Pierwsza"));
    s.refuse.next = 1;
    await act(async () => {
      result.current.edit("Rodzic prosi o zmianę w kroku s02: …", ["s02"]);
    });
    expect(result.current.state.sendFailed).toBe(true);
    expect(said(s.sent)).toEqual(["message:Pierwsza"]);
    await act(async () => result.current.resend());
    expect(s.sent.at(-1)).toMatchObject({
      kind: "steer",
      source: "lesson_edit",
      question_ids: ["s02"],
      text: "Rodzic prosi o zmianę w kroku s02: …",
    });
    expect(result.current.state.sendFailed).toBe(false);
  });
});
