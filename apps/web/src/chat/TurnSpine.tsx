/**
 * A turn's spine (wave dl-uukj.47.71 lane B, handoff D1-D3, D7, S9-S15, §4.1, §4.6): one card per
 * turn, its header saying what Jadwigo is doing and for how long, the plan's stages under it each
 * holding its own lines, and a foot when the turn failed, stalled or was stopped. One level of
 * nesting (S4): spine → stage → line; a line never opens. Done stages fold to their summary and
 * open on Enter, Space or a click (`aria-expanded`); the open stage shows its last 3 lines, the
 * older ones under "{n} wcześniej". Every word is a copy key with values (S3): no ids, no JSON, no
 * engine text. No red, no green: a failure is ink with the alert mark (DS S3).
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import {
  Badge,
  Button,
  Card,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  cn,
} from "@jadwigo/ui";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleIcon,
  CornerDownRightIcon,
  InfoIcon,
  LoaderCircleIcon,
  type LucideIcon,
  MinusIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  SquareIcon,
  UserIcon,
} from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { durationWords, type HeaderMark, headerOf } from "./phase.ts";
import type { TurnSpine as Spine } from "./spine/types.ts";

type Stage = Spine["stages"][number];
type SpineLine = Stage["lines"][number];
type Words = { copyKey: CopyKey; values: Readonly<Record<string, string | number>> };

/** The open stage shows this many lines; older ones fold under "{n} wcześniej" (D3). */
const OPEN_LINES = 3;
/** A search line shows this many tags; the rest open under "+{n} więcej" (S14). */
const TAGS_SHOWN = 4;

/** The adult focus halo (DS D15) on a row that toggles, radius 6. */
const HALO =
  "outline-none focus-visible:rounded-jw-control focus-visible:ring-3 focus-visible:ring-ring/30";

const say = (language: Language, w: Words): string =>
  copy(language, w.copyKey, { ...w.values }, "adult");

/** The header's mark and the stage's mark: decorative, the words beside them say the state. */
const MARK: Readonly<Record<HeaderMark | "todo", { Icon: LucideIcon; tone: string }>> = {
  running: { Icon: LoaderCircleIcon, tone: "text-jw-act motion-safe:animate-spin" },
  waiting: { Icon: UserIcon, tone: "text-jw-act" },
  done: { Icon: CheckIcon, tone: "text-jw-act" },
  failed: { Icon: CircleAlertIcon, tone: "text-jw-ink" },
  stopped: { Icon: SquareIcon, tone: "text-jw-ink" },
  todo: { Icon: CircleIcon, tone: "text-jw-control-edge" },
};

const STAGE_MARK: Readonly<Record<Stage["status"], keyof typeof MARK>> = {
  todo: "todo",
  active: "running",
  done: "done",
  failed: "failed",
  stopped: "stopped",
  waiting: "waiting",
};

function Mark({ mark, size = 16 }: { mark: keyof typeof MARK; size?: 14 | 16 }): ReactElement {
  const { Icon, tone } = MARK[mark];
  return (
    <Icon
      aria-hidden
      className={cn("shrink-0", size === 16 ? "size-4" : "size-3.5", tone)}
      data-mark={mark}
    />
  );
}

const LINE_ICON: Readonly<Record<SpineLine["kind"], LucideIcon>> = {
  done: CheckIcon,
  now: CornerDownRightIcon,
  retry: RotateCcwIcon,
  skip: MinusIcon,
  slow: InfoIcon,
  wait: UserIcon,
  steer: CornerDownRightIcon,
  earlier: MoreHorizontalIcon,
};

/** A search line's sets as tags (S14): the first 4 by fit, the rest behind "+{n} więcej". */
function Tags({
  tags,
  language,
}: {
  tags: NonNullable<SpineLine["tags"]>;
  language: Language;
}): ReactElement {
  // Closed by default each time the stage opens: the state lives in the stage's content, which
  // unmounts when the stage folds.
  const [all, setAll] = useState(false);
  const rest = tags.length - TAGS_SHOWN;
  const shown = all || rest <= 0 ? tags : tags.slice(0, TAGS_SHOWN);
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1.5" data-tags>
      {shown.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="rounded-jw-control text-jw-page-small font-normal"
          data-tag
        >
          {say(language, tag)}
        </Badge>
      ))}
      {rest > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-6 min-h-6 px-2 text-jw-page-small"
          aria-expanded={all}
          onClick={() => setAll((a) => !a)}
          data-tags-more
        >
          {all
            ? copy(language, "chat_tags_less", {}, "adult")
            : copy(language, "chat_tags_more", { n: rest }, "adult")}
          {all ? (
            <ChevronUpIcon aria-hidden className="size-3" />
          ) : (
            <ChevronDownIcon aria-hidden className="size-3" />
          )}
        </Button>
      )}
    </div>
  );
}

/** One line in a stage (§4.1): muted with its 14 icon; the now line ink with its seconds. */
function Line({
  line,
  now,
  language,
}: {
  line: SpineLine;
  now: number;
  language: Language;
}): ReactElement {
  const Icon = LINE_ICON[line.kind];
  const isNow = line.kind === "now";
  if (line.kind === "steer")
    return (
      <li className="flex flex-col gap-0.5" data-line="steer">
        {line.afterTurn === true ? null : (
          <span className="text-jw-page-micro font-medium text-jw-placeholder">
            {copy(language, "chat_steer_label", {}, "adult")}
          </span>
        )}
        <span className="text-jw-page-small text-jw-ink">
          {line.quote === undefined ? say(language, line) : `„${line.quote}”`}
        </span>
      </li>
    );
  return (
    <li className="flex flex-col" data-line={line.kind}>
      <span
        className={cn(
          "flex items-start gap-1.5 text-jw-page-small",
          isNow ? "font-medium text-jw-ink" : "text-jw-ink-soft",
        )}
      >
        <Icon
          aria-hidden
          className={cn("mt-0.5 size-3.5 shrink-0", isNow ? "text-jw-act" : "text-jw-ink-soft")}
        />
        {/* Keyed by its words: a new now line mounts fresh, so chat.css fades it in (§6). */}
        <span key={say(language, line)} className="min-w-0 flex-1" data-words>
          {say(language, line)}
        </span>
        {isNow && line.startedAt !== undefined && (
          <span
            className="shrink-0 text-jw-page-small font-normal text-jw-ink-soft tabular-nums"
            data-elapsed
          >
            {durationWords(now - line.startedAt)}
          </span>
        )}
      </span>
      {line.tags !== undefined && line.tags.length > 0 && (
        <Tags tags={line.tags} language={language} />
      )}
    </li>
  );
}

/**
 * An open stage's lines (D3): the last 3 in view, the older ones under "{n} wcześniej", which opens
 * them in place, siblings at the same level (§9).
 */
function OpenLines({
  lines,
  now,
  language,
}: {
  lines: readonly SpineLine[];
  now: number;
  language: Language;
}): ReactElement | null {
  if (lines.length === 0) return null;
  const older = lines.slice(0, Math.max(0, lines.length - OPEN_LINES));
  const recent = lines.slice(older.length);
  return (
    <ul className="flex flex-col gap-1.5 py-1 pr-3.5 pl-10" data-lines>
      {older.length > 0 && (
        <li>
          <Collapsible>
            <CollapsibleTrigger
              className={cn(
                "group/earlier flex items-center gap-1.5 text-jw-page-small text-jw-ink-soft hover:text-jw-ink data-[state=open]:hidden",
                HALO,
              )}
              data-earlier
            >
              <MoreHorizontalIcon aria-hidden className="size-3.5 shrink-0" />
              {copy(language, "chat_lines_earlier", { n: older.length }, "adult")}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="flex flex-col gap-1.5">
                {older.map((line, i) => (
                  // Lines carry no id; a line's place in its stage visit is stable.
                  <Line key={`older-${i}`} line={line} now={now} language={language} />
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </li>
      )}
      {recent.map((line, i) => (
        <Line key={`line-${older.length + i}`} line={line} now={now} language={language} />
      ))}
    </ul>
  );
}

/** A stage's words beside its name: its summary, else "drugi raz" on a second visit (D1). */
function stageNote(stage: Stage, language: Language): string | null {
  if (stage.summary !== undefined) return say(language, stage.summary);
  if (stage.visit === 2) return copy(language, "chat_stage_again_2", {}, "adult");
  if (stage.visit >= 3) return copy(language, "chat_stage_again_3", {}, "adult");
  return null;
}

/** The row's inside: mark, name, its note, and a chevron when it opens. */
function StageHead({
  stage,
  language,
  chevron,
}: {
  stage: Stage;
  language: Language;
  chevron?: "right" | "down" | undefined;
}): ReactElement {
  const note = stageNote(stage, language);
  const todo = stage.status === "todo";
  return (
    <>
      <Mark mark={STAGE_MARK[stage.status]} />
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-left">
        <span
          className={cn(
            "text-jw-page-body",
            todo ? "font-normal text-jw-ink-soft" : "font-medium text-jw-ink",
          )}
        >
          {stage.name}
        </span>
        {note !== null && (
          <span className="text-jw-page-small text-jw-ink-soft" data-stage-note>
            {note}
          </span>
        )}
      </span>
      {chevron === "right" && (
        <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 text-jw-ink-soft" />
      )}
      {chevron === "down" && (
        <ChevronDownIcon aria-hidden className="size-3.5 shrink-0 text-jw-ink-soft" />
      )}
    </>
  );
}

const ROW = "flex w-full items-center gap-2.5 px-3.5 py-1.5";

/**
 * One stage (§4.1). A done stage is a button that opens its lines (Collapsible, `aria-expanded`);
 * the active, waiting or stopped one stands open; a todo one is hollow and has no lines.
 */
function StageView({
  stage,
  now,
  language,
}: {
  stage: Stage;
  now: number;
  language: Language;
}): ReactElement {
  if (stage.status === "done" && stage.lines.length > 0)
    return (
      <li data-stage={stage.status}>
        <Collapsible className="group/stage">
          <CollapsibleTrigger
            className={cn(ROW, "rounded-jw-control hover:bg-jw-hover", HALO)}
            data-stage-row
          >
            <StageHead stage={stage} language={language} />
            <ChevronRightIcon
              aria-hidden
              className="size-3.5 shrink-0 text-jw-ink-soft group-data-[state=open]/stage:hidden"
            />
            <ChevronDownIcon
              aria-hidden
              className="hidden size-3.5 shrink-0 text-jw-ink-soft group-data-[state=open]/stage:block"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="flex flex-col gap-1.5 py-1 pr-3.5 pl-10" data-lines>
              {stage.lines.map((line, i) => (
                <Line key={`line-${i}`} line={line} now={now} language={language} />
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </li>
    );
  const open = stage.status === "active" || stage.status === "waiting";
  return (
    <li data-stage={stage.status}>
      <div className={ROW} data-stage-row>
        <StageHead stage={stage} language={language} chevron={open ? "down" : undefined} />
      </div>
      {stage.status !== "todo" && <OpenLines lines={stage.lines} now={now} language={language} />}
    </li>
  );
}

/** What the foot's buttons do: the turn's own words again, and its log copied for support. */
export interface SpineActions {
  /** Spróbuj ponownie: the turn's own message, sent again as a new turn. */
  onRetry?: (() => void) | undefined;
  /** Kopiuj szczegóły dla pomocy: the run log to the clipboard (S3), the toast says Skopiowane. */
  onCopyDetails?: (() => void) | undefined;
  /** No lesson exists yet in the conversation: a stop says only "Zatrzymane." (dl-uukj.47.71.40). */
  noLesson?: boolean | undefined;
}

/** The card's foot (D7, S11, S15, §4.6): never an alert box, never red. */
function Foot({
  spine,
  language,
  actions,
  onWaitMore,
}: {
  spine: Spine;
  language: Language;
  actions: SpineActions;
  onWaitMore: () => void;
}): ReactElement | null {
  const foot = spine.foot;
  if (foot === undefined) return null;
  const s = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const frame = "flex flex-col gap-1.5 border-t-jw border-jw-line p-3.5";
  if (foot.kind === "stopped")
    return (
      <div className={frame} data-foot="stopped">
        <p className="text-jw-page-small text-jw-ink-soft">
          {s(
            foot.changed === true
              ? "chat_stopped_some"
              : actions.noLesson === true
                ? "chat_stopped_before"
                : "chat_stopped_none",
          )}
        </p>
      </div>
    );
  const failed = foot.kind === "failed";
  const retry = actions.onRetry;
  return (
    <div className={frame} data-foot={foot.kind}>
      <p className="text-jw-page-body font-semibold text-jw-ink">
        {s(failed ? "chat_failed_title" : "chat_stalled_title")}
      </p>
      <p className="text-jw-page-small text-jw-ink-soft">
        {failed ? s("chat_failed_body", { n: foot.tries ?? 1 }) : s("chat_stalled_body")}
      </p>
      <div className="flex flex-wrap items-center gap-2 pt-1.5">
        {retry !== undefined && (
          <Button variant="outline" size="sm" className="h-8 min-h-8" onClick={retry} data-retry>
            <RotateCcwIcon aria-hidden />
            {s("chat_retry")}
          </Button>
        )}
        {failed && actions.onCopyDetails !== undefined && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 min-h-8"
            onClick={actions.onCopyDetails}
            data-copy-details
          >
            {s("chat_copy_support")}
          </Button>
        )}
        {!failed && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 min-h-8"
            onClick={onWaitMore}
            data-wait-more
          >
            {s("chat_wait_more")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** The header row (§4.1): mark · title · meta, the meta under the title on a phone (D8). */
function SpineHeader({
  spine,
  now,
  language,
  trailing,
}: {
  spine: Spine;
  now: number;
  language: Language;
  trailing?: ReactNode;
}): ReactElement {
  const head = headerOf(spine, now, language);
  return (
    <>
      <Mark mark={head.mark} />
      <span className="flex min-w-0 flex-1 flex-col gap-x-3 text-left sm:flex-row sm:items-baseline">
        <span className="min-w-0 flex-1 text-jw-page-body font-semibold text-jw-ink" data-title>
          {head.title}
        </span>
        <span className="shrink-0 text-jw-page-small text-jw-ink-soft tabular-nums" data-meta>
          {head.meta}
        </span>
      </span>
      {trailing}
    </>
  );
}

/** The stages, or the loose lines of a turn with fewer than 3 stages, then the foot. */
export function SpineBody({
  spine,
  now,
  language,
  actions = {},
}: {
  spine: Spine;
  now: number;
  language: Language;
  actions?: SpineActions;
}): ReactElement | null {
  // Czekaj dalej hides the stalled foot until the turn moves again and stalls once more (S11).
  const [waited, setWaited] = useState(false);
  const stalled = spine.foot?.kind === "stalled";
  useEffect(() => {
    if (!stalled) setWaited(false);
  }, [stalled]);
  const shown: Spine = stalled && waited ? (({ foot: _hidden, ...rest }) => rest)(spine) : spine;
  const queued =
    spine.phase === "queued" && spine.stages.length === 0 && spine.looseLines.length === 0;
  const body =
    spine.stages.length > 0 ? (
      <ol className="flex flex-col py-1.5" data-stages>
        {spine.stages.map((stage) => (
          // A stage's id is its plan index (types.ts): stable within the turn.
          <StageView key={stage.id} stage={stage} now={now} language={language} />
        ))}
      </ol>
    ) : queued ? (
      // S9: the spine appears at send with "Zacznę za chwilę." under the header.
      <p className="py-2.5 pr-3.5 pl-10 text-jw-page-small text-jw-ink-soft" data-line="queued">
        {copy(language, "chat_phase_queued_line", {}, "adult")}
      </p>
    ) : spine.looseLines.length > 0 ? (
      <div className="py-1.5">
        <OpenLines lines={spine.looseLines} now={now} language={language} />
      </div>
    ) : null;
  const foot = (
    <Foot spine={shown} language={language} actions={actions} onWaitMore={() => setWaited(true)} />
  );
  if (body === null && shown.foot === undefined) return null;
  return (
    <>
      {body}
      {foot}
    </>
  );
}

const FRAME =
  "gap-0 overflow-hidden rounded-jw-card bg-jw-card py-0 text-jw-ink shadow-none ring-1 ring-jw-line";
const HEADER = "flex w-full items-center gap-2.5 bg-jw-side px-3 py-2.5 sm:px-3.5";

/**
 * A running or unfinished turn's spine: the header as plain text, the body open. It grows in
 * place and is never sticky (§3).
 */
export function TurnSpine({
  spine,
  now,
  language,
  actions,
}: {
  spine: Spine;
  now: number;
  language: Language;
  actions?: SpineActions;
}): ReactElement {
  const body = <SpineBody spine={spine} now={now} language={language} actions={actions ?? {}} />;
  return (
    <Card className={FRAME} data-spine={spine.phase}>
      <div className={cn(HEADER, "border-b-jw border-jw-line last:border-b-0")} data-spine-header>
        <SpineHeader spine={spine} now={now} language={language} />
      </div>
      {body}
    </Card>
  );
}

export { FRAME as SPINE_FRAME, HALO as SPINE_HALO };
