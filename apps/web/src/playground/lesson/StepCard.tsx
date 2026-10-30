/**
 * One step of the draft as the builder draws it: its say, the family view in preview mode with the
 * key behind the page's switch, the rungs strip, and "Try it", which plays the step through the
 * playground's TryExample with its help released on the client, and the check's findings on it. A step the adapter skipped is a
 * card with its reason, so the rest of the lesson still draws. The chrome is English, as the
 * playground's is; every word a child would read is the draft's own.
 */

import type { Category, Language } from "@jadwigo/copy";
import type { Finding } from "@jadwigo/lesson-import";
import {
  type Clock,
  type FamilySpec,
  FamilyView,
  type Instant,
  LessonTheme,
  pageSpec,
  StepFrame,
  ViewMode,
} from "@jadwigo/lesson-kit";
import { type ReactElement, useState } from "react";
import type { WrittenExample } from "../examples/index.ts";
import { TryExample } from "../panels/TryExample.tsx";
import { Badge } from "../tool/badge.tsx";
import { Button } from "../tool/button.tsx";
import { rungsOf } from "./rungs.ts";
import { CommentsSlot } from "./slots.ts";
import { FindingList } from "./table/FindingList.tsx";

const clock: Clock = { now: (): Instant => ({ perf: 0, wall: "2026-10-30T00:00:00.000Z" }) };

/** The step as TryExample takes it: an example with no scenarios, so an answer is looked up in
 * its key alone. */
const exampleOf = (spec: FamilySpec): WrittenExample => ({
  id: spec.id,
  label: spec.id,
  question: {
    question_type: spec.question_type,
    family: spec.family,
    say: spec.say,
    data: spec.data,
    key: spec.key,
  },
  scenarios: [],
});

function RungsStrip({ spec }: { spec: FamilySpec }): ReactElement {
  return (
    <ul aria-label="Help rungs" className="flex flex-wrap gap-1.5 text-xs">
      {rungsOf(spec).map(({ rung, written }) => (
        <li key={rung} data-rung={rung} data-written={written}>
          <Badge variant={written ? "secondary" : "outline"}>
            {rung}: {written ? "written" : "empty"}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function StepCard({
  n,
  spec,
  findings,
  showKey,
  language,
  category,
}: {
  /** The step's place in the lesson, from 1. */
  n: number;
  spec: FamilySpec;
  /** The check's findings on this step, pinned under it. */
  findings: readonly Finding[];
  showKey: boolean;
  language: Language;
  category: Category;
}): ReactElement {
  const [trying, setTrying] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <section
      id={spec.id}
      aria-label={`Step ${spec.id}`}
      data-step={spec.id}
      className="flex scroll-mt-4 flex-col gap-3 rounded-2xl border bg-card p-4"
    >
      <header className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-semibold">
          {n}. {spec.id}
        </h3>
        <span className="text-muted-foreground text-xs">
          {spec.question_type} · {spec.family}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          aria-pressed={trying}
          onClick={() => {
            setTrying(!trying);
            setRound(round + 1);
          }}
        >
          {trying ? "Back to preview" : "Try it"}
        </Button>
      </header>
      <p className="text-sm" data-say>
        {spec.say}
      </p>
      <RungsStrip spec={spec} />
      <FindingList findings={findings} label={`Findings on ${spec.id}`} />
      <div className="kid-step min-w-0 rounded-xl border bg-background p-4">
        <LessonTheme>
          {trying ? (
            <StepFrame key={`${spec.id}|${round}`} stepId={spec.id}>
              <TryExample
                example={exampleOf(spec)}
                spec={spec}
                language={language}
                category={category}
                onFinished={() => setRound(round + 1)}
              />
            </StepFrame>
          ) : (
            <FamilyView
              spec={pageSpec(spec) as never}
              language={language}
              category={category}
              clock={clock}
              mode={ViewMode.Preview}
              answerKey={spec.key as never}
              showKey={showKey}
            />
          )}
        </LessonTheme>
      </div>
      <CommentsSlot step_id={spec.id} />
    </section>
  );
}

export function SkippedCard({
  step_id,
  reason,
  findings,
}: {
  step_id: string;
  reason: string;
  findings: readonly Finding[];
}): ReactElement {
  return (
    <section
      id={step_id}
      aria-label={`Step ${step_id}`}
      data-step={step_id}
      data-skipped
      className="flex flex-col gap-2 rounded-2xl border border-dashed p-4"
    >
      <h3 className="font-semibold">{step_id}</h3>
      <p className="text-muted-foreground text-sm">Not drawn: {reason}</p>
      <FindingList findings={findings} label={`Findings on ${step_id}`} />
      <CommentsSlot step_id={step_id} />
    </section>
  );
}
