/**
 * Every state of one question, still (dl-w3.47): the family view fed through its own play props at
 * each moment of a step, so the reviewer sees the whole life of a type on one screen. Nothing runs:
 * the clock is fixed, a commit does nothing, and the feedback is written in, never judged.
 *
 * The miss state takes the example's first `incorrect` scenario with its written marks, so the
 * amber marks show as in a lesson, and its mistake class picks the help written for it. The right
 * and solution states seed the answer from the key (lesson-kit solutionOf): the step is closed in
 * both, so the key may be on the page.
 */

import type { Category, Language } from "@jadwigo/copy";
import {
  type Clock,
  type FamilySpec,
  type Feedback,
  HelpRung,
  type HelpRungNo,
  type Instant,
  lastMissOf,
  NO_MISS,
  type PlayProps,
  pageHelpOf,
  pageSpec,
  rungsWritten,
  solutionOf,
  tileMode,
  ViewMode,
} from "@jadwigo/lesson-kit";
import type { WrittenExample } from "../examples/index.ts";
import { resolve } from "../localize.ts";
import { humanClass, scenariosIn, verdictOf } from "../panels/question.ts";

/** A fixed instant: a still state records no latency. */
const STILL_CLOCK: Clock = {
  now: (): Instant => ({ perf: 0, wall: "2026-10-18T00:00:00.000Z" }),
};

/** The play props of any family, less the spec, which the state names beside them. */
type StillProps = Omit<PlayProps<FamilySpec["family"]>, "spec">;

export interface ReviewState {
  id: string;
  title: string;
  /** A line under the title, for a state that stands in for something not written yet. */
  note?: string;
  /** The question the view draws (the twin on rung 4). Null with a note when there is nothing to show. */
  spec: FamilySpec | null;
  props: StillProps | null;
}

const RUNG_TITLE: Record<Exclude<HelpRungNo, 0>, string> = {
  [HelpRung.Look]: "Help rung 1: look again",
  [HelpRung.Boost]: "Help rung 2: a smaller step",
  [HelpRung.Almost]: "Help rung 3: almost there",
  [HelpRung.Twin]: "Help rung 4: the twin",
};

export function statesOf(
  example: WrittenExample,
  spec: FamilySpec,
  language: Language,
  category: Category,
): ReviewState[] {
  const page = pageSpec(spec) as unknown as FamilySpec;
  const base: StillProps = {
    mode: ViewMode.Play,
    language,
    category,
    clock: STILL_CLOCK,
    live: true,
    attemptNo: 1,
    feedback: null,
    onCommit: () => {},
    around: { checking: false, moveOn: null },
  };
  const scenarios = scenariosIn(example, language);
  const first = scenarios[0];
  const missed = scenarios.find((s) => s.outcome === "incorrect");
  const rightScenario = scenarios.find((s) => s.outcome === "correct");
  const seed = (value: unknown) =>
    value === null || value === undefined ? {} : { initialValue: value as never };
  const solution = spec.family === "explain" ? null : solutionOf(spec);
  const rightValue =
    spec.family === "explain"
      ? rightScenario === undefined
        ? { text: "" }
        : resolve(rightScenario.value, language)
      : solution;
  const out: ReviewState[] = [{ id: "untouched", title: "Untouched", spec: page, props: base }];
  if (first !== undefined)
    out.push({
      id: "picked",
      title: "Answer picked, not yet checked",
      spec: page,
      props: { ...base, ...seed(resolve(first.value, language)) },
    });
  // Cards always stand in some order; tiles can leave a place empty. Options with nothing picked
  // say nothing (paper-behaviour README §3.3).
  if (spec.family !== "choose" && (spec.family !== "sequence" || tileMode(spec.data)))
    out.push({
      id: "incomplete",
      title: "Check pressed too soon",
      spec: page,
      props: { ...base, initialIncomplete: true },
    });
  if (missed !== undefined) {
    const feedback: Feedback = {
      kind: "try_again",
      index: 0,
      ...(missed.marks.length > 0 ? { parts: missed.marks } : {}),
    };
    out.push({
      id: "missed",
      title: "After a miss",
      note: `Written as ${humanClass(missed.mistake_class)}; the learner sees the marks only.`,
      spec: page,
      props: { ...base, attemptNo: 2, feedback, ...seed(resolve(missed.value, language)) },
    });
  }
  const praise: Feedback = { kind: "praise", index: 0 };
  out.push({
    id: "right",
    title: "Right",
    spec: page,
    props: { ...base, live: false, feedback: praise, ...seed(rightValue) },
  });
  if (solution !== null) {
    const movedOn: Feedback = { kind: "moved_on", index: 0 };
    out.push({
      id: "solution",
      title: "Solution, after moving on",
      spec: page,
      props: {
        ...base,
        live: false,
        feedback: movedOn,
        solution: solution as never,
        ...(missed === undefined ? {} : seed(resolve(missed.value, language))),
      },
    });
  }
  const lastMiss = missed === undefined ? NO_MISS : lastMissOf(spec, verdictOf(missed));
  const rungs = rungsWritten(spec);
  for (const rung of [HelpRung.Look, HelpRung.Boost, HelpRung.Almost, HelpRung.Twin] as const) {
    if (!rungs.includes(rung)) {
      out.push({
        id: `rung-${rung}`,
        title: RUNG_TITLE[rung],
        note: "No rung written yet.",
        spec: null,
        props: null,
      });
      continue;
    }
    const help = pageHelpOf(spec, rung, lastMiss);
    const twin = spec.help?.twin;
    const shown =
      rung === HelpRung.Twin && twin !== undefined
        ? (pageSpec(twin as FamilySpec) as unknown as FamilySpec)
        : page;
    out.push({
      id: `rung-${rung}`,
      title: RUNG_TITLE[rung],
      spec: shown,
      props: {
        ...base,
        attemptNo: rung >= HelpRung.Almost ? 2 : 1,
        around: { checking: false, moveOn: null, ladder: { help, ask: null, refused: false } },
      },
    });
  }
  return out;
}
