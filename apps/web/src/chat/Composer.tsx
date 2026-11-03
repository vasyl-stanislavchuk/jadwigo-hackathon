/**
 * The chat's composer (handoff dl-uukj.47.71 §4.5, S6, S12, S22; lane D of wave dl-uukj.47.71).
 *
 * The parent's box: the words on top, then Dla on the left, Zatrzymaj while a turn runs and Wyślij
 * on the right. It draws one focus ring (S22, fixes dl-uukj.47.73): the box's border and the DS
 * halo while the words have focus, the textarea none of its own, and a button its own halo only.
 * Zatrzymaj is outline with a square; once pressed it reads "Zatrzymuję…" with a spinner at the
 * same width until the engine says the turn is cancelled. Esc does the same from the box
 * (useStopKey; the thread mounts its own). Wyślij is the primary with words, and quiet with its
 * reason when there are none. On a phone both are 40 px squares named for screen readers.
 * When a turn ends, stops or fails, the focus stays in the composer (§3).
 *
 * The choose form takes the box's place while the turn asks (S12). The playground keeps its plain
 * field with Stop beside it.
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ChatItem } from "@jadwigo/core";
import { Button, cn, Kbd, Spinner, Tooltip, TooltipContent, TooltipTrigger } from "@jadwigo/ui";
import { SendIcon, SquareIcon } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { type ChooseAnswers, ChooseForm } from "./ChooseForm.tsx";
import "./chat.css";
import { isOpen, type Turn } from "./conversation.ts";
import { useStopKey } from "./useStopKey.ts";

/** The key cap in Zatrzymaj's tooltip: the key's own name, the same in every language. */
const STOP_KEY = "Esc";

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

/**
 * Back to the words once a turn ends, stops or fails (§3), when the focus was lost (Zatrzymaj
 * left with the turn) or was in the composer already; never away from wherever else the parent is.
 */
function useFocusAfterTurn(
  open: boolean,
  box: RefObject<HTMLElement | null>,
  words: RefObject<HTMLTextAreaElement>,
): void {
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open) {
      const at = document.activeElement;
      const lost = at === null || at === document.body;
      if (lost || (box.current?.contains(at) ?? false))
        words.current?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open, box, words]);
}

/** Zatrzymaj, and Zatrzymuję… at the same width once pressed (§4.5, components-states). */
function StopButton({
  language,
  stopping,
  onStop,
}: {
  language: Language;
  stopping: boolean;
  onStop(): void;
}): ReactElement {
  const say = (key: CopyKey) => copy(language, key, {}, "adult");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="control"
          // Pressed once is enough: it stays focusable and says what it is doing.
          aria-disabled={stopping}
          onClick={() => !stopping && onStop()}
          className="max-sm:size-10 max-sm:px-0"
          data-stop
          data-stopping={stopping}
        >
          {stopping ? (
            <Spinner label={say("chat_stopping")} className="size-4" />
          ) : (
            <SquareIcon aria-hidden />
          )}
          {/* Both words in one cell: the button keeps the wider one's width as it swaps. */}
          <span className="grid max-sm:sr-only">
            <span className={cn("col-start-1 row-start-1", stopping && "invisible")}>
              {say("chat_stop")}
            </span>
            <span
              aria-hidden={!stopping}
              className={cn("col-start-1 row-start-1", !stopping && "invisible")}
            >
              {say("chat_stopping")}
            </span>
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {say("chat_stop")} · <Kbd>{STOP_KEY}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Wyślij: the primary with words; quiet with its reason without (§4.5, DS S5), as DisabledReason
 * draws it. It is one button throughout, so typing the first word never swaps it out from under
 * the parent: only aria-disabled and the reason change.
 */
function SendButton({ language, empty }: { language: Language; empty: boolean }): ReactElement {
  const say = (key: CopyKey) => copy(language, key, {}, "adult");
  const reasonId = useId();
  const [asked, setAsked] = useState(false);
  return (
    // An empty press is stopped on its way down, before the form's submit.
    <span
      className="inline-flex flex-col items-end gap-1"
      onClickCapture={empty ? (e) => e.preventDefault() : undefined}
    >
      <Tooltip open={empty && asked} onOpenChange={setAsked}>
        <TooltipTrigger asChild>
          <Button
            type="submit"
            size="control"
            aria-disabled={empty}
            aria-describedby={empty ? reasonId : undefined}
            className="max-sm:size-10 max-sm:px-0"
            data-send
          >
            <span className="max-sm:sr-only">{say("chat_send")}</span>
            <SendIcon aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{say("chat_send_disabled")}</TooltipContent>
      </Tooltip>
      {empty && (
        <span
          id={reasonId}
          className="hidden text-jw-page-small text-muted-foreground pointer-coarse:block"
        >
          {say("chat_send_disabled")}
        </span>
      )}
    </span>
  );
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
  const box = useRef<HTMLFormElement>(null);
  useStopKey(box, { running: open, stopping, onStop });
  useFocusAfterTurn(open, box, composer);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };
  const enterSends = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(draft);
    }
  };
  return asking !== null ? (
    <ChooseForm key={asking.call_id} form={asking.choose} language={language} onAnswer={onAnswer} />
  ) : parent ? (
    <form
      ref={box}
      onSubmit={submit}
      // One ring (S22): the box's border and halo while the words have focus. A button inside
      // draws only its own halo, so focus-within would draw two.
      className="flex flex-col gap-2 rounded-jw-box border-jw border-input bg-background px-3 pt-2.5 pb-2.5 transition-[border-color,box-shadow] duration-jw-fast has-[textarea:focus]:border-primary has-[textarea:focus]:ring-3 has-[textarea:focus]:ring-ring/30"
      data-composer
    >
      <label className="flex flex-col">
        <span className="sr-only">{say("chat_composer_label")}</span>
        <textarea
          ref={composer}
          value={draft}
          rows={2}
          placeholder={say("parent_composer")}
          // No ring of its own: the adult halo on a focused textarea is the second ring (S22).
          className="resize-none border-0 bg-transparent text-jw-page-body text-jw-ink outline-none placeholder:text-jw-placeholder focus-visible:[box-shadow:none] max-sm:text-base"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={enterSends}
          data-composer-words
        />
      </label>
      <div className="flex items-center gap-2">
        {composerLead}
        <span className="flex-1" />
        {open && <StopButton language={language} stopping={stopping} onStop={onStop} />}
        <SendButton language={language} empty={draft.trim() === ""} />
      </div>
    </form>
  ) : (
    <form ref={box} onSubmit={submit} className="flex items-end gap-2">
      <label className="flex flex-1 flex-col gap-1 text-jw-page-body">
        <span>{say("chat_composer_label")}</span>
        <textarea
          ref={composer}
          value={draft}
          rows={2}
          className="rounded-jw-control border-jw border-input bg-background px-2.5 py-2 text-jw-page-body text-foreground outline-none focus-visible:border-jw-focus focus-visible:ring-2 focus-visible:ring-selected"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={enterSends}
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
