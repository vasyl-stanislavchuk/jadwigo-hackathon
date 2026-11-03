/**
 * The chat's composer (split from ChatPane.tsx, dl-uukj.47.71.1, no change in behaviour): the
 * parent's one rounded box with Dla and Wyślij, the playground's field with Stop, and the choose
 * form in its place while the turn asks. Lane D of wave dl-uukj.47.71 owns it.
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ChatItem } from "@jadwigo/core";
import { Button } from "@jadwigo/ui";
import { ArrowRightIcon } from "lucide-react";
import type { FormEvent, ReactElement, ReactNode, RefObject } from "react";
import { type ChooseAnswers, ChooseForm } from "./ChooseForm.tsx";
import "./chat.css";
import { isOpen, type Turn } from "./conversation.ts";

type ApprovalItem = Extract<ChatItem, { kind: "approval" }>;

/** The open turn's last approval when it asks a choose form not yet answered here, else null. */
export function openChoose(
  turns: readonly Turn[],
  chosen: Readonly<Record<string, ChooseAnswers>>,
): { call_id: string; choose: NonNullable<ApprovalItem["choose"]> } | null {
  const last = turns.at(-1);
  if (last === undefined || !isOpen(last)) return null;
  const approval = last.view.chat.findLast((i): i is ApprovalItem => i.kind === "approval");
  if (approval?.choose === undefined || approval.decision !== null) return null;
  if (chosen[approval.call_id] !== undefined) return null;
  return { call_id: approval.call_id, choose: approval.choose };
}

export interface ComposerProps {
  language: Language;
  parent: boolean;
  asking: ReturnType<typeof openChoose>;
  onAnswer(answers: ChooseAnswers): void;
  draft: string;
  setDraft(text: string): void;
  send(text: string): void;
  open: boolean;
  stopping: boolean;
  onStop(): void;
  composerLead?: ReactNode;
  textarea: RefObject<HTMLTextAreaElement>;
}

export function Composer({
  language,
  parent,
  asking,
  onAnswer,
  draft,
  setDraft,
  send,
  open,
  stopping,
  onStop,
  composerLead,
  textarea: composer,
}: ComposerProps): ReactElement {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };
  return asking !== null ? (
    <ChooseForm key={asking.call_id} form={asking.choose} language={language} onAnswer={onAnswer} />
  ) : parent ? (
    // The parent's composer, Claude-like (design review 2026-11-02): one rounded box, the words
    // on top, then Dla on the left and an explicit Wyślij on the right.
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-jw-box border-jw border-input bg-background px-3 pt-3 pb-2 transition-[border-color,box-shadow] duration-jw-fast focus-within:border-jw-focus focus-within:ring-2 focus-within:ring-selected"
      data-composer
    >
      <label className="flex flex-col">
        <span className="sr-only">{say("chat_composer_label")}</span>
        <textarea
          ref={composer}
          value={draft}
          rows={3}
          placeholder={say("parent_composer")}
          className="resize-none border-0 bg-transparent text-jw-page-body text-jw-ink outline-none placeholder:text-jw-placeholder"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
            // Stop from the keyboard, where the parent already is (dl-z5ja.28).
            if (e.key === "Escape" && open && !stopping) {
              e.preventDefault();
              onStop();
            }
          }}
        />
      </label>
      <div className="flex items-center gap-2">
        {composerLead}
        <span className="flex-1" />
        {/* The design system's action, as the first screen's "Zrób lekcję": quiet while empty. */}
        <Button type="submit" size="control" aria-disabled={draft.trim() === ""} data-send>
          {say("chat_send")}
          <ArrowRightIcon aria-hidden />
        </Button>
      </div>
    </form>
  ) : (
    <form onSubmit={submit} className="flex items-end gap-2">
      <label className="flex flex-1 flex-col gap-1 text-jw-page-body">
        <span>{say("chat_composer_label")}</span>
        <textarea
          ref={composer}
          value={draft}
          rows={2}
          className="rounded-jw-control border-jw border-input bg-background px-2.5 py-2 text-jw-page-body text-foreground outline-none focus-visible:border-jw-focus focus-visible:ring-2 focus-visible:ring-selected"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
            // Stop from the keyboard, where the parent already is (dl-z5ja.28).
            if (e.key === "Escape" && open && !stopping) {
              e.preventDefault();
              onStop();
            }
          }}
        />
      </label>
      <Button type="submit" size="control">
        {say("chat_send")}
      </Button>
      {open && (
        <Button type="button" variant="outline" size="control" disabled={stopping} onClick={onStop}>
          {stopping ? say("chat_stopping") : say("chat_stop")}
        </Button>
      )}
    </form>
  );
}
