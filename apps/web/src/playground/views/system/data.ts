/**
 * What the System page (/playground/system, dl-uukj.29.30) shows, as data: every colour role with
 * what it means and the ink it carries, the stage's six zones, and one example per family. The
 * values themselves are never here: they live in styles/foundation.css and the page reads them live.
 */

import { type CopyKey, TABLES } from "@jadwigo/copy";

export interface Role {
  /** The role's name without --jw-. */
  name: string;
  means: string;
  /** The ink a child reads on it, when it is a surface: the page shows that pair's ratio. */
  ink?: string;
}

export const ROLE_GROUPS: readonly { title: string; lead: string; roles: readonly Role[] }[] = [
  {
    title: "Paper",
    lead: "The page and its cards stay quiet, so the marks stand out.",
    roles: [
      {
        name: "ground",
        means: "The page: white exercise-book paper. By night one flat tone.",
        ink: "ink",
      },
      {
        name: "card",
        means:
          "Options, tiles, keys and fields: white on the white page, told apart by their line.",
        ink: "ink",
      },
      { name: "prompt-card", means: "The card that holds the question.", ink: "ink" },
      { name: "ink-soft", means: "Quiet words: small print, the link actions." },
      {
        name: "placeholder",
        means:
          "A field’s hint before the child writes, gone once the cursor is in. Also the keyboard’s frame on a neutral option and a soft button.",
      },
      {
        name: "line",
        means:
          "Every 2 px line, the edge a neutral tile stands on, and all that sets a card apart from the page.",
      },
    ],
  },
  {
    title: "The action",
    lead: "Blue ink: the one thing to press now. At rest until there is an answer to check.",
    roles: [
      { name: "act", means: "Sprawdź and Dalej, ready to press.", ink: "on-act" },
      { name: "act-edge", means: "The darker edge the action stands on, and its keyboard frame." },
      {
        name: "act-quiet",
        means: "Sprawdź before there is an answer: no edge, no hover.",
        ink: "on-act-quiet",
      },
      {
        name: "focus",
        means: "A typed field’s active edge and caret, and every mark the lesson draws in ink.",
        ink: "on-focus",
      },
    ],
  },
  {
    title: "Picked and help",
    lead: "A pick is chosen, not judged. Help is a clue, never a verdict.",
    roles: [
      { name: "pick", means: "A picked option, tile or key, and selected text.", ink: "pick-ink" },
      { name: "pick-edge", means: "The strong blue edge of a pick, and its keyboard frame." },
      { name: "help", means: "A rung of help: a warm yellow note.", ink: "help-ink" },
      { name: "help-edge", means: "The help note’s edge." },
    ],
  },
  {
    title: "The verdict",
    lead: "Green means right, red means a miss, and nothing else wears them.",
    roles: [
      { name: "right", means: "The right band and a right answer’s fill.", ink: "right-ink" },
      { name: "right-edge", means: "A right answer’s edge and the band’s tick." },
      { name: "right-act", means: "Dalej in the right band.", ink: "on-right-act" },
      {
        name: "miss",
        means: "The miss band and a missed part’s fill. Always dashed, always with words.",
        ink: "miss-ink",
      },
      { name: "miss-edge", means: "A missed part’s dashed edge." },
      { name: "miss-act", means: "“Pomóż mi” in the miss band.", ink: "on-miss-act" },
      { name: "rest", means: "The solution’s band after “Jeszcze nie wiem”.", ink: "rest-ink" },
    ],
  },
];

/** The stage's six zones, as the design draws them (claude-design/ui_kits/lesson/layout.jsx). */
export const ZONES: readonly { title: string; what: string; size: string }[] = [
  {
    title: "Top bar",
    what: "Only the close control. No progress, points or time.",
    size: "72 px, 56 px on a phone",
  },
  {
    title: "Instruction",
    what: "What to do, read aloud word for word. Two lines at most.",
    size: "22 px, 20 px on a phone",
  },
  {
    title: "Prompt card",
    what: "The question: numbers, a sentence, a picture. Listen on the right.",
    size: "32 px, 28 px on a phone",
  },
  {
    title: "Answer",
    what: "The only zone that changes with the question type.",
    size: "options 64 px, keys 56 px, gaps 12 px",
  },
  {
    title: "Help",
    what: "Opens under the answer after “Pomóż mi”. Never gives the result away.",
    size: "stays until the next try",
  },
  {
    title: "Footer, then the band",
    what: "The one action to press now. After a check it rises as a green or red band.",
    size: "action 56 px, the full width on a phone",
  },
];

/** The design's lines, added unreviewed: every `ds_*` line in copy/pl.ts, in its order there, so a
 * line a round adds shows here at once. The System page shows them, lessons only once a parent has
 * read them (dl-uukj.29.28). */
export const DESIGN_LINES: readonly CopyKey[] = (Object.keys(TABLES.pl) as CopyKey[]).filter((k) =>
  k.startsWith("ds_"),
);

/** The metaphor (claude-design/readme.md, guidelines/metaphor.html): each thing in a school
 * notebook, what it is on the lesson screen, and the role that draws it. */
export const METAPHOR: readonly {
  thing: string;
  means: string;
  role?: string;
}[] = [
  {
    thing: "Paper",
    means:
      "The page is white, and cards and fields are white sheets on it, told apart only by their 2 px line. By night the page and every card are one flat tone, the same notebook under a desk lamp.",
    role: "ground",
  },
  {
    thing: "Blue ink",
    means:
      "The child’s own marks: the pick, a typed field’s edge and caret, and Sprawdź. Ink shows only where the child has acted.",
    role: "focus",
  },
  {
    thing: "The teacher’s pen",
    means:
      "Green confirms. Red marks only the letters or digits to fix, as a teacher underlines, and never crosses out the whole answer. Neither is decoration.",
    role: "miss-edge",
  },
  {
    thing: "A sticky note",
    means:
      "Help sits next to the work, in warm yellow with a darker edge. It points to a smaller step and never holds the answer.",
    role: "help",
  },
  {
    thing: "Paper cut-outs",
    means:
      "Tiles and options have soft corners and stand on a pressed edge, so they can be picked up and pressed down.",
    role: "line",
  },
  {
    thing: "Handwriting",
    means: "Andika: a single-storey a and g, a clear 1 and 7, and every Polish letter.",
  },
  {
    thing: "What a notebook never has",
    means:
      "Scores, timers, streaks, confetti. A page is finished when the work is right, not when time runs out.",
  },
];

/** One role of the app-page register: the part that reads it, the custom property, and what it
 * sets. The System page's App pages section reads each value live from outside the lesson scope,
 * as a parent's page resolves it at :root. */
export interface AppPageRole {
  part: string;
  /** The custom property, with its dashes. */
  token: string;
  what: string;
}

/** The app-page register (dl-uukj.32.3): derived from the decisions in force, not yet decided as a
 * whole. "Gaps for the owner" asks the owner to confirm or veto it (dl-uukj.32.7). */
export const APP_PAGE_ROLES: readonly AppPageRole[] = [
  { part: "Page", token: "--page-prose-max", what: "The one centred column's width" },
  { part: "Heading 1", token: "--jw-size-prompt", what: "A page's title, bold" },
  { part: "Heading 2", token: "--jw-size-instruction", what: "A part of the page, bold" },
  { part: "Heading 3, body", token: "--jw-size-body", what: "Every line, a label, a field" },
  { part: "Small print", token: "--jw-size-small", what: "A small link, a note under a line" },
  { part: "A control", token: "--jw-control-height", what: "The action, a field, a settings row" },
  { part: "A toolbar control", token: "--jw-control-height-sm", what: "A control in a sub-row" },
  { part: "Paper", token: "--jw-card", what: "A field's and a card's ground" },
  { part: "Ink", token: "--jw-ink", what: "Every word" },
  { part: "Line", token: "--jw-line", what: "A field's, a card's and a notice's edge" },
  { part: "The action", token: "--jw-act", what: "The one button to press" },
  { part: "Corners", token: "--jw-radius-small", what: "A field's and a tile's corners" },
];

/** What the Zeszyt-everywhere refactor leaves for the owner (dl-uukj.32.7): each is answered on
 * this page; a yes needs no issue, a change becomes one. `token` names a value the page reads live
 * beside the gap. */
export const OWNER_GAPS: readonly {
  id: string;
  title: string;
  body: string;
  tokens: readonly string[];
}[] = [
  {
    id: "code-purples",
    title: "The terminal card's colours are still Grape's",
    body: "The --code-* tokens (packages/ui styles/tokens.css) still hold the Grape scheme's dark purples. Zeszyt has no dark code card of its own yet.",
    tokens: ["--code-surface", "--code-text", "--code-cmd", "--code-placeholder"],
  },
  {
    id: "readouts",
    title: "The readouts that were 3rem are 2.5rem now",
    body: "A task's big readout (FigureView's expression, the number line's target) reads --jw-size-target, 40 px. Before, FigureView and Line drew 48.",
    tokens: ["--jw-size-target"],
  },
  {
    id: "outcomes",
    title: "The overview draws 6 outcomes on 3 colours",
    body: "First try, got there, not yet, skipped, open and not asked share right, miss and plain, by design: icons tell them apart, so the page reads without colour too.",
    tokens: ["--kid-correct", "--kid-try-again", "--jw-card"],
  },
  {
    id: "register",
    title: "The app-page register is derived, not decided",
    body: "h1 on the prompt size, h2 on the instruction size, body on the body size, controls 48, the action's blue button on white paper (App pages, above). It follows from decisions in force; the owner confirms or vetoes it here.",
    tokens: ["--jw-size-prompt", "--jw-size-instruction", "--jw-size-body", "--jw-control-height"],
  },
];
