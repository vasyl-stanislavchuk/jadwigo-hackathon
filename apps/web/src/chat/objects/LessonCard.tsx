/**
 * The lesson card under a turn that wrote the lesson (dl-uukj.47.58; chat handoff dl-uukj.47.71
 * §4.4, S7, S16, and the owner's card delta of 2026-11-03, dl-vxjv2, which wins where they differ).
 * The answer to the parent's request, so it is the one raised thing in the thread (C1): a stronger
 * edge and a soft shadow. Title first (C2), then "{n} zadań", the first 3 prompts and "+{n} więcej"
 * (C3). Its state is a tag beside the expand button and nowhere else (C4), and no version number is
 * drawn anywhere (C5):
 *
 *   ready       Gotowa: the actions in the foot
 *   fix         Do poprawy: the check's findings, Daj lekcję quiet with its reason, and Popraw za
 *               mnie, which sends a fix request as a new turn. A lesson with no step to show is
 *               this, never "0 zadań" (dl-uukj.47.69)
 *   working     Zmieniam…: the card keeps the current lesson, and its actions still give it
 *   superseded  one flat row, "{title} · jest nowsza wersja", with no actions (S7)
 *
 * Only the living card (the newest version) has actions. Every fact is read from the lesson's own
 * revision, never from Jadwigo AI's words, so the card and the preview never disagree. Its expand
 * button opens the lesson in the preview over the chat, on a phone too (decision 2026-11-03-the-
 * lesson-opens-in-a-preview-modal-from-an-expand-button-on-the: no Lekcja tab).
 *
 * The state comes from the run (`state`, `cardStatesOf`). A caller that has only the revision gets
 * ready or fix from it; only the run says which card is superseded.
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ChatItem, RunView } from "@jadwigo/core";
import {
  Badge,
  Button,
  DisabledReason,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@jadwigo/ui";
import {
  AlertCircleIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronRightIcon,
  LoaderIcon,
  Maximize2Icon,
  PencilIcon,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import type { Turn } from "../conversation.ts";
import { lessonFacts } from "../spine/lessonFile.ts";
import type { LessonCardState } from "../spine/types.ts";
import type { ObjectRef } from "./ref.ts";

type LessonAt = NonNullable<RunView["lesson"]>;

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
 * Whether a running turn is writing the lesson, for the preview's band (S20): the open turn's
 * lesson_draft or lesson_edit call has not finished.
 */
export function lessonChanging(turns: readonly Turn[]): boolean {
  const turn = turns.at(-1);
  if (turn === undefined || !turn.view.turn_open) return false;
  return turn.view.chat.some(
    (item) =>
      item.kind === "tool" &&
      WROTE.has(item.verb) &&
      (item.state === "pending" || item.state === "running"),
  );
}

/**
 * The state of a card drawn from its revision alone: ready, or needing a fix when no step reads
 * (never "0 zadań"). Which card is superseded is the run's to say, so this never says it.
 */
function stateFrom(lesson: LessonAt, lessonId: string): LessonCardState {
  const facts = lessonFacts(lesson.lesson_file);
  const base = { lessonId, version: lesson.revision, title: facts.title };
  const content = { count: facts.count, preview: facts.preview };
  if (facts.count === 0 || facts.preview.length === 0)
    return { ...base, ...content, kind: "fix", findings: [] };
  return { ...base, ...content, kind: "ready" };
}

/** The state's tag (C4): its words, its 12 px icon and the icon's colour. */
const TAG: Readonly<
  Record<
    Exclude<LessonCardState["kind"], "superseded">,
    { key: CopyKey; Icon: typeof CheckIcon; tone: string }
  >
> = {
  ready: { key: "card_tag_ready", Icon: CheckIcon, tone: "text-primary" },
  fix: { key: "card_tag_fix", Icon: AlertCircleIcon, tone: "text-jw-ink" },
  working: {
    key: "card_tag_working",
    Icon: LoaderIcon,
    tone: "text-primary motion-safe:animate-spin",
  },
};

/** How many prompts the card lists (C3); the rest is "+{n} więcej". */
const SHOWN = 3;

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
        aria-label={title}
        className="flex min-h-9 items-center gap-2 rounded-jw-box border-jw border-jw-line bg-jw-card px-3.5 py-1 text-jw-page-small"
        data-object-card="lesson"
        data-card-state="superseded"
        data-revision={state.version}
      >
        <BookOpenIcon aria-hidden className="size-3.5 shrink-0 text-jw-ink-soft" />
        <span className="truncate font-medium text-jw-ink" data-card-title>
          {title}
        </span>
        <span className="shrink-0 text-jw-ink-soft" data-card-facts>
          {say("card_superseded")}
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

  const tag = TAG[state.kind];
  const more = state.count - SHOWN;
  const openName = say("chat_lesson_card_open_named", { title });
  return (
    <section
      aria-label={title}
      // The one raised element in the thread (C1): the spine, widgets and old rows stay flat.
      className="flex flex-col overflow-hidden rounded-jw-card border-jw border-jw-line-raised bg-jw-card shadow-card"
      data-object-card="lesson"
      data-card-state={state.kind}
      data-revision={state.version}
    >
      {/* One grid, so the one open button moves rather than doubles: on a laptop it sits beside
          the tag; on a phone it is a plain chevron at the right of the prompts (delta, 390). */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-x-2 px-4 py-3.5 max-sm:px-3">
        <span
          aria-hidden
          className="row-span-2 mr-1 grid size-8 shrink-0 place-items-center rounded-jw-control bg-jw-hover"
        >
          <BookOpenIcon className="size-4 text-jw-ink" />
        </span>
        <span
          className="col-start-2 min-w-0 text-base leading-snug font-semibold text-jw-ink max-sm:line-clamp-2 sm:truncate"
          data-card-title
        >
          {title}
        </span>
        {/* The one place the state is written (C4). */}
        <Badge
          variant="secondary"
          className="col-start-3 h-6 gap-1 rounded-jw-control border-0 bg-jw-hover px-2 py-0 text-xs font-medium text-jw-ink sm:-mt-0.5 [&>svg]:size-3"
          data-card-tag={state.kind}
        >
          <tag.Icon aria-hidden className={tag.tone} />
          {say(tag.key)}
        </Badge>
        {/* The one way into the lesson: the preview opens over the chat, never beside it. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onOpen(object)}
              aria-label={openName}
              className="col-start-4 row-start-1 size-8 min-h-8 min-w-8 sm:-mt-1 max-sm:row-start-2 max-sm:size-9 max-sm:min-h-9 max-sm:min-w-9 max-sm:self-center max-sm:border-transparent max-sm:bg-transparent"
              data-open-object={`${object.kind}:${object.id}`}
              data-expand
            >
              <Maximize2Icon aria-hidden className="size-4 max-sm:hidden" />
              <ChevronRightIcon aria-hidden className="size-4 sm:hidden" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{say("chat_lesson_card_open")}</TooltipContent>
        </Tooltip>
        <div
          className="col-span-3 col-start-2 flex min-w-0 flex-col max-sm:col-span-2"
          data-card-body
        >
          {state.count > 0 && (
            <span
              className="mt-0.5 text-jw-page-small text-jw-ink-soft tabular-nums"
              data-card-facts
            >
              {say("card_count", { n: state.count })}
            </span>
          )}
          {state.preview.length > 0 && (
            <ol className="mt-2 flex flex-col gap-1" data-card-preview>
              {state.preview.slice(0, SHOWN).map((prompt, i) => (
                <li key={`${i}-${prompt}`} className="flex min-w-0 items-baseline gap-2">
                  <span className="w-3.5 shrink-0 text-xs text-jw-placeholder tabular-nums">
                    {i + 1}
                  </span>
                  <span className="truncate text-jw-page-small text-jw-ink" data-card-prompt>
                    {prompt}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {more > 0 && (
            <span className="mt-1 pl-5.5 text-jw-page-small text-jw-ink-soft" data-card-more>
              {say("card_more_questions", { n: more })}
            </span>
          )}
        </div>
      </div>
      {state.kind === "fix" && state.findings.length > 0 && (
        <ul
          className="flex flex-col gap-1.5 border-t-jw border-jw-line py-3 pr-4 pl-4 text-jw-page-small text-jw-ink sm:pl-15"
          data-card-findings
        >
          {state.findings.map((finding, i) => (
            <li
              key={`${i}-${finding.step ?? "lesson"}-${finding.words.copyKey}`}
              className="flex items-start gap-2"
              data-finding={finding.step ?? "lesson"}
            >
              <AlertCircleIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {/* A finding about the lesson as a whole names no question (dl-uukj.47.71.31). */}
                {finding.step !== null && (
                  <>
                    <span className="font-semibold">{`${say("print_task", { n: finding.step })}.`}</span>{" "}
                  </>
                )}
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
      {/* On a phone: the reason on its own row, then Popraw za mnie wide and Daj lekcję beside it,
          both 44 tall (delta card-needs-fixing-390). */}
      <p className="mr-auto text-jw-page-small text-jw-ink-soft max-sm:basis-full" data-fix-reason>
        {reason}
      </p>
      <DisabledReason
        reason={count > 0 ? say("card_fix_reason_short", { n: count }) : reason}
        className="max-sm:order-2"
      >
        <Button
          type="button"
          variant="secondary"
          size="control"
          className="text-jw-placeholder max-sm:min-h-11"
          data-give
        >
          {say("parent_give")}
        </Button>
      </DisabledReason>
      {onFix !== undefined && (
        <Button
          type="button"
          size="control"
          className="max-sm:order-1 max-sm:min-h-11 max-sm:flex-1"
          onClick={onFix}
          data-fix
        >
          <PencilIcon aria-hidden className="size-4" />
          {say("card_fix_action")}
        </Button>
      )}
    </div>
  );
}
