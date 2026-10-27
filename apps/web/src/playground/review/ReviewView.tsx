/**
 * The review tab (dl-w3.47): one question under every setting the reviewer checks, on one screen,
 * with nothing to deploy and nothing stored.
 *
 * A toolbar sets the CRA level (levels.ts, a level the type cannot show greyed out), the theme the
 * page is held at (useReviewTheme) and the language. Then four regions:
 * - Answer in place: the question live at that level, the same cell Try it plays (TryExample).
 * - Settings side by side: one live column per value of each question type option (options.ts).
 * - Every state: the family view at each moment of a step, still (states.ts).
 * - Checklist: the lines the reviewer checks against, each with its source (checklist.ts).
 * Every setting lives in the URL, so a link carries the whole view. A live cell's answer is looked
 * up in the authored data (panels/question.ts lookUp), never judged.
 */

import type { Category, Language } from "@jadwigo/copy";
import { type FamilySpec, FamilyView, LessonTheme, StepFrame } from "@jadwigo/lesson-kit";
import { RotateCcw } from "lucide-react";
import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import type { WrittenExample } from "../examples/index.ts";
import { LANGUAGES, resolve } from "../localize.ts";
import { LearnerControls } from "../panels/LearnerControls.tsx";
import { TryExample } from "../panels/TryExample.tsx";
import { AttemptView } from "../panels/TryPanel.tsx";
import type { TryState } from "../panels/tryState.ts";
import { queryLevel, queryTheme, setQuery, useLocation } from "../route.ts";
import { Controls, Segmented } from "../shell/controls.tsx";
import { Badge } from "../tool/badge.tsx";
import { Button } from "../tool/button.tsx";
import { ChecklistPanel } from "./ChecklistPanel.tsx";
import { LEVEL_LABEL, LEVEL_TITLE, type Level, levelSpec, levelsOf } from "./levels.ts";
import { variantsOf } from "./options.ts";
import { type ReviewState, statesOf } from "./states.ts";
import { useReviewTheme } from "./useReviewTheme.ts";

type ThemeChoice = "light" | "dark" | "system";
const THEME_OPTIONS: { value: ThemeChoice; label: string; title: string }[] = [
  { value: "light", label: "Light", title: "Hold the page light" },
  { value: "dark", label: "Dark", title: "Hold the page dark" },
  { value: "system", label: "System", title: "Follow the laptop" },
];
const LANGUAGE_LABEL: Record<Language, string> = { pl: "Polski", en: "English" };

function Region({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section aria-label={label} className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{label}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{hint}</p>
      </header>
      {children}
    </section>
  );
}

/** One still cell: a step frame in the lesson's look, sized to its column. */
function Cell({
  state,
  stepId,
  children,
}: {
  state: ReviewState;
  stepId: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div data-state={state.id} className="flex min-w-0 flex-col gap-2">
      <h3 className="font-medium">{state.title}</h3>
      {state.note && <p className="text-muted-foreground text-xs leading-relaxed">{state.note}</p>}
      <div className="kid-step min-w-0 rounded-2xl border bg-background p-4">
        <LessonTheme>
          <StepFrame key={stepId} stepId={stepId}>
            {children}
          </StepFrame>
        </LessonTheme>
      </div>
    </div>
  );
}

/** A live cell with its own round, so it can be tried again, and the last answer under it. */
export function LiveCell({
  example,
  spec,
  language,
  category,
}: {
  example: WrittenExample;
  spec: FamilySpec;
  language: Language;
  category: Category;
}): ReactElement {
  const [round, setRound] = useState(1);
  const [state, setState] = useState<TryState | null>(null);
  // Dalej ends the cell's one-step lesson: it starts fresh, so a finished step is never left drawn.
  const again = useCallback(() => {
    setRound((r) => r + 1);
    setState(null);
  }, []);
  const last = state?.attempts.at(-1);
  return (
    <div className="flex flex-col gap-2" data-live-cell>
      <div className="kid-step min-w-0 rounded-2xl border bg-background p-4">
        <LessonTheme>
          <StepFrame key={`${spec.id}|${round}`} stepId={spec.id}>
            <TryExample
              key={`${round}|${language}|${category}`}
              example={example}
              spec={spec}
              language={language}
              category={category}
              onState={setState}
              onFinished={again}
            />
          </StepFrame>
        </LessonTheme>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
        {last === undefined ? (
          <p className="text-muted-foreground text-xs">Nothing yet: answer the example.</p>
        ) : (
          <AttemptView attempt={last} />
        )}
        {state !== null && (state.phase !== "live" || last !== undefined) && (
          <Button variant="outline" size="sm" onClick={again}>
            <RotateCcw aria-hidden />
            Try it again
          </Button>
        )}
      </div>
    </div>
  );
}

function StateCell({
  state,
  stepKey,
  language,
  category,
}: {
  state: ReviewState;
  stepKey: string;
  language: Language;
  category: Category;
}): ReactElement {
  if (state.spec === null || state.props === null) {
    return (
      <div data-state={state.id} className="flex min-w-0 flex-col gap-2">
        <h3 className="font-medium">{state.title}</h3>
        <p className="text-muted-foreground flex min-h-24 items-center justify-center rounded-2xl border border-dashed p-4 text-sm">
          {state.note ?? "Nothing to show."}
        </p>
      </div>
    );
  }
  return (
    <Cell state={state} stepId={`${stepKey}|${state.id}`}>
      <FamilyView
        {...(state.props as ComponentProps<typeof FamilyView>)}
        spec={state.spec as never}
        language={language}
        category={category}
      />
    </Cell>
  );
}

export function ReviewView({
  example,
  spec: written,
  language,
  category,
}: {
  example: WrittenExample;
  /** The example's question as this page plays it. */
  spec: FamilySpec;
  language: Language;
  category: Category;
}): ReactElement {
  const { query } = useLocation();
  const level = queryLevel(query);
  const theme = queryTheme(query);
  useReviewTheme(theme);
  const levels = levelsOf(written, language);
  const chosen = levelSpec(written, level, language);
  const spec = chosen ?? written;
  const groups = variantsOf(spec);
  const states = statesOf(example, spec, language, category);
  const cellKey = `${example.id}|${level}|${language}|${category}`;

  return (
    <div data-review data-level={level} className="flex flex-col gap-8">
      <div
        role="toolbar"
        aria-label="Review settings"
        className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3"
      >
        <Segmented<Level>
          label="Level"
          value={level}
          options={levels.map(({ level: l, available }) => ({
            value: l,
            label: resolve(LEVEL_LABEL[l], language),
            title: available ? LEVEL_TITLE[l] : "This type cannot show this level",
            disabled: !available,
          }))}
          onChange={(next) => setQuery({ level: next })}
        />
        <Segmented<ThemeChoice>
          label="Theme"
          value={theme ?? "system"}
          options={THEME_OPTIONS}
          onChange={(next) => setQuery({ theme: next === "system" ? null : next })}
        />
        <Segmented<Language>
          label="Shown in"
          value={language}
          options={LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_LABEL[l] }))}
          onChange={(lang) => setQuery({ lang })}
        />
      </div>
      {chosen === null && (
        <p className="text-muted-foreground text-sm">
          This type cannot show the {level} level: the question is shown as written.
        </p>
      )}

      <Region
        label="Answer in place"
        hint="The question live at this level. An answer the authored data names (a scenario, the key, a known wrong answer) shows what it was written to show; any other answer is not judged."
      >
        <LiveCell
          key={cellKey}
          example={example}
          spec={spec}
          language={language}
          category={category}
        />
      </Region>

      <Region
        label="Settings side by side"
        hint="The same question under each value of a question type option, every column live. A value the question cannot take is left out."
      >
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">This type has no settings to compare.</p>
        ) : (
          groups.map((group) => (
            <div key={group.option} className="flex flex-col gap-2" data-option={group.option}>
              <h3 className="font-medium">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {group.option}
                </code>
              </h3>
              <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]">
                {group.variants.map((v) => (
                  <div
                    key={v.value}
                    data-variant={group.option}
                    data-value={v.value}
                    className="flex min-w-0 flex-col gap-2"
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {v.value}
                      </code>
                      {v.current && <Badge variant="secondary">this question type</Badge>}
                    </div>
                    <LiveCell
                      key={`${cellKey}|${group.option}=${v.value}`}
                      example={example}
                      spec={v.spec}
                      language={language}
                      category={category}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </Region>

      <Region
        label="Every state"
        hint="The step at each moment, still: what the learner sees before, during and after an answer, and at every help rung."
      >
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]">
          {states.map((state) => (
            <StateCell
              key={`${cellKey}|${state.id}`}
              state={state}
              stepKey={cellKey}
              language={language}
              category={category}
            />
          ))}
        </div>
      </Region>

      <Region
        label="Checklist"
        hint="What a type is reviewed against, each line with its source. Code answers what it can; the rest is yours. Marks and notes go in md's annotations, not here."
      >
        <ChecklistPanel spec={spec} />
      </Region>

      <Controls>
        <LearnerControls
          language={language}
          category={category}
          question_type={spec.question_type}
        />
      </Controls>
    </div>
  );
}
