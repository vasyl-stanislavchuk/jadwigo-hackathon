/**
 * Every way one example is shown, side by side, so an author sees the whole life of a question at
 * once: the learner's solution view after moving on, a parent's review with its marks, an author's
 * preview with the key behind a switch, and the printed sheet where the question type prints.
 *
 * The answer shown in the solution and the review is the example's first missed scenario (so the
 * marks show), else its first scenario, and the review's verdict is that scenario as written.
 */

import type { Category, Language } from "@jadwigo/copy";
import {
  type Clock,
  type FamilySpec,
  FamilyView,
  type Instant,
  LessonTheme,
  pageSpec,
  questionTypeInfo,
  solutionOf,
  ViewMode,
} from "@jadwigo/lesson-kit";
import type { ReactElement, ReactNode } from "react";
import type { WrittenExample } from "../examples/index.ts";
import { resolve } from "../localize.ts";
import { setQuery, useLocation } from "../route.ts";
import { Label } from "../tool/label.tsx";
import { Switch } from "../tool/switch.tsx";
import { humanClass, scenariosIn, verdictOf } from "./question.ts";

const clock: Clock = { now: (): Instant => ({ perf: 0, wall: "2026-10-12T00:00:00.000Z" }) };

function Card({
  title,
  who,
  children,
}: {
  title: string;
  who: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section
      aria-label={title}
      className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4"
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-muted-foreground text-xs">{who}</span>
      </header>
      <div className="kid-step min-w-0">
        <LessonTheme>{children}</LessonTheme>
      </div>
    </section>
  );
}

export function ModesPanel({
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
  const { query } = useLocation();
  const showKey = query.get("key") === "1";
  const scenarios = scenariosIn(example, language);
  const scenario = scenarios.find((s) => s.outcome === "incorrect") ?? scenarios[0];
  const value = scenario === undefined ? null : resolve(scenario.value, language);
  const verdict = verdictOf(scenario);
  const common = { spec: pageSpec(spec) as never, language, category, clock };
  const prints = questionTypeInfo(spec.question_type)?.print !== "no";

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {spec.family !== "explain" && (
        <Card title="Solution" who="the learner, after moving on">
          <FamilyView
            {...common}
            mode={ViewMode.Solution}
            value={value as never}
            solution={solutionOf(spec) as never}
          />
        </Card>
      )}
      <Card title="Review" who="a parent, in the debrief">
        <div className="flex flex-col gap-4">
          <FamilyView
            {...common}
            mode={ViewMode.Review}
            value={value as never}
            answerKey={spec.key as never}
            verdict={verdict}
          />
          {scenario !== undefined && (
            <p className="rounded-lg border bg-background p-3 text-sm" data-review-scenario>
              {scenario.outcome === "correct"
                ? "Right"
                : `Not yet · ${humanClass(scenario.mistake_class)}`}
            </p>
          )}
        </div>
      </Card>
      <Card title="Preview" who="an author, in the editor or lint">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="show-key"
              size="sm"
              checked={showKey}
              onCheckedChange={(on) => setQuery({ key: on ? "1" : null })}
            />
            <Label htmlFor="show-key" className="text-xs">
              Show the key
            </Label>
          </div>
          <FamilyView
            {...common}
            mode={ViewMode.Preview}
            answerKey={spec.key as never}
            showKey={showKey}
          />
        </div>
      </Card>
      <Card
        title="Print"
        who={prints ? "the learner, on paper" : "this question type does not print"}
      >
        {prints ? (
          <FamilyView {...common} mode={ViewMode.Print} />
        ) : (
          <p className="text-muted-foreground text-sm">Not printed: answered on screen only.</p>
        )}
      </Card>
    </div>
  );
}
