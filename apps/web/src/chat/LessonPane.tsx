/**
 * The chat's lesson pane (dl-z5ja.17): the latest `lesson_revision`, read with `readDraft` and
 * built with `lessonFileToSpecs` (the lesson builder's two, which live in `lesson/` beside the
 * chat). A step the kit cannot draw is a line saying so; the rest of the lesson still shows.
 *
 * The lesson column (dl-z5ja.108.1; handoff §3 "Collapsed list" and "Ghost rows", §5.4–5.5): one
 * row per step, collapsed by default (chevron · number · title · tag · kind), a button with
 * `aria-expanded`; "Rozwiń wszystkie" opens or closes them all; the rows this revision added or
 * changed carry a tag in words, "nowe" or "zmienione", until the parent opens them (chat handoff
 * dl-uukj.47.71 S20); dashed ghost rows say how many steps are still coming. An opened step shows the
 * child's view on the left, and on the right the right answer, the help, the skill (only with a
 * child), where it came from, and Zmień ten krok. A row slides in with Zeszyt's `jw-step-in` only
 * when the system allows motion.
 *
 * A parent never edits the lesson by hand (owner, 2026-11-03, decision 2026-11-03-the-lesson-
 * preview-keeps-one-edit-path-per-question-zmien-ten-kr): Zmień ten krok asks "Co zmienić w tym
 * kroku i dlaczego?" and sends that to Jadwigo AI as a steer naming the step. The AI works from the
 * bank, its question types and the learning practices; a busy parent only says what they want. No
 * move, no removal, no word editor and no Cofnij.
 */

import type { Family } from "@jadwigo/contracts";
import { type Category, type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { RunView } from "@jadwigo/core";
import type { QuestionStep } from "@jadwigo/lesson-import/file";
import {
  type Clock,
  type FamilySpec,
  FamilyView,
  type Instant,
  LessonTheme,
  pageSpec,
  ViewMode,
} from "@jadwigo/lesson-kit";
import { Button, RegisterProvider } from "@jadwigo/ui";
import { ChevronRight } from "lucide-react";
import {
  type FormEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";
import type { Turn } from "./conversation.ts";
import { lessonFileToSpecs } from "./lesson/adapter.ts";
import { readDraft } from "./lesson/readDraft.ts";
import { editSteer } from "./steerText.ts";

const clock: Clock = { now: (): Instant => ({ perf: 0, wall: "2026-11-01T00:00:00.000Z" }) };

/** A parent's request about one step: their words for the AI, naming the step. */
type OnEdit = (text: string, question_ids: string[]) => unknown;

type Say = (key: CopyKey, vars?: Record<string, string | number>) => string;

/** A step row's kind, in words, by its family. */
const KIND: Record<Family, CopyKey> = {
  choose: "parent_step_kind_choose",
  enter: "parent_step_kind_enter",
  slots: "parent_step_kind_slots",
  sequence: "parent_step_kind_sequence",
  group: "parent_step_kind_group",
  place: "parent_step_kind_place",
  explain: "parent_step_kind_explain",
};

/** The help rungs a step can have written; the twin counts when it is there. */
const RUNGS = ["look", "boost", "almost", "worked", "twin"] as const;

/** Whether `value` holds a line with words in it, at any depth. */
function hasWords(value: unknown): boolean {
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.some(hasWords);
  if (value !== null && typeof value === "object") return Object.values(value).some(hasWords);
  return false;
}

/** How many of the step's help rungs are written. */
function rungsWritten(spec: FamilySpec): number {
  const help = (spec.help ?? {}) as Record<string, unknown>;
  return RUNGS.filter((r) => (r === "twin" ? help["twin"] !== undefined : hasWords(help[r])))
    .length;
}

/** Where a step came from, in words: its credit's source, else the bank or Jadwigo AI. */
function sourceOf(step: QuestionStep, say: Say): string | null {
  if (step.credit !== undefined) return step.credit.source;
  const from = step.based_on?.question.split(":")[0];
  if (from === "authored") return say("parent_source_authored");
  if (from === "bank" || from === "khan") return say("parent_source_bank");
  return null;
}

export function LessonPane({
  language,
  lesson,
  changed = new Set(),
  added = new Set(),
  onEdit,
  ghosts = 0,
  withChild = false,
  bare = false,
}: {
  /** The parent's language, for the pane's own words. */
  language: Language;
  lesson: RunView["lesson"];
  /** The steps the last AI revision changed (`revisions.ts`), tagged in their rows (dl-z5ja.30). */
  changed?: ReadonlySet<string>;
  /** Of those, the steps the revision added: their tag reads "nowe", the others' "zmienione". */
  added?: ReadonlySet<string>;
  /**
   * Sends a parent's request about one step to Jadwigo AI, in the lesson's own language: what to
   * change and why, as a steer naming the step. Never a patch: the parent does not edit by hand.
   */
  onEdit?: OnEdit | undefined;
  /** How many steps are still being written (`ghostsOf`), each a dashed row (dl-z5ja.108.1). */
  ghosts?: number;
  /** The lesson is for a child, so an opened step shows its skill (handoff §5.5). */
  withChild?: boolean;
  /** In the preview, whose title names the lesson (dl-1eieq.1): no heading or title of its own. */
  bare?: boolean;
}): ReactElement {
  const say: Say = (key, vars = {}) => copy(language, key, vars, "adult");
  // The pane's chrome is an adult's (the kit draws flat at the parent's sizes); each step's preview
  // sets the child's register back, so what the child will see stays theirs.
  const body = (
    <section aria-label={say("chat_lesson_title")} className="flex min-h-0 flex-col gap-4">
      {!bare && <h2 className="text-jw-page-h2 font-semibold">{say("chat_lesson_title")}</h2>}
      {lesson === null ? (
        ghosts > 0 ? (
          <ol className="flex flex-col gap-2" data-steps>
            <Ghosts count={ghosts} from={1} say={say} />
          </ol>
        ) : (
          <p data-row="lesson-empty" className="text-muted-foreground">
            {say("chat_lesson_empty")}
          </p>
        )
      ) : (
        <Revision
          lesson={lesson}
          say={say}
          changed={changed}
          added={added}
          onEdit={onEdit}
          ghosts={ghosts}
          withChild={withChild}
          bare={bare}
        />
      )}
    </section>
  );
  return <RegisterProvider value="app">{body}</RegisterProvider>;
}

/** A row slides in only when the system allows motion (decision 8 of wave dl-uukj.47-1). */
const ENTER = "motion-safe:animate-[jw-step-in_var(--jw-dur-step)_var(--jw-ease-out)_backwards]";

/** The dashed rows for steps still coming: they say how many, never what. */
function Ghosts({ count, from, say }: { count: number; from: number; say: Say }): ReactElement {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <li
          // A ghost has no id of its own: it is a place, numbered after the last real row.
          key={`ghost-${from + i}`}
          data-ghost
          className="flex min-h-11 items-center gap-3 rounded-jw-control border-jw border-dashed border-jw-line px-3 text-jw-page-small text-jw-ink-soft"
        >
          <span aria-hidden className="w-4" />
          <span className="tabular-nums">{from + i}</span>
          <span className="min-w-0 flex-1 truncate">{say("parent_step_coming")}</span>
        </li>
      ))}
    </>
  );
}

type Built = ReturnType<typeof lessonFileToSpecs>[number]["steps"][number];

function Revision({
  lesson,
  say,
  changed,
  added,
  onEdit,
  ghosts,
  withChild,
  bare,
}: {
  lesson: NonNullable<RunView["lesson"]>;
  say: Say;
  changed: ReadonlySet<string>;
  added: ReadonlySet<string>;
  onEdit: OnEdit | undefined;
  ghosts: number;
  withChild: boolean;
  bare: boolean;
}): ReactElement {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  // The steps the parent opened in this revision: their tag has been read, so it goes.
  const [seen, setSeen] = useState<{ revision: number; ids: ReadonlySet<string> }>({
    revision: lesson.revision,
    ids: new Set(),
  });
  const seenNow = seen.revision === lesson.revision ? seen.ids : new Set<string>();
  useEffect(() => {
    if (open.size === 0) return;
    setSeen((was) => {
      const ids = new Set(was.revision === lesson.revision ? was.ids : []);
      for (const id of open) ids.add(id);
      return ids.size === was.ids.size && was.revision === lesson.revision
        ? was
        : { revision: lesson.revision, ids };
    });
  }, [open, lesson.revision]);
  const tagOf = (id: string): Tag | null =>
    !changed.has(id) || seenNow.has(id) || open.has(id) ? null : added.has(id) ? "new" : "changed";
  const read = readDraft(lesson.lesson_file);
  if ("error" in read)
    return (
      <p role="alert" data-revision={lesson.revision} className="text-muted-foreground">
        {say("chat_lesson_unreadable")}
      </p>
    );
  const { file, skipped } = read;
  const lessonLanguage: Language = file.language === "en" ? "en" : "pl";
  const category: Category = file.category === "adult" ? "adult" : "child";
  const steps = lessonFileToSpecs(file, undefined, skipped).flatMap((p) => p.steps);
  const openable = steps.filter((s) => s.kind === "question").map((s) => s.step_id);
  const allOpen = openable.length > 0 && openable.every((id) => open.has(id));
  const toggle = (id: string) =>
    setOpen((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <div data-revision={lesson.revision} className="flex flex-col gap-4 overflow-y-auto">
      <div className="flex flex-col gap-1">
        {!bare && (
          <h3 className="min-w-0 text-jw-page-h1 font-semibold break-words">{file.title}</h3>
        )}
        <div className="flex items-center gap-2">
          {/* The questions, never the version (lesson card delta C5). */}
          {/* Never "0 zadań": a revision with no question says no count, as the card does. */}
          {openable.length > 0 && (
            <span className="text-jw-page-small text-muted-foreground tabular-nums" data-pane-count>
              {say("card_count", { n: openable.length })}
            </span>
          )}
          {openable.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-expand-all={allOpen ? "close" : "open"}
              onClick={() => setOpen(allOpen ? new Set() : new Set(openable))}
              className="ml-auto"
            >
              {say(allOpen ? "parent_collapse_all" : "parent_expand_all")}
            </Button>
          )}
        </div>
      </div>
      <ol className="flex flex-col gap-2" data-steps>
        {steps.map((step, i) => (
          <StepRow
            key={step.step_id}
            step={step}
            number={i + 1}
            open={open.has(step.step_id)}
            onToggle={() => toggle(step.step_id)}
            changed={changed.has(step.step_id)}
            tag={tagOf(step.step_id)}
            say={say}
            lessonLanguage={lessonLanguage}
            category={category}
            withChild={withChild}
            ask={
              onEdit === undefined
                ? null
                : (why) => onEdit(editSteer(lessonLanguage, step.step_id, why), [step.step_id])
            }
          />
        ))}
        <Ghosts count={ghosts} from={steps.length + 1} say={say} />
      </ol>
    </div>
  );
}

function StepRow({
  step,
  number,
  open,
  onToggle,
  changed,
  tag,
  say,
  lessonLanguage,
  category,
  withChild,
  ask,
}: {
  step: Built;
  number: number;
  open: boolean;
  onToggle: () => void;
  changed: boolean;
  /** The row's tag in words, until it is opened. */
  tag: Tag | null;
  say: Say;
  lessonLanguage: Language;
  category: Category;
  withChild: boolean;
  /** Sends "Co zmienić w tym kroku i dlaczego?" to Jadwigo AI for this step; null without a handler. */
  ask: ((why: string) => unknown) | null;
}): ReactElement {
  const bodyId = useId();
  const edge = changed ? "border-2 border-jw-focus" : "border-jw border-jw-line";
  if (step.kind !== "question")
    return (
      <li
        data-step={step.step_id}
        data-changed={changed || undefined}
        className={`flex min-h-11 items-center gap-3 rounded-jw-card px-3 text-jw-page-body text-muted-foreground ${edge} ${ENTER}`}
      >
        <span aria-hidden className="w-4" />
        <span className="tabular-nums">{number}</span>
        <span className="min-w-35 flex-1 truncate">
          {say("chat_lesson_step_hidden", { step: step.step_id })}
        </span>
        {tag !== null && <ChangedTag tag={tag} say={say} />}
      </li>
    );
  const title =
    step.spec.say.trim() === "" ? say("chat_lesson_step", { step: step.step_id }) : step.spec.say;
  const source = sourceOf(step.source, say);
  const view = (showKey: boolean) => (
    <RegisterProvider value="lesson">
      <LessonTheme>
        <FamilyView
          spec={pageSpec(step.spec) as never}
          language={lessonLanguage}
          category={category}
          clock={clock}
          mode={ViewMode.Preview}
          answerKey={step.spec.key as never}
          showKey={showKey}
        />
      </LessonTheme>
    </RegisterProvider>
  );
  return (
    <li
      aria-label={say("chat_lesson_step", { step: step.step_id })}
      data-step={step.step_id}
      data-changed={changed || undefined}
      data-open={open || undefined}
      className={`rounded-jw-card ${edge} ${ENTER}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center gap-3 px-3 text-left"
      >
        <ChevronRight
          aria-hidden
          className={`size-4 shrink-0 text-jw-ink-soft ${open ? "rotate-90" : ""}`}
        />
        <span className="tabular-nums">{number}</span>
        <span className="min-w-35 flex-1 truncate" data-step-title>
          {title}
        </span>
        {tag !== null && <ChangedTag tag={tag} say={say} />}
        <span className="shrink-0 text-jw-page-small text-jw-ink-soft" data-step-kind>
          {say(KIND[step.spec.family])}
        </span>
      </button>
      {open && (
        <div
          id={bodyId}
          data-step-body
          className={`grid gap-4 border-t border-jw-line p-3 md:grid-cols-2 ${ENTER}`}
        >
          <div data-child-view>{view(false)}</div>
          <div className="flex flex-col gap-3" data-step-facts>
            <Fact title={say("parent_step_answer")}>
              <div data-answer>{view(true)}</div>
            </Fact>
            <p className="text-jw-page-small text-jw-ink-soft" data-help>
              {say("parent_step_help", { n: rungsWritten(step.spec) })}
            </p>
            {withChild && step.skill_ids.length > 0 && (
              <Fact title={say("parent_step_skill")}>
                <p className="text-jw-page-small" data-skill>
                  {step.skill_ids.join(", ")}
                </p>
              </Fact>
            )}
            {source !== null && (
              <Fact title={say("parent_step_source")}>
                <p className="text-jw-page-small" data-source>
                  {source}
                </p>
              </Fact>
            )}
            {ask !== null && (
              <div className="flex flex-wrap items-start gap-2" data-step-actions>
                <StepEdit step={step.step_id} say={say} ask={ask} />
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** The step ids of a revision's lesson file; none while it does not read. */
function stepIds(lesson: RunView["lesson"]): ReadonlySet<string> {
  if (lesson === null) return new Set();
  const read = readDraft(lesson.lesson_file);
  if ("error" in read) return new Set();
  return new Set(
    lessonFileToSpecs(read.file, undefined, read.skipped).flatMap((p) =>
      p.steps.map((s) => s.step_id),
    ),
  );
}

/**
 * Of the steps the newest revision changed (`changedOf`), the ones it added: not in the revision
 * before it, in its own turn (`previous_lesson`) or the turn before's. None with nothing before.
 */
export function addedSteps(
  turns: readonly Turn[],
  changed: ReadonlySet<string>,
): ReadonlySet<string> {
  if (changed.size === 0) return new Set();
  const at = turns.findLastIndex((t) => t.view.lesson !== null);
  const newest = turns[at];
  if (newest === undefined) return new Set();
  const before =
    newest.view.previous_lesson ??
    turns.slice(0, at).findLast((t) => t.view.lesson !== null)?.view.lesson ??
    null;
  if (before === null) return new Set();
  const had = stepIds(before);
  return new Set([...changed].filter((id) => !had.has(id)));
}

/** A row's tag: the revision added it ("nowe") or changed it ("zmienione"). */
type Tag = "new" | "changed";

/** The tag on a row this revision added or changed: words, not only a coloured edge. */
function ChangedTag({ tag, say }: { tag: Tag; say: Say }): ReactElement {
  return (
    <span
      data-changed-mark={tag}
      className="shrink-0 rounded-jw-small bg-jw-side-active px-2 py-0.5 text-jw-page-small font-medium text-jw-ink-soft"
    >
      {say(tag === "new" ? "lesson_tag_new" : "lesson_tag_changed")}
    </span>
  );
}

/** One fact about an opened step under a small heading. */
function Fact({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="flex flex-col gap-1">
      <h4 className="text-jw-page-small leading-tight font-bold tracking-wider text-jw-ink-soft uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}

/**
 * Zmień ten krok (dl-uukj.47.71.17): one question, "Co zmienić w tym kroku i dlaczego?", whose
 * answer goes to Jadwigo AI as a steer naming the step. The parent never edits the step's words,
 * its place or its presence by hand; once sent, the pane says it went to Jadwigo AI.
 */
function StepEdit({
  step,
  say,
  ask,
}: {
  step: string;
  say: Say;
  ask: (why: string) => unknown;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const [sent, setSent] = useState(false);
  if (!open)
    return (
      <div className="flex items-center gap-2 text-jw-page-body">
        <Button
          type="button"
          variant="outline"
          size="control"
          data-edit-step={step}
          onClick={() => {
            setOpen(true);
            setSent(false);
          }}
        >
          {say("chat_edit_step")}
        </Button>
        {sent && <span data-edit-sent>{say("chat_edit_sent")}</span>}
      </div>
    );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const reason = why.trim();
    if (reason === "") return;
    ask(reason);
    setOpen(false);
    setWhy("");
    setSent(true);
  };
  return (
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2 text-jw-page-body">
      <label className="flex flex-col gap-1">
        {say("chat_edit_prompt")}
        <textarea
          value={why}
          rows={2}
          className="rounded-jw-control border-jw border-input bg-background px-2.5 py-2 text-jw-page-body text-foreground outline-none focus-visible:border-jw-focus focus-visible:ring-2 focus-visible:ring-selected"
          onChange={(e) => setWhy(e.target.value)}
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="outline" size="sm">
          {say("chat_edit_send")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {say("chat_edit_cancel")}
        </Button>
      </div>
    </form>
  );
}
