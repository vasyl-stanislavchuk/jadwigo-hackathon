/**
 * What the playground tells the owner about each interaction family (dl-w3.37.16): when to choose
 * it, how its answers are judged (by packages/core; the playground itself judges nothing), how a
 * miss looks, and where it goes next. Owner-facing English, never shown
 * to a learner. The data model itself is lesson-kit's families/ and its question types questionTypes.ts; this file
 * is the reasoning around them, so the playground reads as the reference a lesson author (or
 * /dl-plan-drop) consults.
 *
 * The roadmap says what a family does now, what comes next, and what comes later, each step a
 * plain improvement a learner would notice.
 */

import type { FamilyName } from "@jadwigo/lesson-kit";

export interface FamilyGuide {
  family: FamilyName;
  /** When an author reaches for this family, in one or two sentences. */
  choose_when: string;
  /** When another family fits better. */
  not_for: string;
  /** How code judges an answer, in plain words. */
  judging: string;
  /** What the learner sees after a miss, and why (the marks rule). */
  after_a_miss: string;
  /** What ClassTime calls it, and where dl differs. */
  classtime: string;
  roadmap: { now: string[]; next: string[]; later: string[] };
}

export const GUIDES: Record<FamilyName, FamilyGuide> = {
  choose: {
    family: "choose",
    choose_when:
      'The answer is one of a few things the learner can see: a number, a claim, a picture, a lettered task. Several right options make it "pick all that apply". Marking the numbers a word problem needs, in its own sentence, is a pick of several too. A line with one gap to choose for and nothing to type (morze or może, a time in words, the sign between two fractions) is a Choose too: one tap on a tile, the pick shown in its place in the line.',
    not_for:
      "Recall with no options to lean on (Enter), or an answer the learner should build (Gaps, Place).",
    judging:
      "One option: right when it is the correct one; a distractor carries the mistake it was built from. Several: every option is its own part, a distractor picked or a right option missed; nothing is subtracted.",
    after_a_miss:
      'The option tried stays red with the word "tried". With several, only the distractors picked are marked; a miss that is only a missed option marks the whole set, because marking it would show it is right.',
    classtime:
      "BOOLEAN, SINGLE_CHOICE and MULTIPLE_CHOICE. dl names options by id, not by position, so a shuffle never changes what an answer means.",
    roadmap: {
      now: [
        "True or false, pick the number, A to E with Check, pick all that apply (dl-w3.25)",
        "Text with TeX, numbers, dot arrays, pictures and rows of pictures as options, each picture keeping its box",
        "A boost after the first miss and the worked solution after the second",
        // lane A: text (dl-w3.61.2)
        "Mark the numbers you need: a word problem with each number a toggle in its sentence, judged per number, a number taken before one left out (dl-w3.61.2)",
        // end lane A
        // lane C registry (dl-uukj.29.121)
        "A line with its pick in place: one gap to choose for in a sentence or a comparison, the options as tiles under the card (Slots addendum section 1)",
        "Compare two fractions drawn as bars of one length: <, = and > as three tiles, the sign shown between the fractions (fraction_compare, dl-w3.61.7)",
        // end lane C registry
      ],
      next: [
        "Whether a pick-all says how many options are right (an owner question)",
        // lane A: text (dl-w3.61.2)
        "Whether the child taps only the numbers or every word in mark the numbers (the mark switch, dl-w3.46.16)",
        // end lane A
        "More fraction pictures to compare: circles side by side, and three fractions in order",
      ],
      later: ["Options read aloud and picked by voice, by letter or by words"],
    },
  },
  enter: {
    family: "enter",
    choose_when:
      "The learner should produce one value from memory: a fact, a word, a command. The strongest evidence of recall, and with latency, of fluency.",
    not_for: "An answer with several parts (Gaps) or one that is a position (Place).",
    judging:
      "A number is right within the key's tolerance; text is right when it equals a form listed before the task, ignoring spaces at its ends and, only where the key says so, case or accents. A word one letter off, or right but for its accents, is named as such. An expression is right when its value matches and it has the form the key asks for, so 5 × 2 counts for 2 × 5 and 2 + 2 + 2 + 2 + 2 does not. A miss takes the author's named class, then the number rule (times tables, a missing number, a number line), or for an expression its shape (a sum where a product was asked, the result typed instead of the expression) before its value.",
    after_a_miss:
      "The answer stays so the learner can fix it, red until the first change. The right answer is never shown until the step ends.",
    classtime:
      "TEXT. ClassTime learns its key from the teacher after the answer; dl writes every accepted form before the task and never normalises the learner's answer.",
    roadmap: {
      now: [
        "A number on the big keypad, text on a keyboard field",
        "Reading a value off a number line",
        "An expression on a keypad with × ÷ + − and brackets, judged by value and form (dl-w3.51.1)",
        "Measuring a drawn object with a ruler the child slides, by finger or arrow keys, in centimetres or millimetres (dl-w3.51.4)",
        // lane A: text (dl-w3.61.2)
        "A short typed word: a maths word or a number in words, with its misses named as missing accents, case, a known mix-up or one slipped letter, the text kept as typed (dl-w3.61.2, dl-w3.28)",
        // end lane A
      ],
      next: [
        "Units after a number (cm, zł)",
        // lane A: text (dl-w3.61.2)
        "Whether missing accents and a one-letter slip count as right (the diacritics and typo switches, dl-w3.46.16)",
        // end lane A
      ],
      later: ["Spelling tolerance as its own judged criterion, recorded, never silently forgiven"],
    },
  },
  slots: {
    family: "slots",
    choose_when:
      "A sentence, an equation or a command with one or more holes, each typed or chosen from a short list. One fact asked three ways, or a reading passage. Also the layouts a child fills on paper: a written column sum, a number pyramid, the time read off a clock, the money in a purse.",
    not_for:
      "A single value with nothing around it (Enter), or a line with one gap to choose for and nothing to type, which is one tap on a tile (Choose).",
    judging:
      'Every gap is its own part. A typed gap follows Enter\'s rules; a chosen gap is right when it is the accepted option. An answer that belongs in another gap is "gap_swap".',
    after_a_miss:
      "Every gap is marked: right ones green so the learner keeps them, missed ones red. Each mark clears when that gap changes.",
    classtime:
      "GAP and CLOZE in one family: a gap is typed (BLANK) or chosen (CHOICES), and a text may mix them.",
    roadmap: {
      now: [
        "Fill in the gaps: one missing number, several gaps in a sentence, a choice at each gap in a passage, typed or chosen per gap (fill_blank and cloze merged into it, dl-uukj.29.121)",
        "A gap inside bold, in a list or in a table cell, with maths drawn as TeX",
        "Mixed typed and chosen gaps in a command, with a menu that opens on Enter and never moves the sentence",
        "A table of cells to fill, row by row: a times-table row, a fact family, Khan's equivalent expressions",
        "Labels on a picture: a menu at each blank of a number line, the product typed under it",
        // lane C: gaps layouts (dl-w3.61.4)
        "Written column arithmetic on squared paper, cell by cell (dl-w3.32): addition and multiplication by one digit with the carry a square above its column, subtraction with the lending digit crossed out, and given columns faded backwards from item to item",
        "Number pyramids of one brick size, each brick the sum of the two below, filled from the bottom row up",
        // end lane C
        // lane D: clock (dl-w3.61.5)
        "Read the clock: a clock face above typed hours and minutes, with the half-past trap named (dl-w3.61.5). The time in words is a Choose step",
        // end lane D
        // lane E: money (dl-w3.61.6)
        "Count a purse of złote and grosze, drawn as coins and notes, into two gaps (dl-w3.61.6)",
        // end lane E
      ],
      next: [
        // lane C: gaps layouts (dl-w3.61.4)
        'A column read aloud one digit at a time, "jedności: 5, przenoszę 1"',
        // end lane C
      ],
      later: ["Voice that takes one gap at a time"],
    },
  },
  sequence: {
    family: "sequence",
    choose_when:
      "The order is the knowledge: smallest to largest, the steps of a method, words into a sentence.",
    not_for: "Sorting into groups, where position does not matter (Group).",
    judging:
      "Right when the order is one of the accepted orders. A miss gets one class for the whole order: reversed, two neighbours swapped, one card misplaced, or another order. With tiles, the places are judged by what their tiles say, and a miss can also be a tile that does not belong or a tile left out.",
    after_a_miss:
      "The order stays as the learner left it and the whole list is red until the next move. A position is never marked: that would say where a card belongs.",
    classtime:
      "SORTER. ClassTime stores one order as its authored order; dl lists every accepted order. Khan Academy's orderer is the tile bank.",
    roadmap: {
      now: [
        "Drag a card, tap a card then its place, or the same from a keyboard",
        "A bank of tiles and numbered places, when a tile repeats or stays unused (Khan Academy's orderer)",
      ],
      next: ["Several accepted orders shown in the editor", "A two-row layout for long cards"],
      later: ["Ordering steps of a worked example the learner just saw"],
    },
  },
  group: {
    family: "group",
    choose_when:
      "The learner classifies by a property: even and odd, nouns and verbs, facts by their answer. Match is a Group whose groups each take one card.",
    not_for: "A sequence (Sequence) or one answer (Choose).",
    judging:
      'Every card is its own part, right when its groups are exactly the key\'s. A card left unplaced is "not_placed"; a group the author named as tempting carries its mistake.',
    after_a_miss:
      "Cards stay where they were put. With three or more groups each card is marked; with two the whole step is, because a marked card could only belong in the other group.",
    classtime:
      "CATEGORIZER and CATEGORIZER_MULTIPLE (a card in several groups). ClassTime's grid is too dense for a child; dl uses trays and cards.",
    roadmap: {
      now: [
        "Drag or tap a card into a group",
        "Match in two columns: the left column fixed, the right one reordered until each row is a pair (dl-w3.51.7)",
        "Cards with TeX and pictures",
      ],
      next: [
        "Bucket and match as blocks (dl-w3.17, dl-w3.16)",
        "A card in several groups shown as copies",
      ],
      later: ["Plain words for a TeX card, so a screen reader hears the maths"],
    },
  },
  place: {
    family: "place",
    choose_when:
      "The answer is a position: a value on a number line, a spot on a picture, a rectangle on a grid of dots, or a height per bar on a graph the learner draws. Also the hands of a clock to set, coins put in a tray to pay, the parts of a shape to shade, and the split of a rectangle.",
    not_for: "An answer that is a word or a number typed in (Enter).",
    judging:
      "A line: within the tolerance, else the number-line rule (off by a tick, the scale misread, the direction reversed). A picture: every tap is a part, inside a target region or a named tempting one. A grid: rows and cols, either way round, and with a split, the split as a second part. A graph: every bar is a part, right within the tolerance, one step off, or further off. A clock: each hand is a part, the hour hand right within half the gap between two numbers. Coins: any set with the right total, or the fewest when the key asks. A shape: any parts of the right count.",
    after_a_miss:
      "The marker, taps, rectangle, bars, hands, coins or shading stay. The line, the tray and the shape are red as a whole, and a grid marks its size and its split apart. Each tap on a picture, each bar on a graph and each hand of a clock is marked, because a marked bar still has to be counted again.",
    classtime:
      "HOTSPOT for pictures, in fractions of the picture rather than pixels. ClassTime has no number line or array.",
    roadmap: {
      now: [
        "Place on a number line, tap a picture, build a rectangle",
        "Fractions on a line: quarters, halves and tenths, ticks labelled as fractions or mixed numbers, a finer snap than the step (dl-w3.55)",
        "Draw a bar graph, a picture graph, a line plot or a dot plot: a height per bar by a tap, a drag or the arrow keys, with the data to draw in the stem (dl-w3.51.3)",
        // lane B: place core (dl-w3.61.3)
        "A picture by keyboard: a crosshair on a 20 by 20 grid moved by the arrow keys, Enter to tap, Backspace to lift the last tap (dl-w3.61.3)",
        "A line graph, a point per category joined by a line, and a histogram, bars with no gaps over labelled bin edges (dl-w3.61.3)",
        // end lane B
        // lane D: clock (dl-w3.61.5)
        "Set the clock: tap or drag each hand, or arrow keys, the hour hand geared to the minutes or free, each hand marked on its own (dl-w3.61.5)",
        // end lane D
        // lane E: money (dl-w3.61.6)
        "Pay an amount from a bank of coins into a tray of places, any coins with the right total, or the fewest (dl-w3.61.6)",
        // end lane E
        // lane F: fractions and area (dl-w3.61.7)
        "Shade a fraction of a bar, a circle (a pizza) or a rectangle, a part per tap or per Space; any parts of the right count are right (fraction_shade, dl-w3.61.7)",
        "Split the rectangle: build 6 × 7 on the grid, then split it once into 6 × 5 and 6 × 2, by a tap on the strip above or the arrow keys (area_model, dl-w3.61.7)",
        // end lane F
      ],
      next: [
        "A region editor for authors (dl-w3.27)",
        "Khan plotter items on the draw-a-graph page once the grade 2 and 3 data units are pulled (dl-r772.7)",
        // lane B: place core (dl-w3.61.3)
        "Histograms in lessons once the owner decides whether a third or fourth grader meets them (dl-w3.46.9)",
        // end lane B
        // lane D: clock (dl-w3.61.5)
        "The owner picks geared or free hands for a first lesson (clock_hands, dl-w3.46.18)",
        // end lane D
        // lane E: money (dl-w3.61.6)
        "The owner picks whether a running total shows under the tray (money_total, dl-w3.46.19)",
        // end lane E
        // lane F: fractions and area (dl-w3.61.7)
        "The owner picks: any parts of a fraction or only parts side by side, and squares, dots or an open rectangle for the area model (dl-w3.46.20)",
        // end lane F
      ],
      later: [
        "A keypad with a fraction bar, so a fraction read off a line is typed without the keyboard",
        "Half pictures on a picture graph, as Khan's plotter draws them",
      ],
    },
  },
  explain: {
    family: "explain",
    choose_when:
      "The learner should say why: a strategy, a reason, a rule in their own words. The constructive end of ICAP.",
    not_for: "Anything with one exact form: code judges those.",
    judging:
      "The tutor judges each criterion, written and cited before the task, and keeps the version it used. Code only records the verdict per criterion. A typed explanation in a lesson is judged after the lesson, in /dl-debrief, and the judgement reaches the report (decision 2026-10-16-typed-explanations-judged-after-the-lesson). The playground judges nothing: it shows the written scenarios.",
    after_a_miss:
      "The text stays to add to. Each criterion is a dot under the text, green or red, with none of its words: the criteria are never shown to the learner. No twin: the last rung of help is an example explanation.",
    classtime:
      "ESSAY and the live app's AI-graded free text against a versioned rubric, which is close to dl's rule that criteria come first.",
    roadmap: {
      now: [
        "A typed explanation in a kid-sized field with a soft minimum, a mark per criterion; the playground shows the written scenarios and judges nothing",
        "Items of our own, in Polish and English, with cited criteria",
      ],
      next: [
        "Spoken answers through the voice tutor, with the typed field kept (dl-i952.13)",
        "Khan free-response items, once a person writes their criteria",
      ],
      later: ["Criteria shared across lessons per skill"],
    },
  },
};
