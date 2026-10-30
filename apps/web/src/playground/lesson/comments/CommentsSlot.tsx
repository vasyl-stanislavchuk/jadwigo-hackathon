/**
 * The comments on one step of the draft (dl-a38n.13): each comment with its intent, the session's
 * replies under it and a line saying where it stands, then a box for a new one. A comment goes to
 * the running Claude Code session through the jadwigo-builder channel; it never edits the lesson.
 * English chrome, as the rest of the playground's.
 */
import { cn } from "@jadwigo/ui";
import { type FormEvent, type ReactElement, useState } from "react";
import type { Ask } from "../../../../../../tools/builder/drafts.ts";
import { Badge } from "../../tool/badge.tsx";
import { Button } from "../../tool/button.tsx";
import { useAsks } from "./source.ts";
import {
  type Channel,
  REPLY_LABEL,
  STATE_LABEL,
  type Thread,
  type Tone,
  threadsFor,
  turnLine,
} from "./threads.ts";

const INTENTS: { value: Ask["intent"]; label: string; hint: string }[] = [
  { value: "change", label: "Change", hint: "Ask Claude to change this step" },
  { value: "question", label: "Question", hint: "Ask why, without changing anything" },
  { value: "note", label: "Note", hint: "Something for Claude to keep in mind" },
];

const TONE: Record<Tone, string> = {
  muted: "text-muted-foreground",
  warn: "text-jw-help-ink",
  good: "text-jw-right-ink",
};

function ThreadView({ thread, channel }: { thread: Thread; channel: Channel }): ReactElement {
  const turn = turnLine(thread, channel);
  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <Badge variant="outline">{thread.ask.intent}</Badge>
        <p className="min-w-0 whitespace-pre-wrap text-sm">{thread.ask.text}</p>
      </div>
      {thread.replies.map((reply) => (
        <div key={reply.ts} className="ml-4 flex flex-col gap-0.5 border-l-2 pl-3 text-sm">
          <span className="text-muted-foreground text-xs">{REPLY_LABEL[reply.kind]}</span>
          <p className="whitespace-pre-wrap">{reply.text}</p>
        </div>
      ))}
      <p role="status" className={cn("flex items-center gap-2 text-xs", TONE[turn.tone])}>
        <Badge variant="secondary">{STATE_LABEL[thread.state]}</Badge>
        <span>{turn.text}</span>
      </p>
    </li>
  );
}

export function CommentsSlot({
  step_id = "",
  draft_id,
}: {
  step_id?: string;
  draft_id?: string;
}): ReactElement | null {
  const { payload, send } = useAsks();
  const [intent, setIntent] = useState<Ask["intent"]>("change");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const draft = draft_id ?? payload?.newest_draft ?? null;
  if (!payload || !draft) return null;

  const threads = threadsFor(payload, draft, step_id);
  const where = step_id ? `step ${step_id}` : "the whole lesson";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft || !text.trim()) return;
    setSending(true);
    const refused = await send({ draft_id: draft, step_id, intent, text });
    setSending(false);
    setError(refused ?? "");
    if (!refused) setText("");
  }

  return (
    <section aria-label={`Comments on ${where}`} className="flex flex-col gap-2">
      {threads.length > 0 && (
        <ul className="flex flex-col gap-2">
          {threads.map((thread) => (
            <ThreadView key={thread.ask.ask_ts} thread={thread} channel={payload.channel} />
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex flex-col gap-2">
        <fieldset className="flex gap-1">
          <legend className="sr-only">What kind of comment</legend>
          {INTENTS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="xs"
              variant={intent === option.value ? "secondary" : "ghost"}
              aria-pressed={intent === option.value}
              title={option.hint}
              onClick={() => setIntent(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </fieldset>
        <textarea
          aria-label={`Comment on ${where}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={sending || !text.trim()}>
            Send to Claude
          </Button>
          {error && (
            <span role="alert" className={cn("text-xs", TONE.warn)}>
              {error}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
