/**
 * The lesson builder at /playground/lesson (dl-a38n): the newest draft in JADWIGO_DRAFTS_DIR,
 * part by part and step by step, drawn in the kit's preview mode with the check's findings
 * pinned to each step, and above them the step table with one row per step (table/). The draft arrives over Vite's HMR socket from dev/draft-watch.ts
 * (`builder:draft`, draft.ts), and the page redraws on every change with no reload. Lane web
 * fills the draft and the steps (adapter.ts, StepCard.tsx), lane bridge fills comments/ and
 * activity/ through the two slots.
 *
 * Keys are visible here, behind a switch that starts off (lead decision 8). Nothing here reaches
 * the API: the page reads only what the dev server sends.
 */
import type { Category, Language } from "@jadwigo/copy";
import { type ReactElement, useEffect, useState } from "react";
import { Label } from "../tool/label.tsx";
import { Switch } from "../tool/switch.tsx";
import { lessonFileToSpecs } from "./adapter.ts";
import {
  BUILDER_DRAFT,
  BUILDER_HELLO,
  type DraftMessage,
  type HelloMessage,
  readDraft,
} from "./draft.ts";
import { SkippedCard, StepCard } from "./StepCard.tsx";
import { ActivitySlot, CommentsSlot } from "./slots.ts";
import { FindingList } from "./table/FindingList.tsx";
import { findingsOf } from "./table/findings.ts";
import { stepRows } from "./table/model.ts";
import { StepTable } from "./table/StepTable.tsx";

export const LESSON_BUILDER_PATH = "/playground/lesson";

/** The draft the dev server sends, and a pick that asks it for another; `message` is null until
 * the first one arrives, and stays null outside `vite` serve. */
function useDraft(): { message: DraftMessage | null; pick(draft_id: string): void } {
  const [message, setMessage] = useState<DraftMessage | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    const hot = import.meta.hot;
    if (hot === undefined) return;
    const hello = () => hot.send(BUILDER_HELLO, { draft_id: picked } satisfies HelloMessage);
    const onDraft = (m: DraftMessage) => setMessage((prev) => keepDrawn(prev, m));
    hot.on(BUILDER_DRAFT, onDraft);
    hot.on("vite:ws:connect", hello);
    hello();
    return () => {
      hot.off(BUILDER_DRAFT, onDraft);
      hot.off("vite:ws:connect", hello);
    };
  }, [picked]);
  return { message, pick: setPicked };
}

/** A message whose draft or check could not be read keeps the last one read of the same draft,
 * so a half-written file never blanks the page. */
export function keepDrawn(prev: DraftMessage | null, next: DraftMessage): DraftMessage {
  if (next.error === null || prev === null || prev.draft_id !== next.draft_id) return next;
  return { ...next, draft: next.draft ?? prev.draft, check: next.check ?? prev.check };
}

const languageOf = (raw: unknown): Language => (raw === "en" ? "en" : "pl");
const categoryOf = (raw: unknown): Category => (raw === "adult" ? "adult" : "child");

/** The draft drawn: its parts and steps, or why it cannot be drawn yet. */
function LessonDraft({
  message,
  showKey,
}: {
  message: DraftMessage;
  showKey: boolean;
}): ReactElement {
  if (message.draft_id === null)
    return (
      <p className="text-muted-foreground">
        No draft yet in <code>{message.dir}</code>. Ask for a lesson through the jadwigo MCP, and it
        appears here as it is drafted.
      </p>
    );
  const { draft_id } = message;
  const read = readDraft(message.draft);
  if ("error" in read)
    return (
      <p role="alert" className="text-muted-foreground">
        {message.draft_id} cannot be drawn yet: {read.error}.
      </p>
    );
  const { file, skipped } = read;
  const language = languageOf(file.language);
  const category = categoryOf(file.category);
  const parts = lessonFileToSpecs(file, undefined, skipped);
  const findings = findingsOf(message.check);
  const of = (step_id: string) => findings.filter((f) => f.step_id === step_id);
  let n = 0;
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-base font-medium">{file.title}</h2>
      <FindingList findings={findings.filter((f) => f.step_id === null)} label="Lesson findings" />
      <StepTable rows={stepRows(parts, findings)} showKey={showKey} />
      {parts.map(({ part, steps }, i) => (
        <section
          // A part's name may repeat in a draft; its place does not.
          key={`${i}-${part}`}
          aria-label={`Part ${part}`}
          className="flex flex-col gap-4"
        >
          <h3 className="text-muted-foreground text-sm uppercase tracking-wide">{part}</h3>
          {steps.length === 0 && (
            <p className="text-muted-foreground text-xs">Teaching steps only: nothing to draw.</p>
          )}
          {steps.map((step) => {
            n += 1;
            return step.kind === "question" ? (
              <StepCard
                key={step.step_id}
                draft_id={draft_id}
                n={n}
                spec={step.spec}
                findings={of(step.step_id)}
                showKey={showKey}
                language={language}
                category={category}
              />
            ) : (
              <SkippedCard
                key={step.step_id}
                draft_id={draft_id}
                step_id={step.step_id}
                reason={step.reason}
                findings={of(step.step_id)}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}

export function LessonBuilderScreen({
  initial = null,
}: {
  /** A message to draw before the dev server sends one (the tests). */
  initial?: DraftMessage | null;
} = {}): ReactElement {
  const live = useDraft();
  const message = live.message ?? initial;
  const [showKey, setShowKey] = useState(false);
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-8">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-lg font-medium">Lesson builder</h1>
        {message !== null && message.drafts.length > 1 && (
          <label className="flex items-center gap-2 text-sm">
            Draft
            <select
              className="rounded-md border bg-background px-2 py-1"
              value={message.draft_id ?? ""}
              onChange={(e) => live.pick(e.target.value)}
            >
              {message.drafts.map((d) => (
                <option key={d.draft_id} value={d.draft_id}>
                  {d.title === "" ? d.draft_id : `${d.title} (${d.draft_id})`}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Switch id="builder-show-key" size="sm" checked={showKey} onCheckedChange={setShowKey} />
          <Label htmlFor="builder-show-key" className="text-xs">
            Show the key
          </Label>
        </div>
      </header>
      {message !== null && message.error !== null && (
        <p role="status" className="text-muted-foreground text-sm">
          The last change could not be read ({message.error}); showing what was read.
        </p>
      )}
      {message === null ? (
        <p className="text-muted-foreground">
          No draft yet. Ask for a lesson through the jadwigo MCP, and it appears here as it is
          drafted.
        </p>
      ) : (
        <LessonDraft message={message} showKey={showKey} />
      )}
      <CommentsSlot
        {...(message === null || message.draft_id === null ? {} : { draft_id: message.draft_id })}
      />
      <ActivitySlot />
    </div>
  );
}
