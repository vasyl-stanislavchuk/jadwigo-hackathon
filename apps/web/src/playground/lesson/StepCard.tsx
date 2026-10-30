/**
 * One step of the draft as the builder draws it: its say, the family view in preview mode with the
 * key behind the page's switch, the rungs strip, and "Try it", which plays the step through the
 * playground's TryExample with its help released on the client, the check's findings on it, and
 * "Data", the step's JSON beside the drawing (data/). A step the adapter skipped is a card with its
 * reason, so the rest of the lesson still draws. The chrome is English, as the
 * playground's is; every word a child would read is the draft's own.
 */

import type { Category, Language } from "@jadwigo/copy";
import type { Finding, QuestionStep } from "@jadwigo/lesson-import/file";
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
import { type ReactElement, useRef, useState } from "react";
import type { WrittenExample } from "../examples/index.ts";
import { TryExample } from "../panels/TryExample.tsx";
import { Badge } from "../tool/badge.tsx";
import { Button } from "../tool/button.tsx";
import { StepData } from "./data/StepData.tsx";
import { useRenderCheck } from "./render/useRenderCheck.ts";
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
  draft_id,
  path,
  spec,
  findings,
  showKey,
  language,
  category,
  onRendered,
  source,
  previous,
}: {
  /** The step's place in the lesson, from 1. */
  n: number;
  /** The draft on the page, so a comment goes to it and not to the newest. */
  draft_id: string;
  /** Where the step is in the lesson file, for its render findings. */
  path: string;
  spec: FamilySpec;
  /** The check's and the render check's findings on this step, pinned under it. */
  findings: readonly Finding[];
  showKey: boolean;
  language: Language;
  category: Category;
  /** Where the render rules' findings for the drawn preview go; none, and they do not run. */
  onRendered?: ((step_id: string, findings: Finding[]) => void) | undefined;
  /** The step as the draft holds it, and as the draft before held it (Data). */
  source: QuestionStep;
  previous?: QuestionStep | undefined;
}): ReactElement {
  const [showData, setShowData] = useState(false);
  const [trying, setTrying] = useState(false);
  const [round, setRound] = useState(0);
  const drawn = useRef<HTMLDivElement>(null);
  // The rules read the preview; while the step is tried, its last findings stand.
  useRenderCheck(
    drawn,
    { step_id: spec.id, path },
    [spec, showKey],
    trying ? undefined : onRendered,
  );
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
          aria-pressed={showData}
          onClick={() => setShowData(!showData)}
        >
          Data
        </Button>
        <Button
          variant="outline"
          size="sm"
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
      {showData && (
        <StepData
          source={source}
          path={path}
          findings={findings}
          previous={previous}
          showKey={showKey}
        />
      )}
      <div ref={drawn} className="kid-step min-w-0 rounded-xl border bg-background p-4">
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
      <CommentsSlot draft_id={draft_id} step_id={spec.id} />
    </section>
  );
}

export function SkippedCard({
  draft_id,
  step_id,
  reason,
  findings,
}: {
  draft_id: string;
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
      <CommentsSlot draft_id={draft_id} step_id={step_id} />
    </section>
  );
}
