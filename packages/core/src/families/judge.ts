import type { PartMark, Verdict } from "@jadwigo/contracts";
import { chooseMarks, chooseSolution, judgeChoose } from "./choose.ts";
import { enterMarks, enterSolution, judgeEnter } from "./enter/judge.ts";
import { groupMarks, groupSolution, judgeGroup } from "./group.ts";
import { judgePlace, placeMarks, placeSolution } from "./place/judge.ts";
import { QUESTION_TYPE_MARKS, type Question } from "./question.ts";
import { judgeSequence, sequenceSolution } from "./sequence.ts";
import { judgeSlots, slotsMarks, slotsSolution } from "./slots/judge.ts";

/**
 * One entry point per question code asks about a family question. Ported from david-learns
 * `frontend/src/families/judge.ts`.
 * - judge(): what code decides about one committed value, a verdict per part.
 * - pageMarks(): what the page is told after a miss, under the marks rule: the parts marked right
 *   or missed, or null to mark the whole question. Never a mistake class. A typed word's slipped
 *   letters are marked one by one (`l3`, or `g1.l3` in a gap, Enter addendum 3.6). A question type
 *   whose marks are `whole` never marks parts; a family may still mark the whole question where
 *   parts would give the answer away (two groups, a missed option).
 * - solutionOf(): the key as a value of the answer's shape, for the solution the learner sees once
 *   the question ends without a right answer (owner, 2026-10-12).
 *
 * Explain has no code judge: judge() refuses it, and v0 keeps it for later without a verdict.
 * The value is `unknown` on purpose: a judge reads any value, and one it cannot read is a miss
 * (`other_wrong`), never a throw.
 */

export function judge(question: Question, value: unknown): Verdict {
  switch (question.family) {
    case "choose":
      return judgeChoose(question.data, question.key, value);
    case "enter":
      return judgeEnter(question.data, question.key, value);
    case "slots":
      return judgeSlots(question.data, question.key, value);
    case "sequence":
      return judgeSequence(question.data, question.key, value);
    case "group":
      return judgeGroup(question.data, question.key, value);
    case "place":
      return judgePlace(question.key, value, question.data);
    case "explain":
      throw new Error("Explain has no code judge: it is kept for later without a verdict");
  }
}

export function pageMarks(question: Question, value: unknown, verdict: Verdict): PartMark[] | null {
  if (verdict.correct) return null;
  // A typed word's slipped letters (Enter addendum 3.6), under either marks rule: the field is one
  // part, and the letters inside it are what the child fixes.
  if (question.family === "enter") return enterMarks(verdict);
  if (QUESTION_TYPE_MARKS[question.question_type] === "whole") return null;
  switch (question.family) {
    case "choose":
      return chooseMarks(question.data, value, verdict);
    case "slots":
      return slotsMarks(question.data, question.key, value, verdict);
    case "group":
      return groupMarks(question.data, verdict);
    case "place":
      return placeMarks(question.data, verdict);
    default:
      return null;
  }
}

export function solutionOf(question: Question): unknown {
  switch (question.family) {
    case "choose":
      return chooseSolution(question.key);
    case "enter":
      return enterSolution(question.key);
    case "slots":
      return slotsSolution(question.key);
    case "sequence":
      return sequenceSolution(question.key);
    case "group":
      return groupSolution(question.key);
    case "place":
      return placeSolution(question.key, question.data);
    default:
      return null;
  }
}
