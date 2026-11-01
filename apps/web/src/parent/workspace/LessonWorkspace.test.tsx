// @vitest-environment happy-dom
/**
 * The lesson workspace on the engine (dl-z5ja.108, decision dl-xo0q): the first screen's words are
 * sent once, after the page reads the conversation back with no turn, and never again on a remount;
 * the turn fills the chat, its state reaches the band in words and its lesson the lesson column; a
 * route that answers AiConsentMissing puts the consent screen in the chat, and agreeing sends the
 * words again; the parent's chat has no Stop button, and Esc stops. A stand-in transport plays the
 * golden happy-turn log (@jadwigo/testing).
 */

import { ApiError } from "@jadwigo/api-client";
import { ConversationId, type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineTransport } from "../../playground/chat/useConversation.ts";
import type { SendBody } from "../../playground/chat/wire.ts";
import { firstMessage, type LessonEngine } from "./engine.ts";
import { LessonWorkspace } from "./LessonWorkspace.tsx";

const CONVERSATION = ConversationId.parse("cnv_00000000000000000000000001");
const events = (RUN_LOGS.find((l) => l.name === "happy-turn")?.events ?? []).map((e) =>
  RunEvent.parse(e),
);
const run: Run = {
  id: RunId.parse(events[0]?.run_id),
  pod_id: "pod_00000000000000000000000001" as Run["pod_id"],
  created_by: "acc_00000000000000000000000001" as Run["created_by"],
  conversation_id: CONVERSATION,
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
};

/** A new conversation (no turn) until a message is sent; then the happy turn. */
function engineWith(send: (body: SendBody) => Promise<Run> = async () => run) {
  const sent: SendBody[] = [];
  let started = false;
  const transport: EngineTransport = {
    subscribe: () => () => {},
    onConnection: () => () => {},
    runs: async () => (started ? [run] : []),
    events: async (_id, after) => events.filter((e) => e.seq > after),
    send: async (body) => {
      sent.push(body);
      const answer = await send(body);
      started = true;
      return answer;
    },
  };
  const consent = { getMe: vi.fn(), patchPod: vi.fn() };
  const engine: LessonEngine = {
    conversations: { createConversation: vi.fn() },
    transport,
    consent: consent as unknown as LessonEngine["consent"],
    ratings: null,
  };
  return { engine, sent, consent };
}

async function workspace(engine: LessonEngine): Promise<void> {
  await act(async () => {
    render(
      <LessonWorkspace
        language="pl"
        conversation={CONVERSATION}
        engine={engine}
        learners={[]}
        forLearner={null}
        onAddChild={() => {}}
        changeMenu={(trigger) => trigger}
      />,
    );
  });
}

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

describe("the lesson workspace on the engine", () => {
  it("sends the first screen's words once, then draws the turn, its state and its lesson", async () => {
    const { engine, sent } = engineWith();
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    await workspace(engine);
    expect(sent.filter((b) => b.kind === "message").map((b) => "text" in b && b.text)).toEqual([
      "Odejmowanie przez 10",
    ]);
    expect(sent[0]?.conversation_id).toBe(CONVERSATION);
    expect(window.sessionStorage.getItem(`jw.parent.first.${CONVERSATION}`)).toBeNull();
    expect(await screen.findByText("Your lesson is ready on the right.")).toBeTruthy();
    expect(screen.getByText("Wersja 2")).toBeTruthy();
    expect(
      document.querySelector("[data-chat-band] [data-status]")?.getAttribute("data-status"),
    ).toBe("completed");

    // A remount (a reload) finds the turn and sends nothing more.
    cleanup();
    await workspace(engine);
    expect(sent.filter((b) => b.kind === "message")).toHaveLength(1);
  });

  it("opens on a waiting line with no words to send, and sends nothing", async () => {
    const { engine, sent } = engineWith();
    await workspace(engine);
    expect(sent).toEqual([]);
    expect(document.querySelector("[data-lesson-waiting]")).not.toBeNull();
  });

  it("asks for the pod's consent when the route refuses, and sends the words again once given", async () => {
    let refuse = true;
    const { engine, sent, consent } = engineWith(async () => {
      if (refuse) throw new ApiError("no consent", 409, "AiConsentMissing");
      return run;
    });
    consent.getMe.mockResolvedValue({ pod: { id: "pod_00000000000000000000000001" } });
    consent.patchPod.mockResolvedValue({});
    firstMessage.put(CONVERSATION, "Odejmowanie przez 10");
    await workspace(engine);
    const agree = await screen.findByRole("button", { name: /Zgadzam/ });
    refuse = false;
    await act(async () => fireEvent.click(agree));
    expect(consent.patchPod).toHaveBeenCalled();
    expect(sent.filter((b) => b.kind === "message")).toHaveLength(2);
    expect(await screen.findByText("Your lesson is ready on the right.")).toBeTruthy();
  });

  it("gives the parent's chat no Stop button, a round send, and the composer's words", async () => {
    const { engine } = engineWith();
    await workspace(engine);
    expect(screen.queryByRole("button", { name: "Zatrzymaj" })).toBeNull();
    const box = screen.getByRole("textbox", { name: /Twoja wiadomość|Wiadomość/ });
    expect(box.getAttribute("placeholder")).toBe("Możesz pisać dalej…");
    const sendButton = document.querySelector("[data-variant=parent] [data-send]");
    expect(sendButton?.getAttribute("aria-disabled")).toBe("true");
    fireEvent.change(box, { target: { value: "Dodaj jedno zadanie" } });
    expect(sendButton?.getAttribute("aria-disabled")).toBe("false");
  });
});
