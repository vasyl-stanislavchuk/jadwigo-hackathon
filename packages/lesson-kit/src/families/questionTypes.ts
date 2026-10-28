/**
 * Every question type, as a question type of its family. This is the catalog the playground shows:
 * a lesson author picks a family, then a question type that sets its options.
 *
 * `status` is where a type stands in the playground: `refined` once its design is settled (Choose,
 * Enter and Slots), `draft` while it plays but is still being worked on (Sequence, Group, Place and
 * Explain), `idea` while it is only proposed. dl-w3.72 measured every type against the contracts.
 */

import { Family, type FamilyName, QuestionType, type QuestionTypeName, Surface } from "./names.ts";
import type { Marks } from "./types.ts";

/** Where a question type stands in the playground. */
type Status = "refined" | "draft" | "idea";

/** Chi and Wylie's ladder of engagement: how much the question type asks the learner to produce. */
type Icap = "passive" | "active" | "constructive";

export interface QuestionTypeInfo {
  name: QuestionTypeName;
  family: FamilyName;
  /** What the owner calls it: "Missing number", "Put in order". */
  label: string;
  /** What the learner does, in one line. */
  does: string;
  /** When it fits, in one line. */
  fits: string;
  /** The family options this question type sets, as they appear in a step's data. */
  options: Record<string, string | number | boolean>;
  /** After a miss: the missed parts, or the whole step (the marks rule). */
  marks: Marks;
  status: Status;
  print: "yes" | "adapted" | "no";
  icap: Icap;
}

export const QUESTION_TYPES: QuestionTypeInfo[] = [
  // Choose
  {
    name: QuestionType.TrueFalse,
    family: Family.Choose,
    label: "True or false",
    does: "Decides whether one statement is true.",
    fits: "Judge one claim; quick, low evidence, never moves a fact to fluent.",
    options: { select: "one", layout: "binary" },
    marks: "parts",
    status: "refined",
    print: "no",
    icap: "active",
  },
  {
    name: QuestionType.Recognition,
    family: Family.Choose,
    label: "Pick the number",
    does: "Picks the result from a few numbers, or the one word or sign that fills the gap in a line, shown in its place.",
    fits: "Pick one of a few numbers, distractors from real mistakes; for a new or shaky fact. A line with one gap to choose for and nothing to type (morze or może, a time in words) is this one tap on a tile, not a menu (Slots addendum section 1).",
    options: { select: "one", layout: "grid" },
    marks: "parts",
    status: "refined",
    print: "no",
    icap: "active",
  },
  {
    name: QuestionType.LetteredChoice,
    family: Family.Choose,
    label: "Multiple choice",
    does: "Reads a task and picks one of up to five answers in a numbered list, then checks.",
    fits: "A contest-style choice of up to five with a Check button; text, a picture or a terminal; paper prints it lettered.",
    options: { select: "one", layout: "lettered" },
    marks: "parts",
    status: "refined",
    print: "yes",
    icap: "active",
  },
  {
    name: QuestionType.MultiSelect,
    family: Family.Choose,
    label: "Pick all that apply",
    does: "Picks every option that is true.",
    fits: "Select every option that is true; when more than one answer is right.",
    options: { select: "many", layout: "list" },
    marks: "parts",
    status: "refined",
    print: "adapted",
    icap: "active",
  },
  {
    name: QuestionType.MarkNumbers,
    family: Family.Choose,
    label: "Mark the numbers you need",
    does: "Taps the numbers in a word problem that the answer needs, then checks.",
    fits: "Before solving a word problem: which numbers matter and which are there to distract.",
    options: { select: "many", layout: "inline" },
    marks: "parts",
    status: "refined",
    print: "adapted",
    icap: "active",
  },
  {
    name: QuestionType.FractionCompare,
    family: Family.Choose,
    label: "Compare fractions",
    does: "Compares two fractions drawn as bars and picks <, = or > on three tiles; the sign shows in its place in the line.",
    fits: "Comparing fractions with a picture to reason from, before any rule.",
    options: { select: "one", layout: "grid", figure: "fraction_bars" },
    marks: "parts",
    status: "refined",
    print: "yes",
    icap: "active",
  },
  // Enter
  {
    name: QuestionType.Production,
    family: Family.Enter,
    label: "Type the answer",
    does: "Types one number, with no options to choose from, also one read off a number line.",
    fits: "Recall one number with no options: the strongest evidence for a derived fact. With a number-line figure, read a marked value off the line (scale and direction); Read the number line merged in here (dl-y3th).",
    options: { input: "number", entry: "keypad" },
    marks: "whole",
    status: "refined",
    print: "no",
    icap: "constructive",
  },
  {
    name: QuestionType.ShortText,
    family: Family.Enter,
    label: "Short typed answer",
    does: "Types a short answer: a maths word, a number in words or a command.",
    fits: "Type a short answer matched to forms written before the task; a miss says whether it was the accents, the case, a known mix-up or one slipped letter.",
    options: { input: "text", entry: "keyboard" },
    marks: "whole",
    status: "refined",
    print: "adapted",
    icap: "constructive",
  },
  {
    name: QuestionType.Expression,
    family: Family.Enter,
    label: "Type an expression",
    does: "Writes a short expression, such as 2 × 5, on a keypad with signs.",
    fits: "Turn groups, a picture or a repeated sum into a multiplication; judged by value and by form, never by the string.",
    options: { input: "expression", entry: "keypad" },
    marks: "whole",
    status: "refined",
    print: "adapted",
    icap: "constructive",
  },
  {
    name: QuestionType.Measure,
    family: Family.Enter,
    label: "Measure with a ruler",
    does: "Slides a ruler along a picture and types the length it reads.",
    fits: "Measure a drawn object in centimetres or millimetres; the ruler must be placed, so the zero end and the units are the skill.",
    options: { input: "number", entry: "keypad", figure: "ruler" },
    marks: "whole",
    status: "refined",
    print: "no",
    icap: "active",
  },
  // Slots
  {
    name: QuestionType.FillGaps,
    family: Family.Slots,
    label: "Fill in the gaps",
    does: "Fills one gap or several in a sentence, an equation or a command, each typed or chosen from a short list.",
    fits: "One missing number in an equation, several gaps in a line, a word to choose in each gap of a passage. The type names the layout; typed or chosen lives on the gap. One chosen gap and nothing typed is a Choose step instead (Slots addendum section 1).",
    options: { gaps: "one or several" },
    marks: "parts",
    status: "refined",
    print: "adapted",
    icap: "constructive",
  },
  {
    name: QuestionType.FillTable,
    family: Family.Slots,
    label: "Fill the table",
    does: "Fills the empty cells of a small table.",
    fits: "A few cells to fill in a table: a row of the times table, a fact family, three equivalent expressions.",
    options: { gaps: "table" },
    marks: "parts",
    status: "refined",
    print: "adapted",
    icap: "constructive",
  },
  {
    name: QuestionType.LabelPicture,
    family: Family.Slots,
    label: "Label the picture",
    does: "Puts the right label at each marker on a picture, then answers below it.",
    fits: "Blanks on a number line or a diagram, each a choice from a short list, with a number to type under it.",
    options: { gaps: "picture" },
    marks: "parts",
    status: "refined",
    print: "adapted",
    icap: "active",
  },
  {
    name: QuestionType.Column,
    family: Family.Slots,
    label: "Written calculation",
    does: "Works a sum digit by digit in columns, as on paper.",
    fits: "Written arithmetic, digit by digit, with given steps faded backwards.",
    options: { gaps: "cells", gap_kind: Family.Enter },
    marks: "parts",
    status: "refined",
    print: "yes",
    icap: "constructive",
  },
  {
    name: QuestionType.Pyramid,
    family: Family.Slots,
    label: "Number pyramid",
    does: "Fills the empty bricks of a pyramid where each brick is the sum of the two below it.",
    fits: "Addition and subtraction practice with a check built in: a missing brick may sit above or below.",
    options: { gaps: "pyramid" },
    marks: "parts",
    status: "refined",
    print: "yes",
    icap: "constructive",
  },
  {
    name: QuestionType.ClockRead,
    family: Family.Slots,
    label: "Read the clock",
    does: "Reads the time off a clock face and writes the hours and the minutes.",
    fits: "Telling the time on an analogue clock, in digits. The time in words, picked from a few, is a Pick the number with the clock in its stem (Slots addendum section 1).",
    options: { gaps: "several", figure: "clock" },
    marks: "parts",
    status: "refined",
    print: "yes",
    icap: "active",
  },
  {
    name: QuestionType.MoneyCount,
    family: Family.Slots,
    label: "Count the money",
    does: "Counts the coins and notes in a purse and writes the złote and the grosze.",
    fits: "Money in złote and grosze: adding coins of different values.",
    options: { gaps: "several", figure: "coins" },
    marks: "parts",
    status: "refined",
    print: "yes",
    icap: "constructive",
  },
  // Sequence
  {
    name: QuestionType.Order,
    family: Family.Sequence,
    label: "Put in order",
    does: "Puts steps or values in the right order, or builds a row from a bank of tiles.",
    fits: "Put steps or values in order; sequences, procedures, word order; an expression built from tiles that may repeat.",
    options: {},
    marks: "whole",
    status: "draft",
    print: "adapted",
    icap: "active",
  },
  // Group
  {
    name: QuestionType.Bucket,
    family: Family.Group,
    label: "Sort into groups",
    does: "Puts each item into one of two or more groups.",
    fits: "Sort items into categories; a property the learner should classify by. Cards may be words, maths or pictures.",
    options: { each_item: "one", layout: "zones" },
    marks: "parts",
    status: "draft",
    print: "adapted",
    icap: "active",
  },
  {
    name: QuestionType.Match,
    family: Family.Group,
    label: "Match the pairs",
    does: "Pairs each item on the left with one on the right by reordering the right column.",
    fits: "Pair left with right; facts to answers, words to meanings, an expression to an equal one.",
    options: { each_item: "one", capacity: 1, layout: "columns" },
    marks: "parts",
    status: "draft",
    print: "adapted",
    icap: "active",
  },
  // Place
  {
    name: QuestionType.NumberLinePlace,
    family: Family.Place,
    label: "Place on the number line",
    does: "Places a number on a line.",
    fits: "Place a value on a line, judged within a tolerance.",
    options: { surface: Surface.NumberLine },
    marks: "whole",
    status: "draft",
    print: "no",
    icap: "active",
  },
  {
    name: QuestionType.Hotspot,
    family: Family.Place,
    label: "Tap the picture",
    does: "Taps the right place on a picture.",
    fits: "Tap the region of a picture; geometry, diagrams, a screenshot.",
    options: { surface: Surface.Image },
    marks: "parts",
    status: "draft",
    print: "no",
    icap: "active",
  },
  {
    name: QuestionType.SpatialBuild,
    family: Family.Place,
    label: "Build a rectangle",
    does: "Builds a rectangle of dots for a multiplication.",
    fits: "Build an array; for a fact the learner cannot yet picture.",
    options: { surface: Surface.Grid },
    marks: "whole",
    status: "draft",
    print: "no",
    icap: "constructive",
  },
  {
    name: QuestionType.DrawGraph,
    family: Family.Place,
    label: "Draw a graph",
    does: "Draws a bar graph, a picture graph, a line plot, a dot plot, a line graph or a histogram from the data given.",
    fits: "Represent data: a count per category drawn as a height, a value over time as a line; grade 2 and 3 data units (Khan plotter).",
    options: { surface: Surface.Bars },
    marks: "parts",
    status: "draft",
    print: "adapted",
    icap: "constructive",
  },
  {
    name: QuestionType.ClockSet,
    family: Family.Place,
    label: "Set the clock",
    does: "Moves the hands of a clock to show a time.",
    fits: "Telling the time the other way round: from words or digits to the hands.",
    options: { surface: Surface.Clock, minute_step: 5, hands: "geared" },
    marks: "parts",
    status: "draft",
    print: "no",
    icap: "constructive",
  },
  {
    name: QuestionType.MoneyPay,
    family: Family.Place,
    label: "Pay the amount",
    does: "Pays an exact amount by moving coins and notes into a tray.",
    fits: "Money in złote and grosze: making an amount, and later with the fewest coins.",
    options: { surface: Surface.Coins, slots: 10 },
    marks: "whole",
    status: "draft",
    print: "no",
    icap: "constructive",
  },
  {
    name: QuestionType.FractionShade,
    family: Family.Place,
    label: "Shade the fraction",
    does: "Shades the parts of a bar, a circle or a rectangle that a fraction names.",
    fits: "What a fraction means: so many equal parts of a whole.",
    options: { surface: Surface.Fraction, shape: "bar" },
    marks: "whole",
    status: "draft",
    print: "adapted",
    icap: "constructive",
  },
  {
    name: QuestionType.AreaModel,
    family: Family.Place,
    label: "Split the rectangle",
    does: "Builds a rectangle for a multiplication, then splits it into two easier ones.",
    fits: "A harder multiplication by the distributive law: 6 × 7 as 6 × 5 and 6 × 2.",
    options: { surface: Surface.Grid, split: "one", cells: "squares" },
    marks: "parts",
    status: "draft",
    print: "no",
    icap: "constructive",
  },
  // Explain
  {
    name: QuestionType.Explain,
    family: Family.Explain,
    label: "Explain in your own words",
    does: "Explains an idea in their own words, typed today and spoken later.",
    fits: "A reason or a rule the learner should put into words, judged by the tutor against cited criteria written before the task.",
    options: { input: "text" },
    marks: "parts",
    status: "draft",
    print: "no",
    icap: "constructive",
  },
];

export interface FamilyInfo {
  name: FamilyName;
  label: string;
  /** What the learner does, in one line. */
  does: string;
  /** The committed value and the key, as code. */
  value: string;
  key: string;
}

const FAMILY_INFO: FamilyInfo[] = [
  {
    name: Family.Choose,
    label: "Choose",
    does: "Picks one option, or every option that applies.",
    value: "{chosen: [option_id]}",
    key: "{correct: [option_id], near?: {option_id: class}, worked_solution?}",
  },
  {
    name: Family.Enter,
    label: "Enter",
    does: "Types one value.",
    value: "{entered: string}",
    key: "{accept: [string], form?, case?, near?: {entry: class}, tolerance?, rule?}",
  },
  {
    name: Family.Slots,
    label: "Slots",
    does: "Fills the answer slots in a question body (a text, a table, a picture, a column, a pyramid), each typed or chosen, under one Check.",
    value: "{gaps: {gap_id: string}}",
    key: "{gaps: {gap_id: EnterKey | ChooseKey}}",
  },
  {
    name: Family.Sequence,
    label: "Sequence",
    does: "Puts items in order; the position matters.",
    value: "[item_id]",
    key: "{orders: [[item_id]]}",
  },
  {
    name: Family.Group,
    label: "Group",
    does: "Puts each item into a group; only the group matters.",
    value: "{items: {item_id: [group_id]}}",
    key: "{items: {item_id: [group_id]}, near?}",
  },
  {
    name: Family.Place,
    label: "Place",
    does: "Marks a position on a line, a picture or a grid, or draws a graph bar by bar.",
    value:
      "{at} | {points: [{x, y}]} | {rows, cols, split?} | {heights: {category_id: n}} | {hour_at, m} | {items: [denom]} | {shaded: [part]}",
    key: "{value, tolerance} | {targets, near?, require_all} | {rows, cols, either_order, split?} | {heights, tolerance?} | {h, m} | {amount_gr, fewest?} | {count}",
  },
  {
    name: Family.Explain,
    label: "Explain",
    does: "Explains a reason, aloud or typed; the tutor judges it.",
    value: "{text, spoken?}",
    key: "{criteria: [{id, text, cite}], criteria_version}",
  },
];

export function questionTypeInfo(name: string): QuestionTypeInfo | undefined {
  return QUESTION_TYPES.find((p) => p.name === name);
}

export function questionTypesOf(family: FamilyName): QuestionTypeInfo[] {
  return QUESTION_TYPES.filter((p) => p.family === family);
}

export function familyInfo(name: FamilyName): FamilyInfo {
  return FAMILY_INFO.find((f) => f.name === name) as FamilyInfo;
}
