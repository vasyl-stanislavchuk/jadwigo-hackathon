/**
 * The lesson card under a turn that wrote the lesson (dl-uukj.47.58; chat handoff dl-uukj.47.71
 * §4.4, S7, S16). One card a parent reads in 2 seconds, in one of 4 states:
 *
 *   ready       "Lekcja gotowa": title, questions, version, the first question, the actions
 *   fix         "Lekcja do poprawy": the check's findings, Daj lekcję quiet with its reason, and
 *               Popraw za mnie, which sends a fix request as a new turn. A lesson with no step to
 *               show is this, never "Lekcja gotowa" over "0 zadań" (dl-uukj.47.69)
 *   working     "Wersja {n} · Jadwigo robi wersję {n+1}": the actions still give version n
 *   superseded  one row, "{title} · wersja {n} · jest nowsza", with no actions (S7)
 *
 * Only the living card (the newest version) has actions. Every fact is read from the lesson's own
 * revision, never from Jadwigo AI's words, so the card and the preview never disagree. Its expand
 * button opens the lesson in the preview over the chat (decision 2026-11-03-the-lesson-opens-in-a-
 * preview-modal-from-an-expand-button-on-the).
 *
 * The state comes from the run (`state`, lane A's fold). A caller that has only the revision gets
 * ready or fix from it; only the run says which card is superseded.
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ChatItem, RunView } from "@jadwigo/core";
import { Button, DisabledReason, Tooltip, TooltipContent, TooltipTrigger } from "@jadwigo/ui";
import { AlertCircleIcon, BookOpenIcon, LoaderIcon, Maximize2Icon, PencilIcon } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import type { Turn } from "../conversation.ts";
import { lessonFileToSpecs } from "../lesson/adapter.ts";
import { readDraft, titleOf } from "../lesson/readDraft.ts";
import type { LessonCardState } from "../spine/types.ts";
import type { ObjectRef } from "./ref.ts";

type LessonAt = NonNullable<RunView["lesson"]>;

/** What the card says about one revision of the lesson. */
export interface LessonFacts {
  title: string;
  revision: number;
  /** How many question steps the lesson holds. */
  steps: number;
  /** The first question's words, or null when the lesson has none that read. */
  first: string | null;
}

/** The card's facts from a revision's lesson file: empty counts while the draft does not read. */
export function lessonFacts(lesson: LessonAt): LessonFacts {
  const title = titleOf(lesson.lesson_file);
  const read = readDraft(lesson.lesson_file);
  if ("error" in read) return { title, revision: lesson.revision, steps: 0, first: null };
  const questions = lessonFileToSpecs(read.file, undefined, read.skipped)
    .flatMap((p) => p.steps)
    .flatMap((s) => (s.kind === "question" ? [s] : []));
  const say = questions.find((q) => q.spec.say.trim() !== "")?.spec.say.trim() ?? null;
  return { title, revision: lesson.revision, steps: questions.length, first: say };
}

/** The verbs whose finished call means the turn wrote the lesson for the parent to look at. */
const WROTE: ReadonlySet<string> = new Set(["lesson_draft", "lesson_edit"]);

/**
 * Whether a finished turn earns the card: it holds a lesson revision that Jadwigo AI's lesson_draft
 * or lesson_edit wrote. A turn that only carried the parent's own edit from the column has none.
 */
export function wroteLesson(view: RunView): boolean {
  return (
    view.lesson !== null &&
    view.chat.some(
      (item: ChatItem) => item.kind === "tool" && WROTE.has(item.verb) && item.state === "done",
    )
  );
}

/**
 * The version a running turn is writing, for the preview's band (S20): while the open turn's
 * lesson_draft or lesson_edit call runs, the revision after the one shown; else undefined.
 */
export function comingVersion(turns: readonly Turn[]): number | undefined {
  const turn = turns.at(-1);
  if (turn === undefined || !turn.view.turn_open) return undefined;
  const writing = turn.view.chat.some(
    (item) =>
      item.kind === "tool" &&
      WROTE.has(item.verb) &&
      (item.state === "pending" || item.state === "running"),
  );
  if (!writing) return undefined;
  const shown = turns.findLast((t) => t.view.lesson !== null)?.view.lesson ?? null;
  return (shown?.revision ?? 0) + 1;
}

/**
 * The state of a card drawn from its revision alone: ready, or needing a fix when no step reads
 * (never "0 zadań"). Which card is superseded is the run's to say, so this never says it.
 */
function stateFrom(lesson: LessonAt, lessonId: string): LessonCardState {
  const facts = lessonFacts(lesson);
  const base = { lessonId, version: facts.revision, title: facts.title };
  if (facts.steps === 0 || facts.first === null)
    return { ...base, kind: "fix", count: facts.steps, findings: [] };
  return { ...base, kind: "ready", count: facts.steps, first: facts.first };
}

/** The label above the title, and the icon in the tile beside it, by state. */
const LABEL: Readonly<Record<Exclude<LessonCardState["kind"], "superseded">, CopyKey>> = {
  ready: "card_ready",
  fix: "card_fix",
  working: "card_working",
};

/** Where the card's state comes from: the run's fold, or the revision alone. */
type Source = { state: LessonCardState } | { lesson: LessonAt };

export function LessonCard({
  object,
  language,
  onOpen,
  actions,
  onFix,
  onOpenVersion,
  ...source
}: Source & {
  /** The lesson as a thing to open: its conversation. */
  object: ObjectRef;
  language: Language;
  onOpen: (object: ObjectRef) => void;
  /** The lesson's actions in the living card's foot (dl-uukj.47.55, dl-1eieq.1). */
  actions?: ReactNode;
  /** Popraw za mnie: sends a fix request as a new turn; not drawn without it. */
  onFix?: (() => void) | undefined;
  /** Otwórz tę wersję on a superseded row; not drawn without it (dl-uukj.47.63). */
  onOpenVersion?: (() => void) | undefined;
}): ReactElement {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const state = "state" in source ? source.state : stateFrom(source.lesson, object.id);
  const title = state.title === "" ? say("parent_new_lesson") : state.title;

  if (state.kind === "superseded")
    return (
      <section
        aria-label={say("chat_lesson_card")}
        className="flex min-h-9 items-center gap-2 rounded-jw-box border-jw border-jw-line bg-jw-card px-3.5 py-1 text-jw-page-small"
        data-object-card="lesson"
        data-card-state="superseded"
        data-revision={state.version}
      >
        <BookOpenIcon aria-hidden className="size-3.5 shrink-0 text-jw-ink-soft" />
        <span className="truncate font-medium text-jw-ink" data-card-title>
          {title}
        </span>
        <span className="shrink-0 text-jw-ink-soft tabular-nums" data-card-facts>
          {say("card_superseded", { n: state.version })}
        </span>
        {onOpenVersion !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={onOpenVersion}
            data-open-version
          >
            {say("card_open_version")}
          </Button>
        )}
      </section>
    );

  const label =
    state.kind === "working"
      ? say(LABEL.working, { n: state.version, next: state.nextVersion })
      : say(LABEL[state.kind]);
  const Icon =
    state.kind === "fix" ? AlertCircleIcon : state.kind === "working" ? LoaderIcon : BookOpenIcon;
  const openName = say("chat_lesson_card_open_named", { title });
  return (
    <section
      aria-label={label}
      className="flex flex-col overflow-hidden rounded-jw-card border-jw border-jw-line bg-jw-card"
      data-object-card="lesson"
      data-card-state={state.kind}
      data-revision={state.version}
    >
      <div className="flex w-full items-start gap-3 px-4 py-3">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-jw-small bg-jw-hover"
        >
          <Icon
            className={
              state.kind === "working"
                ? "size-4 text-primary motion-safe:animate-spin"
                : "size-4 text-jw-ink"
            }
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-jw-page-small font-medium text-jw-ink-soft" data-card-label>
            {label}
          </span>
          <span className="truncate text-base font-semibold text-jw-ink" data-card-title>
            {title}
          </span>
          <span className="text-jw-page-small text-jw-ink-soft tabular-nums" data-card-facts>
            {/* Never "0 zadań": a lesson with nothing to show says only its version. */}
            {state.count > 0 && `${say("chat_lesson_card_steps", { n: state.count })} · `}
            {say("chat_lesson_revision", { n: state.version })}
          </span>
          {state.kind !== "fix" && state.first !== "" && (
            <span className="truncate text-jw-page-small text-jw-ink-soft" data-card-first>
              {say("chat_lesson_card_first", { say: state.first })}
            </span>
          )}
        </div>
        {/* The one way into the lesson: the preview opens over the chat, never beside it. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onOpen(object)}
              aria-label={openName}
              className="size-8 min-h-8 min-w-8"
              data-open-object={`${object.kind}:${object.id}`}
              data-expand
            >
              <Maximize2Icon aria-hidden className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{say("chat_lesson_card_open")}</TooltipContent>
        </Tooltip>
      </div>
      {state.kind === "fix" && state.findings.length > 0 && (
        <ul
          className="flex flex-col gap-1.5 border-t-jw border-jw-line py-3 pr-4 pl-4 text-jw-page-small text-jw-ink sm:pl-15"
          data-card-findings
        >
          {state.findings.map((finding) => (
            <li
              key={`${finding.step}-${finding.words.copyKey}`}
              className="flex items-start gap-2"
              data-finding={finding.step}
            >
              <AlertCircleIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <span className="font-semibold">{`${say("print_task", { n: finding.step })}.`}</span>{" "}
                {say(finding.words.copyKey, { ...finding.words.values })}
              </span>
            </li>
          ))}
        </ul>
      )}
      {state.kind === "fix" ? (
        <FixFoot say={say} count={state.findings.length} onFix={onFix} />
      ) : (
        actions !== undefined && (
          <div
            className="flex flex-wrap items-center gap-2 border-t-jw border-jw-line bg-jw-side px-4 py-2.5"
            data-card-actions
          >
            {actions}
          </div>
        )
      )}
    </section>
  );
}

/**
 * The foot of a lesson that needs fixing (§4.4): the reason, Daj lekcję quiet with the same reason
 * as its tooltip (never `disabled`, DS S5), and Popraw za mnie as the one primary.
 */
function FixFoot({
  say,
  count,
  onFix,
}: {
  say: (key: CopyKey, vars?: Record<string, string | number>) => string;
  count: number;
  onFix: (() => void) | undefined;
}): ReactElement {
  const reason = say("card_fix_reason");
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-t-jw border-jw-line bg-jw-side px-4 py-2.5"
      data-card-actions
      data-fix-foot
    >
      <p className="mr-auto text-jw-page-small text-jw-ink-soft" data-fix-reason>
        {reason}
      </p>
      <DisabledReason reason={count > 0 ? say("card_fix_reason_short", { n: count }) : reason}>
        <Button
          type="button"
          variant="secondary"
          size="control"
          className="text-jw-placeholder"
          data-give
        >
          {say("parent_give")}
        </Button>
      </DisabledReason>
      {onFix !== undefined && (
        <Button type="button" size="control" onClick={onFix} data-fix>
          <PencilIcon aria-hidden className="size-4" />
          {say("card_fix_action")}
        </Button>
      )}
    </div>
  );
}
