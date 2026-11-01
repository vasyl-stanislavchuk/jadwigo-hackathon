/**
 * The widgets a finished tool line draws (dl-z5ja.24), PostHog's tool registry for a parent
 * (`docs/research/posthog-ai-ux-patterns.md` section 6). Each reads its verb's typed view, never
 * text, and draws only once the call is done and the view fits. Everything else gets the plain
 * card: "Step details", with what came back one tap away.
 */

import type { VerbName } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ChatItem } from "@jadwigo/core";
import type { Finding } from "@jadwigo/lesson-import/file";
import { ClipboardCheck, type LucideIcon, PencilLine, Search } from "lucide-react";
import type { ReactElement } from "react";
import { type CheckView, checkView, editView, searchView } from "./parse.ts";

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

const LEVEL_KEY: Record<Finding["level"], CopyKey> = {
  error: "chat_check_level_error",
  warn: "chat_check_level_warning",
};

function Findings({ view, language }: { view: CheckView; language: Language }): ReactElement {
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
    read: checkView,
    Widget: ({ data, language }) => <Findings view={data} language={language} />,
    keepVisible: true,
  }),
  lesson_edit: register({
    verb: "lesson_edit",
    title: "chat_tool_lesson_edit",
    icon: PencilLine,
    read: editView,
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
    read: searchView,
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
  if (tool.state !== "done" || tool.view === undefined) return null;
  const entry = REGISTRY[tool.verb];
  if (entry !== undefined && tool.view.kind === tool.verb) {
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
  return { kind: "plain", element: <PlainCard tool={tool} language={language} /> };
}

/** "Step details": the call's view as it came back, one tap away. */
function PlainCard({ tool, language }: { tool: ToolItem; language: Language }): ReactElement {
  const say = (key: CopyKey) => copy(language, key, {}, "adult");
  return (
    <details data-card="plain" data-tool={tool.verb} className="text-sm">
      <summary>{say("chat_card_details")}</summary>
      <p className="text-muted-foreground text-xs">{say("chat_card_output")}</p>
      <pre className="overflow-x-auto rounded-md border p-2 text-xs">
        {JSON.stringify(tool.view?.data ?? null, null, 2)}
      </pre>
    </details>
  );
}
