// @vitest-environment happy-dom
/**
 * Photos in the queue (dl-uukj.47.71.9, closes the rest of dl-uukj.47.70): a message with photos
 * sent while a turn runs waits in the tab with its photos instead of going at once; its row reads
 * the photo count; Wyślij teraz leaves it waiting while the turn runs (a steer carries no
 * photos); once the turn ends it goes as its own turn with its attachment_ids. The stand-in
 * transport is queue.test.tsx's.
 */

import { AttachmentId, ID_PREFIXES, idOf, LearnerId } from "@jadwigo/contracts";
import { ConversationId, type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ChatPane } from "./ChatPane.tsx";
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

const PHOTO = AttachmentId.parse(
  idOf(ID_PREFIXES.attachment, "0b8f4c3e-6a1d-4f2b-9c7e-1d2e3f4a5b6c"),
);

const OLA = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
const JAS = LearnerId.parse("lrn_3k5n9hzx1gc2dw03pmrx1qy9gr");

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

describe("photos in the queue (dl-uukj.47.71.9)", () => {
  it("queues a photo-only message sent mid-turn, and the drain sends its attachment_ids", async () => {
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    await act(async () => result.current.send("Pierwsza"));
    await act(async () => result.current.send("", undefined, [PHOTO]));
    expect(said(s.sent)).toEqual(["message:Pierwsza"]);
    expect(result.current.nextRows).toEqual([{ text: "", attachmentIds: [PHOTO] }]);

    await s.end(1);
    expect(said(s.sent)).toEqual(["message:Pierwsza", "message:"]);
    expect(s.sent.at(-1)).toMatchObject({ kind: "message", attachment_ids: [PHOTO] });
    expect(result.current.nextRows).toEqual([]);
  });

  it("a queued photo goes with the child Dla named when it was sent, over a reload", async () => {
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    // The turn runs for Ola; mid-turn the parent switches Dla to Jaś and sends his worksheet.
    await act(async () => result.current.send("Lekcja dla Oli", { learner_id: OLA }));
    await act(async () => result.current.send("", { learner_id: JAS }, [PHOTO]));
    expect(result.current.nextRows).toEqual([
      { text: "", attachmentIds: [PHOTO], context: { learner_id: JAS } },
    ]);
    // A reload keeps the row's child with its photo: the tab holds it beside the row.
    const held = JSON.parse(window.sessionStorage.getItem(`jw.chat.next.${CONVERSATION}`) ?? "{}");
    expect(held).toMatchObject({ items: [""], contexts: [{ learner_id: JAS }] });

    await s.end(1);
    expect(s.sent.at(-1)).toMatchObject({
      kind: "message",
      attachment_ids: [PHOTO],
      context: { learner_id: JAS },
    });
  });

  it("Wyślij teraz on a words row keeps the photo row with the same words", async () => {
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    await act(async () => result.current.send("Pierwsza"));
    await act(async () => result.current.send("to", undefined, [PHOTO]));
    await act(async () => result.current.send("to"));
    await act(async () => result.current.sendNow(1));
    expect(said(s.sent)).toEqual(["message:Pierwsza", "steer:to"]);
    // The row that went leaves; the photo row with the same words still waits, and still goes.
    expect(result.current.nextRows).toEqual([{ text: "to", attachmentIds: [PHOTO] }]);
    await s.end(1);
    expect(s.sent.at(-1)).toMatchObject({ kind: "message", text: "to", attachment_ids: [PHOTO] });
  });

  it("leaves a photo row waiting on Wyślij teraz while the turn runs: a steer carries no photos", async () => {
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    await act(async () => result.current.send("Pierwsza"));
    await act(async () => result.current.send("Z tego zdjęcia", undefined, [PHOTO]));
    await act(async () => result.current.sendNow(0));
    expect(said(s.sent)).toEqual(["message:Pierwsza"]);
    expect(result.current.next).toEqual(["Z tego zdjęcia"]);
  });

  it("draws the queued photo row with its count, never empty, in the pane", async () => {
    const s = standIn();
    const { result } = renderHook(() => useConversation(s.transport, CONVERSATION));
    await act(async () => {});
    await act(async () => result.current.send("Pierwsza"));
    await act(async () => result.current.send("", undefined, [PHOTO]));
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
        next={result.current.nextRows}
        onSendNow={() => {}}
        onTakeNext={() => null}
      />,
    );
    const words = document.querySelector("[data-queue-words]") as HTMLElement;
    expect(words.textContent?.trim()).not.toBe("");
    expect(words.textContent).toContain("1");
    expect(document.querySelector("[data-next-row]")?.getAttribute("data-photos")).toBe("1");
  });
});
