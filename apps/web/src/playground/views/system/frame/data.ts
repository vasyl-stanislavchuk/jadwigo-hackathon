/**
 * What the System page's Lesson frame group says (dl-uukj.29.46), as data: the frame's 18 rules
 * (lesson-frame/README.md §1, rules 3 and 4 as paper-behaviour/README.md §6 amends them), the five
 * frames and their measurements (lesson-frame §2, picked by components/parts/frame.ts), the step's phases and transitions (lesson-frame
 * §5, paper-behaviour §4), and one table per event (paper-behaviour §3). The sections draw these
 * beside the live parts, so a rule changed in a README is changed here once.
 */

/** A section anchor of the group, for a rule to point at the part that shows it. */
type FrameAnchor =
  | "frame-rules"
  | "frame-frames"
  | "frame-footer"
  | "frame-life"
  | "frame-help"
  | "frame-tray"
  | "frame-scroll"
  | "frame-media"
  | "frame-progress";

export interface FrameRule {
  title: string;
  body: string;
  /** Where on this page it can be tried. */
  see: FrameAnchor;
  /** Set when paper-behaviour/README.md §6 replaced the lesson frame's words. */
  amended?: boolean;
}

/** The lesson frame's 18 rules (lesson-frame/README.md §1). */
export const FRAME_RULES: readonly FrameRule[] = [
  {
    title: "Footer in one place",
    body: "One footer is pinned to the bottom on every step and in every state, 96 px tall. After a check it turns into the verdict band at the same height. No step draws its main action anywhere else.",
    see: "frame-footer",
  },
  {
    title: "Tap picks, Sprawdź checks",
    body: "Sprawdź is quiet until the answer is complete: an option picked, or every field filled. After a miss it stays quiet until a marked part changes.",
    see: "frame-footer",
  },
  {
    title: "Quiet Sprawdź points the way",
    body: "A press while it is quiet does not check. Before a miss it moves the focus to the first empty field, and after one to the first marked field, which it selects.",
    see: "frame-tray",
    amended: true,
  },
  {
    title: "Enter",
    body: "Before a miss, Enter goes to the next empty field and checks once every field is filled. After a miss it walks every field in order and checks only from the last one once a marked part changed. After a verdict it presses Dalej.",
    see: "frame-tray",
    amended: true,
  },
  {
    title: "Help from the first frame",
    body: "The bulb button sits at the footer’s left. “Jeszcze nie wiem” lives only at the end of each help note, never in the footer.",
    see: "frame-help",
  },
  {
    title: "Help ladder",
    body: "One note that grows: each new rung joins under a 1 px line, older rungs turn muted, and a counter reads “n z m”. The view scrolls the least that shows the new rung.",
    see: "frame-help",
  },
  {
    title: "The answer sits in the page",
    body: "On a phone the step is one scroll, as on a laptop: instruction, card, answer, help, then the footer. Only the keypad and the letter row are docked above the footer, as the system keyboard is (Choose addendum 1.1, owner 2026-10-26).",
    see: "frame-tray",
    amended: true,
  },
  {
    title: "Tools fold",
    body: "On a phone the docked keypad or letter row folds away, with a 56 px square arrow, a chevron, on its top line at the right. It folds by itself when help opens, and a tap on a field opens it again.",
    see: "frame-tray",
    amended: true,
  },
  {
    title: "No keypad on a laptop",
    body: "The keyboard types, and there is no Narzędzia. A step with signs (an expression, an equation, a decimal) shows its sign keys in a row under the field, 56 × 56, while the step is open (Enter addendum 4.2).",
    see: "frame-tray",
    amended: true,
  },
  {
    title: "Active field",
    body: "The pick’s fill inside a 2 px ink edge, and a 3 px caret. No glow.",
    see: "frame-tray",
  },
  {
    title: "Marks",
    body: "A miss marks only the part to fix, in the miss fill with a 2 px dashed edge, and in a word only the letters to fix.",
    see: "frame-life",
  },
  {
    title: "Once a step ends",
    body: "Right or the solution: the keypad and letter row are not drawn, but their space is kept, so nothing moves. The solution fills that space, beside the child’s answer.",
    see: "frame-life",
  },
  {
    title: "Progress",
    body: "A step bar in the fixed top bar. It moves when a step ends, never on a miss, help or pause. A review round at the end gets its own bar, “Powtórka”.",
    see: "frame-progress",
  },
  {
    title: "Top bar edge",
    body: "A 2 px line shows under the top bar only while content is scrolled under it.",
    see: "frame-scroll",
  },
  {
    title: "More below",
    body: "A 48 px square arrow sits on the tray’s or the footer’s top line while content continues below. One tap scrolls 70 % of the view, and it goes at the end.",
    see: "frame-scroll",
  },
  {
    title: "Pictures",
    body: "A question picture is at most 40 % of the scroll area’s height. Beside sound it is a thumbnail, 96 px on a phone and 120 px on a laptop. A tap opens a full-screen sheet in the page colour, with no dimming.",
    see: "frame-media",
  },
  {
    title: "Formulas",
    body: "× = + − are Andika text and never break across lines. KaTeX draws only fractions, powers and roots, with its digits in Andika.",
    see: "frame-media",
  },
  {
    title: "Phone spelling",
    body: "The system keyboard opens with the step and closes on Sprawdź, so the band and marks are seen. The Polish letter row rides on top of the keyboard.",
    see: "frame-tray",
  },
];

/** The five rules under every event (paper-behaviour/README.md §3.1). */
export const UNDER_EVERYTHING: readonly string[] = [
  "Nothing checks by itself. Only Sprawdź or Enter checks.",
  "Scroll follows the child’s own action, by the least distance that shows the result, in 320 ms. It jumps under reduced motion, and nothing scrolls while a finger is on the screen.",
  "Focus stays in the answer until the step ends, then moves to Dalej.",
  "Enter does the next useful thing: the next field, then check, then Dalej.",
  "New things appear below what the child is looking at, so nothing moves under a finger.",
];

export type FrameId = "phone" | "tablet" | "tablet-sideways" | "laptop" | "phone-sideways";

export interface FrameKind {
  id: FrameId;
  label: string;
  width: number;
  height: number;
  /** When the step takes this frame (lesson-frame §2). */
  when: string;
  /** Whether lessons draw it. A frame designed but not yet built shows dashed until it is. */
  built: boolean;
  /** Picked only on a touch screen: the System page previews it with the playground's ?input=touch. */
  touch: boolean;
}

/** The five frames, picked by input and shape, not width alone (lesson-frame §2). */
export const FRAME_KINDS: readonly FrameKind[] = [
  {
    id: "phone",
    label: "Phone",
    width: 390,
    height: 844,
    when: "Narrower than 600",
    built: true,
    touch: false,
  },
  {
    id: "tablet",
    label: "Tablet upright",
    width: 768,
    height: 1024,
    when: "Touch, upright and 600 or wider: the tray docked, 420 wide",
    built: true,
    touch: true,
  },
  {
    id: "tablet-sideways",
    label: "Tablet sideways",
    width: 1024,
    height: 768,
    when: "Touch, sideways and 500 or taller: the keypad docked right",
    built: true,
    touch: true,
  },
  {
    id: "laptop",
    label: "Laptop",
    width: 1280,
    height: 800,
    when: "A real keyboard and pointer, 600 or wider",
    built: true,
    touch: false,
  },
  {
    id: "phone-sideways",
    label: "Phone sideways",
    width: 844,
    height: 390,
    when: "Touch, sideways and under 500 tall: the keypad docked right, 4 × 3",
    built: true,
    touch: true,
  },
];

/** The measurement table (lesson-frame §2): one row per thing, one cell per frame, in FRAME_KINDS order. */
export const MEASURES: readonly { thing: string; cells: Record<FrameId, string> }[] = [
  {
    thing: "Top bar",
    cells: {
      phone: "56: close 48, bar 16",
      tablet: "64",
      "tablet-sideways": "72",
      laptop: "72: close 48 at x 32, bar 720 at x 280",
      "phone-sideways": "48, bar 12",
    },
  },
  {
    thing: "Column and gutters",
    cells: {
      phone: "358, 16",
      tablet: "600, 84",
      "tablet-sideways": "600 + keypad 304, 44",
      laptop: "720, 280 (wide answers 1120, 80)",
      "phone-sideways": "about 488 + keypad 300, 16",
    },
  },
  {
    thing: "Scrolls",
    cells: {
      phone: "the page, under the footer and the docked keypad",
      tablet: "the page, under the footer and the docked keypad",
      "tablet-sideways": "the column, keypad fixed",
      laptop: "the page, under the footer",
      "phone-sideways": "the column, keypad fixed",
    },
  },
  {
    thing: "Answer",
    cells: {
      phone: "in the page; the keypad docked above the footer",
      tablet: "in the page; the keypad docked, 420 centred",
      "tablet-sideways": "fields under the card",
      laptop: "under the card, fields centred",
      "phone-sideways": "fields beside the picture",
    },
  },
  {
    thing: "Keypad",
    cells: {
      phone: "3 × 4, keys 72, gap 8; the extra key left of 0; signs in one row of 56 above",
      tablet: "3 × 4, 420 wide",
      "tablet-sideways": "3 × 4, 280 wide, right",
      laptop: "none; sign keys 56 in a row under the field",
      "phone-sideways": "4 × 3, 300 wide, right",
    },
  },
  {
    thing: "Letter row",
    cells: {
      phone: "2 × 5, keys 48, above the keyboard",
      tablet: "1 × 10",
      "tablet-sideways": "1 × 10",
      laptop: "1 × 10, keys 56, under the field",
      "phone-sideways": "1 × 10 above the keyboard",
    },
  },
  {
    thing: "Footer and band",
    cells: {
      phone: "96: bulb 64, Sprawdź fills",
      tablet: "96: bulb left, Sprawdź 240 right",
      "tablet-sideways": "96: Sprawdź 280",
      laptop: "96: Pomóż mi left, Sprawdź 200 right in 720",
      "phone-sideways": "96: Sprawdź 300",
    },
  },
  {
    thing: "Type: instruction, prompt, maths, option",
    cells: {
      phone: "19, 26, 30, 24 (we keep 20 and 28)",
      tablet: "22, 32, 36, 26",
      "tablet-sideways": "22, 32, 36, 26",
      laptop: "22, 32, 36, 26",
      "phone-sideways": "19, 26, 30, 24",
    },
  },
];

/** A step's phases (paper-behaviour §4) and what moves it from one to the next (lesson-frame §5). */
export const PHASES: readonly { id: string; what: string }[] = [
  { id: "rest", what: "The question and the answer, Sprawdź quiet until the answer is complete." },
  {
    id: "miss",
    what: "The red band, the parts to fix marked, focus in the first marked field. The review walk lasts until the next check.",
  },
  {
    id: "help",
    what: "The yellow note under the question, one rung more each time. After a miss the band stays with Popraw alone; from the second miss the note opens by itself once the band is read.",
  },
  {
    id: "right",
    what: "The green band and Dalej. Fields read-only, the tools gone and their space kept.",
  },
  {
    id: "solution",
    what: "After “Jeszcze nie wiem”: the solution beside the child’s answer, Dalej.",
  },
];

export const TRANSITIONS: readonly { from: string; event: string; to: string }[] = [
  { from: "rest", event: "Sprawdź or Enter on a complete answer", to: "right or miss" },
  { from: "miss", event: "A first edit to a marked part (its mark fades, 120 ms)", to: "rest" },
  {
    from: "rest or miss",
    event: "Pomóż mi, Więcej pomocy (on a phone the tools fold)",
    to: "help",
  },
  { from: "help", event: "“Jeszcze nie wiem” at the end of the note", to: "solution" },
  {
    from: "right or solution",
    event: "Dalej or Enter (the next step slides in, scroll to the top)",
    to: "rest, the next step",
  },
];

export interface EventRow {
  event: string;
  what: string;
}

/** One table per event (paper-behaviour/README.md §3.2 to §3.7). */
export const EVENTS: Record<
  "help" | "options" | "fields" | "missed" | "end" | "scroll",
  { title: string; rows: readonly EventRow[] }
> = {
  help: {
    title: "Help is asked (§3.2)",
    rows: [
      {
        event: "Pomóż mi, the first rung",
        what: "The note opens under the answer. On a phone the keypad or letter row folds first. The least scroll shows the whole note, or its top 16 px under the top bar when it is taller than the view.",
      },
      {
        event: "Focus",
        what: "Laptop: it stays in the field the child typed in, and the rung is read out. Phone: the folded field stays active, and a tap brings the keypad back.",
      },
      {
        event: "Więcej pomocy",
        what: "The new rung joins at the bottom and older rungs turn muted. Focus stays on Więcej pomocy, now under the new rung, so a second press works.",
      },
      {
        event: "The last rung",
        what: "Więcej pomocy is not drawn. Focus goes to the first empty field, or the first marked one after a miss. “Jeszcze nie wiem” stays at the end.",
      },
      {
        event: "Typing while help is open",
        what: "Phone: a tap on the field brings the docked keypad back, and the field scrolls clear of it. Laptop: a field under the footer scrolls to 16 px above it.",
      },
    ],
  },
  options: {
    title: "Options (§3.3)",
    rows: [
      {
        event: "Tap or click",
        what: "The option is picked and Sprawdź is ready. Nothing is checked and nothing scrolls.",
      },
      {
        event: "Tap another",
        what: "The pick moves to it. With several answers a tap toggles, and Sprawdź is ready while one is picked.",
      },
      {
        event: "1 to 4",
        what: "Picks that option, on a laptop. The key badges show only with a keyboard.",
      },
      {
        event: "↑ ↓ and Space",
        what: "The arrows move the focus and the pick together, as in a radio group. Space picks the focused option.",
      },
      {
        event: "Enter",
        what: "Checks if something is picked. With nothing picked the focus moves to the first option.",
      },
      {
        event: "After a miss",
        what: "The missed option keeps its mark and the band stays. Another pick fades the mark, folds the band and makes Sprawdź ready. Focus stays on the pick after every check.",
      },
    ],
  },
  fields: {
    title: "Several fields (§3.4)",
    rows: [
      {
        event: "Step opens",
        what: "Laptop: the first field in fill order has the focus. Phone: it is active with the keypad, and spelling opens the system keyboard.",
      },
      {
        event: "A slot filled",
        what: "A slot holds one character. Focus jumps to the next empty slot, or stays and Sprawdź is ready.",
      },
      { event: "A field filled", what: "No jump, because “1” may still become “12”." },
      {
        event: "Fill order",
        what: "Reading order unless the question sets one. Column sums go right to left, units first.",
      },
      {
        event: "Enter, before a miss",
        what: "From a filled field, to the next empty one, wrapping. Every field filled: checks. In an empty field: stays.",
      },
      {
        event: "Tab, ↑ ↓, ← →",
        what: "Tab and the up and down arrows go to the next or previous field in order. Left and right do at the text’s edge, and always in slots. They never wrap.",
      },
      {
        event: "Backspace in an empty slot",
        what: "Goes back to the previous slot and clears it.",
      },
      {
        event: "Phone keys",
        what: "The keypad’s → is Enter. The system keyboard says “next” until the last empty field, then “go”, which checks.",
      },
    ],
  },
  missed: {
    title: "A typed answer misses (§3.5)",
    rows: [
      {
        event: "Focus",
        what: "The first marked field in fill order, even if the caret was elsewhere.",
      },
      {
        event: "A number field",
        what: "Its whole content is selected, so the next key replaces it.",
      },
      {
        event: "A word field",
        what: "Only the first letters to fix are selected. The next letter replaces just those.",
      },
      {
        event: "Unmarked fields",
        what: "Keep their text and stay editable. Editing one does not make Sprawdź ready.",
      },
      {
        event: "A first edit to a marked field",
        what: "Its mark fades, the band folds and Sprawdź is ready. Other marks stay until edited.",
      },
      {
        event: "Enter after a miss",
        what: "The review walk: to the next field in order, selecting it if marked. Only Enter in the last field checks, once a marked part changed. Before that it goes back to the first marked field.",
      },
      {
        event: "Quiet Sprawdź",
        what: "Before a miss: to the first empty field. After one: to the first marked field, selected. Its tooltip repeats the words on screen.",
      },
    ],
  },
  end: {
    title: "The step ends (§3.6)",
    rows: [
      {
        event: "Right",
        what: "Fields go read-only, the keypad goes and its space stays, and focus moves to Dalej, so Enter goes on.",
      },
      {
        event: "Jeszcze nie wiem",
        what: "The solution shows beside the child’s answer, scrolled to its first line. Focus moves to Dalej.",
      },
      {
        event: "Dalej",
        what: "The next step slides in, 24 px over 320 ms, at the top. Focus goes to its first field. On a choice step nothing is focused and 1 to 4 work at once.",
      },
    ],
  },
  scroll: {
    title: "When the view scrolls (§3.7)",
    rows: [
      {
        event: "A help rung opens",
        what: "The whole new rung, or its top 16 px under the top bar.",
      },
      { event: "Focus moves to a field", what: "The field, 16 px above the footer or the tray." },
      { event: "A miss", what: "The first marked field." },
      { event: "Right, or the solution", what: "The worked line, or the solution’s first line." },
      { event: "The more-below arrow", what: "70 % of the view further." },
      { event: "Dalej", what: "The top, at once." },
      { event: "Picking, typing, sound, the picture sheet", what: "Nothing." },
    ],
  },
};
