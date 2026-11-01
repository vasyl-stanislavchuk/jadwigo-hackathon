/**
 * The widgets a finished tool line draws (dl-z5ja.24), PostHog's tool registry for a parent
 * (`docs/research/posthog-ai-ux-patterns.md` section 6). Each reads its verb's typed view, never
 * text, and draws only once the call is done and the view fits. Everything else gets the plain
 * card: "Step details", with what came back one tap away. A view fits when it parses as its verb's
 * schema in `@jadwigo/contracts` (`TOOL_VIEW_DATA`, dl-z5ja.71), the one the verb wrote it through.
 */

import { type FindingLevel, type LessonCheckView, toolViewData } from "@jadwigo/contracts";
import type { VerbName } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ChatItem } from "@jadwigo/core";
import {
  CalendarDays,
  ClipboardCheck,
  type LucideIcon,
  PencilLine,
  Search,
  Target,
} from "lucide-react";
import type { ReactElement } from "react";
import { GoalLists } from "../../../parent/learner/GoalLists.tsx";
import { WeekStrip } from "../../../parent/learner/WeekStrip.tsx";

export type ToolItem = Extract<ChatItem, { kind: "tool" }>;

interface Props<T> {
  data: T;
  language: Language;
}

/** One verb's widget: its title and icon, how it reads the view, and how it draws it. */
interface WidgetEntry<T> {
  verb: VerbName;
  title: CopyKey;
  icon: LucideIcon;
  read(data: unknown): T | null;
  Widget(props: Props<T>): ReactElement;
  /** Drawn in view under the folded tool lines, not inside the fold. */
  keepVisible?: boolean;
}

/** An entry with its type closed over, so entries of different views sit in one registry. */
interface Registered {
  verb: VerbName;
  title: CopyKey;
  icon: LucideIcon;
  keepVisible: boolean;
  draw(data: unknown, language: Language): ReactElement | null;
}

function register<T>(entry: WidgetEntry<T>): Registered {
  const { Widget } = entry;
  return {
    verb: entry.verb,
    title: entry.title,
    icon: entry.icon,
    keepVisible: entry.keepVisible ?? false,
    draw(data, language) {
      const read = entry.read(data);
      return read === null ? null : <Widget data={read} language={language} />;
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

const REGISTRY: Partial<Record<VerbName, Registered>> = {
  lesson_check: register({
    verb: "lesson_check",
    title: "chat_tool_lesson_check",
    icon: ClipboardCheck,
    read: (data) => toolViewData("lesson_check", data),
    Widget: ({ data, language }) => <Findings view={data} language={language} />,
    keepVisible: true,
  }),
  lesson_edit: register({
    verb: "lesson_edit",
    title: "chat_tool_lesson_edit",
    icon: PencilLine,
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
    icon: Search,
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
  // The learner verbs (dl-z5ja.25) draw with the parent's learner page's own parts; the others
  // (learner_mistakes, curriculum_topics, lesson_ideas) get the plain card for now.
  learner_skills: register({
    verb: "learner_skills",
    title: "chat_tool_learner_skills",
    icon: Target,
    read: (data) => toolViewData("learner_skills", data),
    Widget: ({ data, language }) => (
      <GoalLists goals={data.goals} catalogue={data.skills} language={language} />
    ),
    keepVisible: true,
  }),
  learner_week: register({
    verb: "learner_week",
    title: "chat_tool_learner_week",
    icon: CalendarDays,
    read: (data) => toolViewData("learner_week", data),
    Widget: ({ data, language }) => (
      <WeekStrip
        weeks={data.weeks.map((w) => ({
          monday: w.monday,
          lessons: w.lessons,
          movedUp: w.moved_up,
          attention: w.attention,
        }))}
        language={language}
      />
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
export function toolResult(tool: ToolItem, language: Language): ToolResult {
  if (tool.state !== "done") return null;
  const entry = REGISTRY[tool.verb];
  if (entry !== undefined && tool.view !== undefined && tool.view.kind === tool.verb) {
    const drawn = entry.draw(tool.view.data, language);
    if (drawn !== null) {
      const Icon = entry.icon;
      return {
        kind: "widget",
        keepVisible: entry.keepVisible,
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
  return { kind: "plain", element: <PlainCard tool={tool} language={language} /> };
}

/**
 * "Step details": what the assistant sent the verb and what came back, one tap away (dl-z5ja.68).
 * What came back is the call's output, or its view when the log holds no output.
 */
function PlainCard({ tool, language }: { tool: ToolItem; language: Language }): ReactElement {
  const say = (key: CopyKey) => copy(language, key, {}, "adult");
  const back = tool.output !== undefined ? tool.output : (tool.view?.data ?? null);
  return (
    <details data-card="plain" data-tool={tool.verb} className="text-sm">
      <summary>{say("chat_card_details")}</summary>
      {tool.input !== undefined && (
        <>
          <p className="text-muted-foreground text-xs">{say("chat_card_input")}</p>
          <pre data-card-input className="overflow-x-auto rounded-md border p-2 text-xs">
            {JSON.stringify(tool.input, null, 2)}
          </pre>
        </>
      )}
      <p className="text-muted-foreground text-xs">{say("chat_card_output")}</p>
      <pre data-card-output className="overflow-x-auto rounded-md border p-2 text-xs">
        {JSON.stringify(back, null, 2)}
      </pre>
    </details>
  );
}
