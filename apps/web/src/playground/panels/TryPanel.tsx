/**
 * Try it: one example in the real step frame, as a learner would meet it (owner, "scenarios to play
 * + data lookup"). Nothing is judged.
 * - Each written scenario is a button: it fills its value into the family view, as if the child had
 *   answered, and shows its state (praise, or try again with its marks and the help written for its
 *   mistake). It works for every family, drags and drawings included.
 * - A free answer, on Sprawdź, is looked up in the authored data (question.ts lookUp): the
 *   scenarios, then the key's accepted answer, then the key's known wrong answers. Anything else
 *   is not judged in the playground, and the panel beside it says so.
 * The live cell is TryExample.tsx, which the review tab reuses. The panel also shows what each
 * answer was in the data (owner-facing; the learner sees marks only).
 */

import type { Category, Language } from "@jadwigo/copy";
import { type FamilySpec, LessonTheme, StepFrame } from "@jadwigo/lesson-kit";
import { RotateCcw } from "lucide-react";
import { type ReactElement, useCallback, useState } from "react";
import type { WrittenExample } from "../examples/index.ts";
import { resolve } from "../localize.ts";
import { useReviewTheme } from "../review/useReviewTheme.ts";
import { queryTheme, setQuery, useLocation } from "../route.ts";
import { ControlGroup, Controls, Segmented } from "../shell/controls.tsx";
import { Badge } from "../tool/badge.tsx";
import { Button } from "../tool/button.tsx";
import { LearnerControls } from "./LearnerControls.tsx";
import { type Found, fillButtons, foundOf, humanClass, scenariosIn } from "./question.ts";
import { TryExample } from "./TryExample.tsx";
import type { TryAttempt, TryState } from "./tryState.ts";

/** What the panel says of an answer the authored data does not name. */
export const NOT_JUDGED =
  "Not judged in the playground: this answer is not in the example's scenarios";

type ThemeChoice = "light" | "dark" | "system";
const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "Day" },
  { value: "dark", label: "Night" },
  { value: "system", label: "System" },
];

/** Where in the authored data an answer was found. */
const VIA: Record<Found["via"], string> = {
  scenario: "a written scenario",
  key: "the key's accepted answer",
  near: "a known wrong answer in the key",
};

/** One commit as the owner reads it. */
export function AttemptView({ attempt }: { attempt: TryAttempt }): ReactElement {
  const { found } = attempt;
  return (
    <div
      className="flex flex-col gap-1.5"
      data-attempt={found === null ? "not-judged" : found.outcome}
    >
      <code className="text-xs break-all">{JSON.stringify(attempt.value)}</code>
      {found === null ? (
        <p className="text-muted-foreground text-xs" data-not-judged>
          {NOT_JUDGED}
        </p>
      ) : (
        <>
          <p className="text-sm">
            <Badge variant={found.outcome === "correct" ? "default" : "secondary"}>
              {found.outcome === "correct" ? "Right" : "Not yet"}
            </Badge>{" "}
            {found.outcome !== "correct" && (
              <span className="font-mono text-xs">{humanClass(found.mistake_class)}</span>
            )}{" "}
            <span className="text-muted-foreground text-xs" data-via={found.via}>
              {VIA[found.via]}
            </span>
          </p>
          {found.marks.length > 0 && (
            <ul className="flex flex-col gap-0.5 text-xs" data-marks>
              {found.marks.map((m) => (
                <li key={m.id} className="flex justify-between gap-2" data-mark={m.id}>
                  <span className="font-mono">{m.id}</span>
                  <span className={m.correct ? "" : "font-medium"}>
                    {m.correct ? "right" : "missed"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function TryPanel({
  example,
  spec,
  language,
  category,
  onNext,
}: {
  example: WrittenExample;
  /** The example's question as this page plays it. */
  spec: FamilySpec;
  language: Language;
  category: Category;
  /** Dalej after the step: the next example in the playground's order. */
  onNext?(): void;
}): ReactElement {
  const { query } = useLocation();
  const theme = queryTheme(query);
  useReviewTheme(theme);
  const [round, setRound] = useState(1);
  const [played, setPlayed] = useState<{ value: unknown; found: Found } | undefined>(undefined);
  const [state, setState] = useState<TryState | null>(null);
  const scenarios = scenariosIn(example, language);

  const again = (next?: { value: unknown; found: Found }): void => {
    setPlayed(next);
    setRound((r) => r + 1);
    setState(null);
  };
  const onFinished = useCallback(() => {
    setPlayed(undefined);
    setRound((r) => r + 1);
    setState(null);
    onNext?.();
  }, [onNext]);
  const ended = state !== null && state.phase !== "live";

  return (
    <>
      <section
        aria-label="The example"
        className="kid-step flex flex-col gap-6 rounded-2xl border bg-background p-6 max-[37.5rem]:-mx-4 max-[37.5rem]:rounded-none max-[37.5rem]:border-x-0 max-[37.5rem]:px-4"
        data-example={example.id}
      >
        <LessonTheme>
          <StepFrame key={`${spec.id}|${round}`} stepId={spec.id}>
            <TryExample
              key={`${round}|${language}|${category}`}
              example={example}
              spec={spec}
              language={language}
              category={category}
              played={played}
              onState={setState}
              onFinished={onFinished}
            />
          </StepFrame>
        </LessonTheme>
        {ended && (
          <Button variant="outline" onClick={() => again()} className="self-start">
            <RotateCcw aria-hidden />
            Try it again
          </Button>
        )}
      </section>

      <Controls>
        <LearnerControls
          language={language}
          category={category}
          question_type={spec.question_type}
        />
        <ControlGroup
          title="Day or night"
          hint="Holds the page by day or by night; System follows the laptop."
        >
          <Segmented<ThemeChoice>
            label="Theme"
            value={theme ?? "system"}
            options={THEME_OPTIONS}
            onChange={(next) => setQuery({ theme: next === "system" ? null : next })}
          />
        </ControlGroup>
        <ControlGroup
          title="Scenarios to play"
          hint="Each plays a written scenario: its answer filled in, as if the child had given it, and what it shows."
        >
          <ol className="flex flex-col gap-3" data-scenarios>
            {scenarios.map((s, i) => (
              <li
                key={JSON.stringify(s.value)}
                className="flex flex-col gap-1 text-sm"
                data-scenario={i}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-auto justify-start whitespace-normal py-1.5 text-left"
                  data-play={i}
                  onClick={() => again({ value: resolve(s.value, language), found: foundOf(s) })}
                >
                  {fillButtons(resolve(s.try, language), language, category)}
                </Button>
                <span className="text-muted-foreground text-xs" data-outcome={s.outcome}>
                  {s.outcome === "correct" ? "right" : `miss: ${humanClass(s.mistake_class)}`}
                </span>
              </li>
            ))}
          </ol>
        </ControlGroup>
        <ControlGroup
          title="What each answer was"
          hint="What the authored data says each answer is. The learner sees right or not yet, and marks per part."
        >
          {(state?.attempts.length ?? 0) === 0 && (
            <p className="text-muted-foreground text-xs">Nothing yet: answer the example.</p>
          )}
          <ol className="flex flex-col gap-3" data-attempts>
            {state?.attempts.map((a) => (
              <li key={a.n} className="flex flex-col gap-1 border-b pb-2 last:border-b-0">
                <AttemptView attempt={a} />
              </li>
            ))}
          </ol>
        </ControlGroup>
      </Controls>
    </>
  );
}
