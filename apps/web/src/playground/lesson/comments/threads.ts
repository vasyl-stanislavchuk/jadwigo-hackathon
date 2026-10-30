/**
 * Comments pinned to a step, as threads (dl-a38n.13): each ask with its replies, where it stands,
 * and one line saying whose turn it is, worded so the owner can act on it. md's review states
 * (share_review.py ask_state) and its turn line (md_review_client.js nextUp) are the model.
 * The payload is what apps/web/dev/ask.ts serves; the row types are the channel's own.
 */
import type { Ask, Reply } from "../../../../../../tools/builder/drafts.ts";

export type Channel = "live" | "not_loaded" | "gone";

export type AsksPayload = {
  channel: Channel;
  newest_draft: string | null;
  asks: Ask[];
  consumed: string[];
  replies: Reply[];
};

export type AskState = "sent" | "delivered" | "working" | "needs_you" | "done";

export type Thread = { ask: Ask; replies: Reply[]; state: AskState; ahead: number };

/**
 * Where an ask stands: the kind of its newest reply that is not a note (a note is a side remark,
 * so it never moves the state), else delivered once the channel consumed it, else sent.
 */
export function askState(consumed: boolean, replies: readonly Reply[]): AskState {
  const last = replies.filter((reply) => reply.kind !== "note").at(-1);
  if (last?.kind === "done") return "done";
  if (last?.kind === "question") return "needs_you";
  if (last) return "working";
  return consumed || replies.length > 0 ? "delivered" : "sent";
}

const OPEN: ReadonlySet<AskState> = new Set(["sent", "delivered", "working"]);

/**
 * The threads on one step of one draft, oldest first. `ahead` counts the open asks on the whole
 * draft sent before this one, since the session takes comments one at a time.
 */
export function threadsFor(payload: AsksPayload, draftId: string, stepId: string): Thread[] {
  const consumed = new Set(payload.consumed);
  const all = payload.asks
    .filter((ask) => ask.draft_id === draftId)
    .map((ask) => {
      const replies = payload.replies.filter(
        (reply) => reply.draft_id === draftId && reply.in_reply_to === ask.ask_ts,
      );
      return { ask, replies, state: askState(consumed.has(ask.ask_ts), replies), ahead: 0 };
    });
  return all
    .filter((thread) => thread.ask.step_id === stepId)
    .map((thread) => ({
      ...thread,
      ahead: OPEN.has(thread.state)
        ? all.filter(
            (other) =>
              other !== thread && OPEN.has(other.state) && other.ask.ask_ts < thread.ask.ask_ts,
          ).length
        : 0,
    }));
}

export type Tone = "muted" | "warn" | "good";

export const STATE_LABEL: Record<AskState, string> = {
  sent: "sent",
  delivered: "delivered",
  working: "working",
  needs_you: "needs you",
  done: "done",
};

/** Whose turn it is on a thread, in words the owner can act on. Never claims Claude saw a comment it did not. */
export function turnLine(thread: Thread, channel: Channel): { text: string; tone: Tone } {
  switch (thread.state) {
    case "done":
      return { text: "Claude answered. Comment again to reopen it.", tone: "good" };
    case "needs_you":
      return { text: "Your turn: Claude asked you something above.", tone: "warn" };
    case "sent":
      if (channel === "gone") {
        return {
          text: "Claude did not see your comment: no builder session is running. It goes to the next one make builder starts.",
          tone: "warn",
        };
      }
      if (channel === "not_loaded") {
        return {
          text: "Claude did not see your comment: the session started without the channel. Start it again with make builder.",
          tone: "warn",
        };
      }
      return {
        text:
          thread.ahead > 0
            ? `Waiting for Claude to pick it up · ${thread.ahead} ahead of yours`
            : "Waiting for Claude to pick it up",
        tone: "muted",
      };
    case "delivered":
      if (channel !== "live") {
        return {
          text: "Claude stopped without answering. Comment again to nudge it.",
          tone: "warn",
        };
      }
      return { text: "Claude's turn: reading your comment", tone: "muted" };
    case "working":
      if (channel !== "live") {
        return {
          text: "Claude stopped before it finished. Comment again to nudge it.",
          tone: "warn",
        };
      }
      return { text: "Claude's turn: working on it", tone: "muted" };
  }
}

export const REPLY_LABEL: Record<Reply["kind"], string> = {
  progress: "Progress",
  done: "Answer",
  question: "Question for you",
  note: "Note",
};
