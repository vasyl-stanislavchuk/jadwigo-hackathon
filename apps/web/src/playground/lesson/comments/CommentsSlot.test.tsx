import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CommentsSlot } from "../slots.ts";
import { AsksProvider, type AsksSource, type NewAsk } from "./source.ts";
import type { AsksPayload } from "./threads.ts";

const ASK = {
  ask_ts: "2026-10-30T09:00:00.000Z",
  draft_id: "d-add-to-20",
  step_id: "q2",
  intent: "change" as const,
  text: "Make the boost one sentence.",
  author: "owner",
};

afterEach(cleanup);

function payload(extra: Partial<AsksPayload> = {}): AsksPayload {
  return {
    channel: "live",
    newest_draft: "d-add-to-20",
    asks: [ASK],
    consumed: [ASK.ask_ts],
    replies: [],
    ...extra,
  };
}

function renderWith(value: AsksPayload, send: AsksSource["send"] = async () => null) {
  return render(
    <AsksProvider source={{ payload: value, send }}>
      <CommentsSlot step_id="q2" />
    </AsksProvider>,
  );
}

describe("CommentsSlot", () => {
  it("shows a step's comment, the reply under it and the state line", () => {
    renderWith(
      payload({
        replies: [
          {
            ts: "2026-10-30T09:00:20.000Z",
            draft_id: "d-add-to-20",
            in_reply_to: ASK.ask_ts,
            kind: "progress",
            text: "Shortening the boost on q2.",
          },
        ],
      }),
    );
    const comments = screen.getByRole("region", { name: "Comments on step q2" });
    expect(within(comments).getByText("Make the boost one sentence.")).toBeTruthy();
    expect(within(comments).getByText("Shortening the boost on q2.")).toBeTruthy();
    const status = within(comments).getByRole("status");
    expect(status.textContent).toContain("working");
    expect(status.textContent).toContain("Claude's turn: working on it");
  });

  it("says plainly that Claude did not see a comment when no session is running", () => {
    renderWith(payload({ channel: "gone", consumed: [] }));
    expect(screen.getByRole("status").textContent).toContain("Claude did not see your comment");
  });

  it("asks the owner when the reply is a question, and keeps a note from moving the state", () => {
    const reply = (ts: string, kind: "question" | "note", text: string) => ({
      ts,
      draft_id: "d-add-to-20",
      in_reply_to: ASK.ask_ts,
      kind,
      text,
    });
    renderWith(
      payload({
        replies: [
          reply("2026-10-30T09:01:00.000Z", "question", "One sentence or two words?"),
          reply("2026-10-30T09:01:05.000Z", "note", "q3 has the same boost."),
        ],
      }),
    );
    expect(screen.getByRole("status").textContent).toContain("needs you");
  });

  it("leaves another step's comments out", () => {
    renderWith(payload({ asks: [{ ...ASK, step_id: "q3" }] }));
    expect(screen.queryByText("Make the boost one sentence.")).toBeNull();
  });

  it("sends a comment with its intent and shows a refusal", async () => {
    const sent: NewAsk[] = [];
    renderWith(payload({ asks: [] }), async (ask) => {
      sent.push(ask);
      return "one comment every 2 seconds; send it again in a moment";
    });
    fireEvent.click(screen.getByRole("button", { name: "Question" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Comment on step q2" }), {
      target: { value: "Why this set?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send to Claude" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("2 seconds"));
    expect(sent).toEqual([
      { draft_id: "d-add-to-20", step_id: "q2", intent: "question", text: "Why this set?" },
    ]);
  });

  it("draws nothing before there is a draft", () => {
    const { container } = renderWith(payload({ newest_draft: null }));
    expect(container.innerHTML).toBe("");
  });
});
