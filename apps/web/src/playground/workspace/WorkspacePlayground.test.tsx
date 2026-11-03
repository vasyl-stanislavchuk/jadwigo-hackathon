// @vitest-environment happy-dom
/**
 * /playground/workspace (dl-uukj.47.27): the route is the playground's workspace page, a pace reads
 * from the query and rides on the send route, and the page opens the parent's workspace on its own
 * conversation with the made-up parent's first words sent once, the turn drawn in the chat and its
 * lesson in the lesson column. A stand-in transport plays the golden happy-turn log.
 */

import { type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EngineTransport } from "../../chat/useConversation.ts";
import { messagesPath, paceOf, type SendBody } from "../../chat/wire.ts";
import { playgroundRoute } from "../route.ts";
import { FIRST_WORDS } from "./fixtures.ts";
import { WorkspacePlayground } from "./WorkspacePlayground.tsx";

const events = (RUN_LOGS.find((l) => l.name === "happy-turn")?.events ?? []).map((e) =>
  RunEvent.parse(e),
);

function standIn() {
  const sent: SendBody[] = [];
  let run: Run | null = null;
  const transport: EngineTransport = {
    subscribe: () => () => {},
    onConnection: () => () => {},
    runs: async (conversation) => (run?.conversation_id === conversation ? [run] : []),
    events: async (_id, after) => events.filter((e) => e.seq > after),
    send: async (body) => {
      sent.push(body);
      run = {
        id: RunId.parse(events[0]?.run_id),
        pod_id: "pod_00000000000000000000000001" as Run["pod_id"],
        created_by: "acc_00000000000000000000000001" as Run["created_by"],
        conversation_id: body.conversation_id,
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
      return run;
    },
  };
  return { transport, sent };
}

async function open(transport: EngineTransport, query = ""): Promise<void> {
  window.history.replaceState(null, "", `/playground/workspace${query}`);
  await act(async () => {
    render(<WorkspacePlayground transport={transport} />);
  });
}

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

describe("the workspace's dev route", () => {
  it("is the playground's workspace page", () => {
    expect(playgroundRoute("/playground/workspace")).toEqual({
      family: null,
      question_type: null,
      example: null,
      page: "workspace",
    });
    expect(playgroundRoute("/playground/workspace/x")).toBeNull();
  });

  it("reads a pace from the query, and carries it on the send route", () => {
    expect(paceOf("slow")).toBe("slow");
    expect(paceOf("stall")).toBe("stall");
    expect(paceOf("fail")).toBe("fail");
    expect(paceOf("fast")).toBeNull();
    expect(paceOf(null)).toBeNull();
    expect(messagesPath(null)).toBe("/__engine/messages");
    expect(messagesPath("stall")).toBe("/__engine/messages?pace=stall");
  });

  it("plays the first words once in the chat, and a reload sends nothing more", async () => {
    const { transport, sent } = standIn();
    await open(transport);
    expect(sent.map((b) => b.kind === "message" && b.text)).toEqual([FIRST_WORDS]);
    expect(await screen.findByText("Your lesson is ready on the right.")).toBeTruthy();
    // The lesson card under the turn names the revision (dl-1eieq.1: no column beside the chat).
    expect(
      document.querySelector("[data-object-card='lesson']")?.getAttribute("data-revision"),
    ).toBe("2");
    expect(document.querySelector("[data-page='workspace'] [data-chat-body]")).not.toBeNull();
    expect(document.querySelector("[data-lesson-column]")).toBeNull();
    // No details panel (design review 2026-11-02): who and what move into the chat's widgets.
    expect(document.querySelector("[data-page='workspace'] #parent-details")).toBeNull();

    const first = sent[0]?.conversation_id;
    cleanup();
    await open(transport);
    expect(sent).toHaveLength(1);
    expect(screen.getByText("Your lesson is ready on the right.")).toBeTruthy();
    expect(first).toBeDefined();
  });

  it("keeps each pace on a conversation of its own", async () => {
    const { transport, sent } = standIn();
    await open(transport);
    cleanup();
    await open(transport, "?pace=stall");
    expect(sent).toHaveLength(2);
    expect(sent[0]?.conversation_id).not.toBe(sent[1]?.conversation_id);
  });
});
