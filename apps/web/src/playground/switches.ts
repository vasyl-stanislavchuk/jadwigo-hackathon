/**
 * The playground switches: product choices not made yet, each built both ways and picked in the URL
 * (?<name>=<value>). Every switch is sticky (route.ts carries it from view to view), is read the same
 * way (querySwitch) and shows in the controls panel on the page of its question type (switchesFor).
 *
 * Ported from david-learns frontend/src/playground/switches.ts with only the switches that change
 * what a question draws (dl-5ssh.34.6). The ones that changed a verdict (accents, one-letter slips,
 * shading side by side) left with judging, and the sound, motion, celebration, "not sure yet" and
 * diagnostic switches left with lessons.
 */

import { QuestionType, type QuestionTypeName } from "@jadwigo/lesson-kit";

export interface PlaygroundSwitch {
  /** The query key, as the URL writes it: ?clock_hands=free. */
  name: string;
  /** What the control is called in the panel. */
  label: string;
  values: readonly string[];
  /** Each value's words on its button; a value without one shows as written. */
  labels?: Readonly<Record<string, string>>;
  /** What plays when the URL says nothing: the conservative value. */
  default: string;
  /** The issue where the owner picks. */
  issue?: string;
  /** What the child sees and does at the moment the choice changes, in plain words. */
  context?: string;
  /** The product question, in one plain sentence. */
  question: string;
  /** What the lane that built it would pick, and why, in one sentence. */
  recommendation?: string;
  /** The question type whose page shows the switch. */
  question_type?: QuestionTypeName;
  /** The example where the switch visibly changes something. */
  example?: string;
}

export const SWITCHES: readonly PlaygroundSwitch[] = [
  {
    name: "mark",
    example: "stickers",
    label: "Tappable words",
    values: ["numbers", "words"],
    labels: { numbers: "Only numbers", words: "Every word" },
    default: "numbers",
    issue: "dl-w3.46.16",
    question_type: QuestionType.MarkNumbers,
    context:
      'In "mark the numbers you need", the child reads a word problem and taps the numbers needed to solve it. Numbers that do not matter are mixed in.',
    question:
      "Can the child tap only the numbers, or every word, so finding the numbers is part of the task?",
    recommendation:
      "Only numbers first. The task is choosing which numbers matter, and tapping words adds a search a child may not be ready for. Every word is a harder step for later.",
  },
  {
    name: "clock_hands",
    example: "set-half-past-seven",
    question_type: QuestionType.ClockSet,
    label: "Clock hands",
    values: ["geared", "free"],
    labels: { geared: "Hands move together", free: "Each hand on its own" },
    default: "geared",
    issue: "dl-w3.46.18",
    context:
      'In "set the clock", the child drags the hands of a clock face to show a time, such as half past seven.',
    question:
      "Does the hour hand move along with the minute hand, as on a real clock, or does the child place each hand on its own?",
    recommendation:
      "Moving together first, as on a classroom teaching clock, so the child sees the hands belong together. Each hand on its own once the child can read half past, because placing the hour hand between two numbers is the skill being learned.",
  },
  {
    name: "money_total",
    example: "pay-exact",
    question_type: QuestionType.MoneyPay,
    label: "Running total when paying",
    values: ["hidden", "shown"],
    labels: { hidden: "Hidden", shown: "Shown" },
    default: "hidden",
    issue: "dl-w3.46.19",
    context:
      'In "pay the amount", the child drags coins and notes into a tray to pay a price, such as 7 zł 50 gr.',
    question:
      "Does the child see the running total of the tray under it, or count the coins in the tray themselves?",
    recommendation:
      "Hidden. Counting the tray is the skill, and a total would turn the task into adding coins until a number matches.",
  },
  {
    name: "area_cells",
    example: "split-six-sevens",
    label: "Area model cells",
    values: ["squares", "dots", "open"],
    labels: { squares: "Squares", dots: "Dots", open: "Open rectangle" },
    default: "squares",
    issue: "dl-w3.46.20",
    question_type: QuestionType.AreaModel,
    context:
      'In "split the rectangle", the child builds a multiplication such as 6 × 7 as a rectangle, then cuts it into two easier products.',
    question:
      "How is the rectangle drawn: as unit squares, as dots in rows, or as an open rectangle where only the sides are counted?",
    recommendation:
      "Squares. One square per unit shows area, which the two cut pieces add up to. Dots stay for building times tables.",
  },
];

/** The switches the controls panel shows on the page of `question_type`. */
export function switchesFor(question_type: string | undefined): readonly PlaygroundSwitch[] {
  return SWITCHES.filter((s) => question_type !== undefined && s.question_type === question_type);
}

export function switchOf(name: string): PlaygroundSwitch | undefined {
  return SWITCHES.find((s) => s.name === name);
}
