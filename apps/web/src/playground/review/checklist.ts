/**
 * The review checklist (dl-w3.47, the kit for the playground review in dl-w3.46): one list per
 * type, each line citing the decision or doc section it rests on. Where code can tell, the line is
 * answered by code (auto_yes, auto_no); where only a person can, it is a box to tick (check); where
 * the thing is not built, it says so (not_built). Nothing here is stored: the reviewer's marks and
 * notes are md's annotations (dl-w3.46).
 */

import { harshWordsIn } from "@jadwigo/copy";
import { type FamilySpec, rungsWritten, solutionOf } from "@jadwigo/lesson-kit";

export type ChecklistStatus = "check" | "not_built" | "auto_yes" | "auto_no";

interface ChecklistLine {
  id: string;
  text: string;
  /** The decision slug in the md context brain, or the doc section. */
  source: string;
  status(spec: FamilySpec): { status: ChecklistStatus; note?: string };
}

/** Every string a learner could read on the page side of the question, the help included. */
function learnerText(spec: FamilySpec): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) for (const x of v) walk(x);
    else if (v !== null && typeof v === "object")
      for (const [k, x] of Object.entries(v))
        if (k !== "key" && k !== "near" && k !== "boost_by_mistake") walk(x);
  };
  walk(spec);
  for (const card of Object.values(spec.help?.boost_by_mistake ?? {})) out.push(card.text);
  return out;
}

const CHECKLIST: ChecklistLine[] = [
  {
    id: "step-contract",
    text: "The step contract: one layout through StepShell, and nothing moves after an answer.",
    source: "decision 2026-10-17-the-step-contract-every-step-renders-through-one",
    status: () => ({ status: "auto_yes", note: "Every family view renders through StepShell." }),
  },
  {
    id: "miss-marks",
    text: "After a miss the answer stays, the missed parts are marked amber, and a mark clears when that part changes.",
    source:
      "decision 2026-10-12-exercise-types-are-interaction-families-with-question-types (the marks rule)",
    status: () => ({ status: "check", note: 'See "After a miss" under Every state.' }),
  },
  {
    id: "solution-view",
    text: "Once the step ends without a right answer, the child sees the solution beside their own answer.",
    source: "decision 2026-10-12-the-child-sees-the-correct-solution-once-a-step-ends-without-a-r",
    status: (spec) =>
      spec.family === "explain"
        ? { status: "check", note: "Explain has no solution to show: the tutor judges it." }
        : solutionOf(spec) !== null
          ? { status: "auto_yes" }
          : { status: "auto_no", note: "No solution value for this question." },
  },
  {
    id: "help-rungs",
    text: "Help rungs or hints are written: look again, a smaller step, almost there, the twin.",
    source: "decision 2026-10-16-help-ladder-the-planner-writes-every-rung",
    status: (spec) => {
      const rungs = rungsWritten(spec);
      return rungs.length === 0
        ? { status: "auto_no", note: "No rung written for this question." }
        : { status: "auto_yes", note: `Rungs written: ${rungs.join(", ")}.` };
    },
  },
  {
    id: "polish",
    text: "Polish a nine-year-old reads: short lines, school words, no adult phrasing.",
    source: "decision 2026-10-04-polish-lines-are-reviewed-by-an-ai-skill-against-a-cited-checkli",
    status: () => ({ status: "check" }),
  },
  {
    id: "tap-targets",
    text: "Every tappable control is at least the kid tap size, and every drag has a tap equivalent.",
    source: "docs/04-ui-baselines.md, docs/17 §2b",
    status: () => ({ status: "check", note: "Try it by finger." }),
  },
  {
    id: "light-dark",
    text: "Readable in light and in dark: switch the theme above and look again.",
    source: "decision 2026-10-11-lesson-pages-follow-the-laptop-s-light-or",
    status: () => ({ status: "check" }),
  },
  {
    id: "engagement",
    text: "Sounds and animations from a UI library, simple and few.",
    source: "decision 2026-10-18-2026-10-18-engagement-uses-simple-sounds-and-animations-from-ui",
    status: () => ({
      status: "not_built",
      note: "No sound or animation library is in the app yet; choosing one is the owner’s call.",
    }),
  },
  {
    id: "no-pressure",
    text: "No score, clock, streak, points, penalty, loss framing or countdown, and no harsh word.",
    source:
      "decision 2026-10-18-no-streaks-points-or-leaderboards, decision 2026-10-03-a-lesson-may-be-hard-and-a-pause-ends-it-no-streaks-points-sprin",
    status: (spec) => {
      const harsh = learnerText(spec).flatMap(harshWordsIn);
      return harsh.length === 0
        ? {
            status: "auto_yes",
            note: "No harsh word in the question’s lines; the page draws no score or clock.",
          }
        : {
            status: "auto_no",
            note: `Harsh words in the question: ${[...new Set(harsh)].join(", ")}.`,
          };
    },
  },
];

export interface ResolvedLine extends Omit<ChecklistLine, "status"> {
  status: ChecklistStatus;
  note?: string;
}

export function checklistFor(spec: FamilySpec): ResolvedLine[] {
  return CHECKLIST.map(({ status, ...line }) => ({ ...line, ...status(spec) }));
}
