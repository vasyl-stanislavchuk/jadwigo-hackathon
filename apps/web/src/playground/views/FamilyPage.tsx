/**
 * One question type of an interaction family. The sidebar picks the question type, so the page
 * shows only its name and status, one line on it, the example picker and three tabs:
 * - Try it: an example played as a learner would meet it, its answers looked up among the written
 *   scenarios (panels/TryPanel).
 * - Review: the example at each CRA level, under each setting, in every state, with the checklist
 *   (review/ReviewView).
 * - Details: the type's facts, the example in every mode (panels/ModesPanel) and as data
 *   (panels/DataPanel), and the family's guide (guides.ts).
 * Nothing is judged: every state comes from the written examples. The URL keeps the question type
 * and the example. Expand shows the open tab full screen in place, so an answer in progress stays.
 */

import type { Category, Language } from "@jadwigo/copy";
import {
  FAMILIES,
  type FamilyName,
  familyInfo,
  type QuestionTypeInfo,
  questionTypesOf,
} from "@jadwigo/lesson-kit";
import { ClipboardCheck, Info, Maximize2, Minimize2, SquareMousePointer } from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { examplesFor, type WrittenExample } from "../examples/index.ts";
import { GUIDES } from "../guides.ts";
import { DataPanel } from "../panels/DataPanel.tsx";
import { ModesPanel } from "../panels/ModesPanel.tsx";
import { specOf } from "../panels/question.ts";
import { TryPanel } from "../panels/TryPanel.tsx";
import { ReviewView } from "../review/ReviewView.tsx";
import {
  linkTo,
  navigate,
  type PlaygroundRoute,
  queryCategory,
  queryLanguage,
  queryTab,
  setQuery,
  type Tab,
  useLocation,
} from "../route.ts";
import { statusLabel, statusMeans } from "../status.ts";
import { Badge } from "../tool/badge.tsx";
import { Button } from "../tool/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../tool/select.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tool/tabs.tsx";

/** Where an example sits in the playground's own list: its family, its question type and its id. */
export interface ExamplePlace {
  family: FamilyName;
  question_type: string;
  example: string;
}

/**
 * The example after this one in the playground's own order: the rest of its question type's
 * examples, then the next question type's, in the sidebar's order, and after the very last back to
 * the first. Try it's Dalej goes there once the one-step lesson ends.
 */
export function nextExample(from: ExamplePlace): ExamplePlace {
  const order: ExamplePlace[] = [];
  for (const family of FAMILIES)
    for (const type of questionTypesOf(family))
      for (const e of examplesFor(type.name))
        order.push({ family, question_type: type.name, example: e.id });
  const here = order.findIndex(
    (p) =>
      p.family === from.family &&
      p.question_type === from.question_type &&
      p.example === from.example,
  );
  return order[(here + 1) % order.length] ?? from;
}

/** The question type a family route shows: the one named, else the family's first. */
export function pickQuestionType(family: FamilyName, name: string | null): QuestionTypeInfo {
  const types = questionTypesOf(family);
  const first = types[0];
  if (first === undefined) throw new Error(`${family} has no question type`);
  return types.find((p) => p.name === name) ?? first;
}

function Code({ children }: { children: string }): ReactElement {
  return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{children}</code>;
}

export function FamilyPage({
  family,
  route,
}: {
  family: FamilyName;
  route: PlaygroundRoute;
}): ReactElement {
  const { query } = useLocation();
  const language: Language = queryLanguage(query) ?? "pl";
  const category: Category = queryCategory(query) ?? "child";
  const current = pickQuestionType(family, route.question_type);
  const examples = examplesFor(current.name);
  const example: WrittenExample | undefined =
    examples.find((e) => e.id === route.example) ?? examples[0];
  // The playground switches in the URL change the question every tab plays (switchApply.ts).
  const spec = example === undefined ? undefined : specOf(example, language, query);
  const asked = queryTab(query);
  const tab: Tab = asked ?? (example ? "try" : "details");

  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const close = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !e.defaultPrevented) setFull(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [full]);

  const goExample = (id: string): void =>
    navigate(linkTo(`/playground/${family}/${current.name}/${id}`, { tab: query.get("tab") }));
  // Dalej after the one-step lesson ends: the next example in the playground's order.
  const goNext = (): void => {
    if (!example) return;
    const to = nextExample({ family, question_type: current.name, example: example.id });
    navigate(
      linkTo(`/playground/${to.family}/${to.question_type}/${to.example}`, {
        tab: query.get("tab"),
      }),
    );
  };

  return (
    <div
      className="mx-auto flex max-w-6xl flex-col gap-5 p-4 sm:p-6 lg:p-8"
      data-question-type-page={current.name}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
            {current.label}
            <Badge variant="outline" data-question-type={current.name} title={statusMeans(current)}>
              {statusLabel(current)}
            </Badge>
          </h1>
          <p className="text-muted-foreground max-w-3xl leading-relaxed">{current.does}</p>
        </div>
        {examples.length > 1 && example && (
          <Select value={example.id} onValueChange={goExample}>
            <SelectTrigger aria-label="Example" className="w-auto min-w-72 max-w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {examples.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </header>

      <Tabs
        value={tab}
        onValueChange={(next) => setQuery({ tab: next }, { replace: false })}
        // Full screen is the same tree drawn over the page, so nothing remounts.
        className={
          full
            ? "fixed inset-0 z-40 gap-4 overflow-y-auto bg-background p-4 pt-14 sm:px-8 lg:px-10"
            : "gap-4"
        }
        data-type-full={full ? current.name : undefined}
      >
        {full && (
          <p className="text-lg font-semibold">
            {current.label}
            {example && (
              <span className="text-muted-foreground font-normal"> · {example.label}</span>
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="try" disabled={!example}>
              <SquareMousePointer aria-hidden />
              Try it
            </TabsTrigger>
            <TabsTrigger value="review" disabled={!example}>
              <ClipboardCheck aria-hidden />
              Review
            </TabsTrigger>
            <TabsTrigger value="details">
              <Info aria-hidden />
              Details
            </TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setFull((f) => !f)}
            aria-pressed={full}
            data-type-expand
            title={full ? "Back to the page (Esc)" : "Show this tab full screen"}
          >
            {full ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
            {full ? "Close" : "Expand"}
          </Button>
        </div>

        <TabsContent value="try">
          {example && spec && (
            <TryPanel
              key={`${example.id}|${language}`}
              example={example}
              spec={spec}
              language={language}
              category={category}
              onNext={goNext}
            />
          )}
        </TabsContent>
        <TabsContent value="review">
          {example && spec && (
            <ReviewView
              key={`${example.id}|${language}`}
              example={example}
              spec={spec}
              language={language}
              category={category}
            />
          )}
        </TabsContent>
        <TabsContent value="details">
          <Details
            family={family}
            current={current}
            example={example}
            language={language}
            category={category}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }): ReactElement {
  return (
    <dl className="grid gap-x-6 gap-y-3 rounded-xl border bg-card p-4 sm:grid-cols-[11rem_1fr]">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="leading-relaxed">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The type's facts, the example in every mode and as data, and the family's guide. */
function Details({
  family,
  current,
  example,
  language,
  category,
}: {
  family: FamilyName;
  current: QuestionTypeInfo;
  example: WrittenExample | undefined;
  language: Language;
  category: Category;
}): ReactElement {
  const { query } = useLocation();
  const info = familyInfo(family);
  const guide = GUIDES[family];
  const spec = example === undefined ? undefined : specOf(example, language, query);
  return (
    <div className="flex flex-col gap-8">
      <Section title="This question type">
        <Facts
          rows={[
            ["Fits when", current.fits],
            ["Family", `${info.label}: ${info.does}`],
            [
              "Answer and key",
              <>
                <Code>{info.value}</Code> <Code>{info.key}</Code>
              </>,
            ],
            ["Options", <Code key="options">{JSON.stringify(current.options)}</Code>],
            ["After a miss, marks", current.marks],
            [
              "Status",
              <span key="status" data-question-type-status={current.name}>
                {statusLabel(current)}: {statusMeans(current)}
              </span>,
            ],
            ["Prints", current.print],
          ]}
        />
      </Section>
      {example && spec && (
        <Section title="Every way it is shown">
          <ModesPanel example={example} spec={spec} language={language} category={category} />
        </Section>
      )}
      {example && spec && (
        <Section title="As data">
          <DataPanel example={example} spec={spec} language={language} />
        </Section>
      )}
      <Section title={`The ${info.label} family`}>
        <Facts
          rows={[
            ["Choose it when", guide.choose_when],
            ["Not for", guide.not_for],
            ["How it is judged", guide.judging],
            ["After a miss", guide.after_a_miss],
            ["ClassTime", guide.classtime],
          ]}
        />
      </Section>
    </div>
  );
}
