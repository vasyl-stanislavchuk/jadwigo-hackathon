/**
 * The widgets a finished tool line draws (dl-z5ja.24), PostHog's tool registry for a parent
 * (`docs/research/posthog-ai-ux-patterns.md` section 6). Each reads its verb's typed view, never
 * text, and draws only once the call is done and the view fits. Everything else gets the plain
 * card: "Step details", with what came back one tap away. A view fits when it parses as its verb's
 * schema in `@jadwigo/contracts` (`TOOL_VIEW_DATA`, dl-z5ja.71), the one the verb wrote it through.
 */

import {
  type BriefList,
  type FindingLevel,
  type LearnerMistakesView,
  type LearnerRef,
  type LessonCheckView,
  type LessonIdeasView,
  toolViewData,
} from "@jadwigo/contracts";
import type { VerbName } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language, mistakeCopyKey } from "@jadwigo/copy";
import type { ChatItem } from "@jadwigo/core";
import { ChevronRightIcon } from "lucide-react";
import type { ReactElement } from "react";
import { GoalLists } from "../../parent/learner/GoalLists.tsx";
import { WeekStrip } from "../../parent/learner/WeekStrip.tsx";
import { Button } from "../button.tsx";
import type { ObjectRef } from "../objects/ref.ts";
import { TOOL_ICON } from "../toolLine.ts";

export type ToolItem = Extract<ChatItem, { kind: "tool" }>;

/** What a widget may do besides drawing: ask for a lesson in the parent's words (dl-z5ja.129). */
export interface WidgetActions {
  /** Sends words as the parent's message. */
  onAsk?: ((text: string) => void) | undefined;
  /** Opens a thing beside the chat: a lesson, a learner, a skill (objects/ref.ts, dl-uukj.47.58). */
  onOpen?: ((object: ObjectRef) => void) | undefined;
}

interface Props<T> {
  data: T;
  language: Language;
  actions: WidgetActions;
}

/** One verb's widget: its title, how it reads the view, and how it draws it (its icon is TOOL_ICON). */
interface WidgetEntry<T> {
  verb: VerbName;
  title: CopyKey;
  read(data: unknown): T | null;
  Widget(props: Props<T>): ReactElement;
  /** Drawn in view under the folded tool lines, not inside the fold; a function decides per view. */
  keepVisible?: boolean | ((data: T) => boolean);
}

/** An entry with its type closed over, so entries of different views sit in one registry. */
interface Registered {
  verb: VerbName;
  title: CopyKey;
  /** Whether this view stays in view under the fold. */
  keepVisible(data: unknown): boolean;
  draw(data: unknown, language: Language, actions: WidgetActions): ReactElement | null;
}

function register<T>(entry: WidgetEntry<T>): Registered {
  const { Widget } = entry;
  return {
    verb: entry.verb,
    title: entry.title,
    keepVisible(data) {
      const rule = entry.keepVisible ?? false;
      if (typeof rule === "boolean") return rule;
      const read = entry.read(data);
      return read !== null && rule(read);
    },
    draw(data, language, actions) {
      const read = entry.read(data);
      return read === null ? null : <Widget data={read} language={language} actions={actions} />;
    },
  };
}

const LEVEL_KEY: Record<FindingLevel, CopyKey> = {
  error: "chat_check_level_error",
  warn: "chat_check_level_warning",
};

function Findings({ view, language }: { view: LessonCheckView; language: Language }): ReactElement {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const toFix = view.findings.filter((f) => f.level === "error").length;
  return (
    <div className="flex flex-col gap-2">
      <p data-check={view.publishable ? "ok" : "to-fix"}>
        {view.publishable ? say("chat_check_ok") : say("chat_check_findings", { n: toFix })}
      </p>
      {view.findings.length > 0 && (
        <ul className="flex flex-col gap-1">
          {view.findings.map((f, i) => (
            // A check may name one rule twice at one path; its place in the list tells them apart.
            <li
              key={`${i}-${f.rule}-${f.path}`}
              data-level={f.level}
              data-step-finding={f.step_id ?? ""}
              className="rounded-md border px-2 py-1"
            >
              <span className="font-medium">{say(LEVEL_KEY[f.level])}</span>
              {f.step_id !== null && ` · ${say("chat_lesson_step", { step: f.step_id })}`}
              {` · ${f.text}`}
              {f.fix !== "" && <span className="text-muted-foreground block">{f.fix}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const LIST_KEY: Readonly<Record<BriefList, CopyKey>> = {
  reteach: "chat_ideas_list_reteach",
  review: "chat_ideas_list_review",
  new: "chat_ideas_list_new",
  recheck: "chat_ideas_list_recheck",
  school: "chat_ideas_list_school",
};

const WHY_KEY: Readonly<Record<LessonIdeasView["ideas"][number]["why"], CopyKey>> = {
  needs_attention: "chat_ideas_why_needs_attention",
  review_due: "chat_ideas_why_review_due",
  prerequisites_met: "chat_ideas_why_prerequisites_met",
  second_day_owed: "chat_ideas_why_second_day_owed",
  school_tag: "chat_ideas_why_school_tag",
};

/**
 * lesson_ideas (dl-z5ja.129): each idea as its list, why code put it there and how many skills,
 * with a button that asks for that lesson in the parent's words. No skill code reaches the parent;
 * the can-do lines come with dl-hin8.21 (lead, 2026-11-02).
 */
function Ideas({
  view,
  language,
  actions,
}: {
  view: LessonIdeasView;
  language: Language;
  actions: WidgetActions;
}): ReactElement {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  if (view.ideas.length === 0) return <p>{say("chat_ideas_none")}</p>;
  return (
    <ol className="flex flex-col gap-2">
      {view.ideas.map((idea) => {
        const n = Number(idea.id.slice(1));
        const list = say(LIST_KEY[idea.list]);
        return (
          <li
            key={idea.id}
            data-idea={idea.id}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-jw-small border-jw border-jw-line px-2 py-1.5"
          >
            <span className="font-bold text-jw-ink">{list}</span>
            <span className="text-jw-ink-soft">{say(WHY_KEY[idea.why])}</span>
            <span className="text-jw-ink-soft">
              {say("chat_ideas_skills", { n: idea.skill_codes.length })}
            </span>
            {actions.onAsk !== undefined && (
              <Button
                variant="outline"
                size="xs"
                className="ml-auto"
                onClick={() => actions.onAsk?.(say("chat_ideas_ask_message", { n, list }))}
                data-ask-idea={idea.id}
              >
                {say("chat_ideas_ask")}
              </Button>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * learner_mistakes (dl-z5ja.129): each mistake class in the parent's words and how often, then the
 * questions behind them with the child's own answers as text, never markup.
 */
function Mistakes({ view, language }: { view: LearnerMistakesView; language: Language }) {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  if (view.mistakes.length === 0 && view.questions.length === 0)
    return <p>{say("chat_mistakes_none")}</p>;
  const words = (mistake: string) => say(mistakeCopyKey(mistake) ?? "parent_mistake_other");
  return (
    <div className="flex flex-col gap-2">
      {view.mistakes.length > 0 && (
        <ul className="flex flex-col gap-1">
          {view.mistakes.map((m) => (
            <li key={m.mistake_class} data-mistake={m.mistake_class} className="flex gap-2">
              <span className="text-jw-ink">{words(m.mistake_class)}</span>
              <span className="text-jw-ink-soft">{say("chat_mistakes_times", { n: m.times })}</span>
            </li>
          ))}
        </ul>
      )}
      {view.questions.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {view.questions.map((q) => (
            <li
              key={`${q.attempt_id}-${q.seq}`}
              data-missed={`${q.attempt_id}-${q.seq}`}
              className="flex flex-col rounded-jw-small border-jw border-jw-line px-2 py-1"
            >
              <span className="text-jw-ink">{q.say}</span>
              {q.mistake_classes.length > 0 && (
                <span className="text-jw-ink-soft">{q.mistake_classes.map(words).join(" · ")}</span>
              )}
              <span className="text-jw-ink-soft" data-answers>
                {q.skipped
                  ? say("parent_outcome_skipped")
                  : `${say("chat_mistakes_answers")}: ${q.answers.join(" · ")}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * "Szczegóły: {imię}" under a learner verb's widget (dl-uukj.47.59): opens the child beside the
 * chat, their goals, weeks and report, with the way to their own page. Drawn only where the page
 * can open things.
 */
function OpenLearner({
  learner,
  language,
  actions,
}: {
  learner: LearnerRef;
  language: Language;
  actions: WidgetActions;
}): ReactElement | null {
  const open = actions.onOpen;
  if (open === undefined) return null;
  return (
    <Button
      variant="outline"
      size="xs"
      className="w-fit"
      onClick={() => open({ kind: "learner", id: learner.id })}
      data-open-learner={learner.id}
    >
      {copy(language, "chat_learner_open", { name: learner.first_name }, "adult")}
    </Button>
  );
}

const REGISTRY: Partial<Record<VerbName, Registered>> = {
  lesson_check: register({
    verb: "lesson_check",
    title: "chat_tool_lesson_check",
    read: (data) => toolViewData("lesson_check", data),
    Widget: ({ data, language }) => <Findings view={data} language={language} />,
    // A clean pass folds in with the other steps (design review 2026-11-02): the lesson is the
    // news. Findings, or a lesson that cannot be given yet, stay in view.
    keepVisible: (data) => !data.publishable || data.findings.length > 0,
  }),
  lesson_edit: register({
    verb: "lesson_edit",
    title: "chat_tool_lesson_edit",
    read: (data) => toolViewData("lesson_edit", data),
    Widget: ({ data, language }) => (
      <ul className="flex flex-wrap gap-1">
        {data.changed_step_ids.map((id) => (
          <li key={id} data-edited-step={id} className="rounded-full border px-2 py-0.5">
            {copy(language, "chat_lesson_step", { step: id }, "adult")}
          </li>
        ))}
      </ul>
    ),
    keepVisible: true,
  }),
  question_search: register({
    verb: "question_search",
    title: "chat_search_sets",
    read: (data) => toolViewData("question_search", data),
    Widget: ({ data, language }) =>
      data.sets.length === 0 ? (
        <p>{copy(language, "chat_search_none", {}, "adult")}</p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {data.sets.map((s) => (
            <li key={s.set_id} data-set={s.set_id} className="rounded-full border px-2 py-0.5">
              {s.title}
            </li>
          ))}
        </ul>
      ),
    keepVisible: true,
  }),
  // The learner verbs (dl-z5ja.25) draw with the parent's learner page's own parts and their own
  // widgets (dl-z5ja.129); curriculum_topics gets the plain card for now.
  learner_skills: register({
    verb: "learner_skills",
    title: "chat_tool_learner_skills",
    read: (data) => toolViewData("learner_skills", data),
    Widget: ({ data, language, actions }) => (
      <>
        <GoalLists goals={data.goals} catalogue={data.skills} language={language} />
        <OpenLearner learner={data.learner} language={language} actions={actions} />
      </>
    ),
    keepVisible: true,
  }),
  learner_week: register({
    verb: "learner_week",
    title: "chat_tool_learner_week",
    read: (data) => toolViewData("learner_week", data),
    Widget: ({ data, language, actions }) => (
      <>
        <WeekStrip
          weeks={data.weeks.map((w) => ({
            monday: w.monday,
            lessons: w.lessons,
            movedUp: w.moved_up,
            attention: w.attention,
          }))}
          language={language}
        />
        <OpenLearner learner={data.learner} language={language} actions={actions} />
      </>
    ),
    keepVisible: true,
  }),
  lesson_ideas: register({
    verb: "lesson_ideas",
    title: "chat_tool_lesson_ideas",
    read: (data) => toolViewData("lesson_ideas", data),
    Widget: ({ data, language, actions }) => (
      <Ideas view={data} language={language} actions={actions} />
    ),
    keepVisible: true,
  }),
  learner_mistakes: register({
    verb: "learner_mistakes",
    title: "chat_tool_learner_mistakes",
    read: (data) => toolViewData("learner_mistakes", data),
    Widget: ({ data, language, actions }) => (
      <>
        <Mistakes view={data} language={language} />
        <OpenLearner learner={data.learner} language={language} actions={actions} />
      </>
    ),
    keepVisible: true,
  }),
};

/** What a finished tool line shows: its widget, the plain card, or nothing. */
export type ToolResult =
  | { kind: "widget"; keepVisible: boolean; element: ReactElement }
  | { kind: "plain"; element: ReactElement }
  | null;

/**
 * The widget for a done call whose view is its own verb's kind and reads cleanly; the plain card
 * for any other done call with a view; nothing for a call still running, failed or turned down, or
 * one with no view. A view whose kind names another verb never borrows that verb's widget.
 */
export function toolResult(
  tool: ToolItem,
  language: Language,
  actions: WidgetActions = {},
): ToolResult {
  if (tool.state !== "done") return null;
  const entry = REGISTRY[tool.verb];
  if (entry !== undefined && tool.view !== undefined && tool.view.kind === tool.verb) {
    const drawn = entry.draw(tool.view.data, language, actions);
    if (drawn !== null) {
      const Icon = TOOL_ICON[tool.verb];
      return {
        kind: "widget",
        keepVisible: entry.keepVisible(tool.view.data),
        element: (
          <section
            data-widget={tool.verb}
            aria-label={copy(language, entry.title, {}, "adult")}
            className="flex flex-col gap-1 rounded-md border p-2 text-sm"
          >
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <Icon aria-hidden className="size-3" />
              {copy(language, entry.title, {}, "adult")}
            </p>
            {drawn}
          </section>
        ),
      };
    }
  }
  if (tool.view === undefined && tool.input === undefined && tool.output === undefined) return null;
  return { kind: "plain", element: <ToolDetails tool={tool} language={language} /> };
}

/** The raw input and output: small mono on the soft fill, scrolling past a few lines. */
const RAW =
  "max-h-48 overflow-auto rounded-jw-small bg-jw-act-quiet px-2 py-1.5 font-mono text-jw-page-small leading-snug text-jw-ink";

/**
 * "Szczegóły": what Jadwigo AI sent the verb and what came back, one more tap under an opened
 * tool line (dl-z5ja.68, dl-uukj.47.30). What came back is the call's output, or its view when the
 * log holds no output.
 */
export function ToolDetails({
  tool,
  language,
}: {
  tool: ToolItem;
  language: Language;
}): ReactElement {
  const say = (key: CopyKey) => copy(language, key, {}, "adult");
  const back = tool.output !== undefined ? tool.output : (tool.view?.data ?? null);
  return (
    <details
      data-card="plain"
      data-tool={tool.verb}
      className="group/details text-jw-page-small text-jw-ink-soft"
    >
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1 hover:text-jw-ink [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon
          aria-hidden
          className="size-3.5 shrink-0 transition-transform duration-jw-fast group-open/details:rotate-90"
        />
        {say("chat_tool_details")}
      </summary>
      <dl className="mt-1.5 ml-4.5 flex flex-col gap-1.5">
        {tool.input !== undefined && (
          <div className="flex flex-col gap-0.5">
            <dt className="font-bold">{say("chat_card_input")}</dt>
            <dd>
              <pre data-card-input className={RAW}>
                {JSON.stringify(tool.input, null, 2)}
              </pre>
            </dd>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <dt className="font-bold">{say("chat_card_output")}</dt>
          <dd>
            <pre data-card-output className={RAW}>
              {JSON.stringify(back, null, 2)}
            </pre>
          </dd>
        </div>
      </dl>
    </details>
  );
}
