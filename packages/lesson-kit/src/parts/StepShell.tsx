/**
 * Part: the lesson frame every step renders through (docs/17 §2f, dl-w3.41), after Claude Design's
 * lesson frame (decision dl-q3p9; docs/plan/design-system/lesson-frame/README.md, styles/stage.css).
 *
 * - A top bar in a lesson: close, which pauses and never quits (the pause sheet), and the step bar,
 *   which moves when a step ends and is spoken as words (rule 13). A 2px edge shows under it only
 *   while content is scrolled under it (rule 14).
 * - One centred column: the instruction and the prompt card (families/Stem.tsx), the answer, and
 *   under it the help note, the only part that grows.
 * - One 96px footer pinned to the bottom on every step and in every state (rule 1). At rest it holds
 *   the bulb, help from the first frame (rule 5; "Pomóż mi" beside it on a laptop), and Sprawdź,
 *   quiet until the answer is complete (rule 2). After a check it turns into the band at the same
 *   height: a miss (pencil, "Jeszcze nie.", help), right (check, "Dobrze!", the worked line, Dalej),
 *   or the solution after "Jeszcze nie wiem" (eye, Dalej).
 * - After "Jeszcze nie wiem" the answer shows the solution in place, the help note folds away, and
 *   the solution card (SolutionCard.tsx) stands under the answer with every worked line; the view
 *   scrolls the least that shows the whole card (Choose addendum 1.2). A right answer keeps the
 *   green band with its one worked line and no card. A worked solution released mid-step (a Choose
 *   step with no help, after its second miss) takes the same card, never help's yellow.
 * - While content continues under the footer, a 48px square arrow on its top line scrolls 70% of
 *   the view (rule 15).
 * - The frame is picked by input and shape (frame.ts, dl-uukj.29.53): phone, tablet upright,
 *   tablet sideways, phone sideways or laptop, set as data-frame for styles/stage.css.
 * - The answer (dl-uukj.29.44, dl-uukj.29.83). On a phone and an upright tablet it sits in the page,
 *   one scroll as on a laptop (Choose addendum 1.1, decision dl-n501). Only its tools, the keypad and
 *   the letter row, are docked above the footer, with a square arrow that folds them, and they fold
 *   when help opens (Tools.tsx; rule 8 and addendum 1.1.1). On a laptop there is no keypad and no
 *   Narzędzia (Enter addendum 4.2): the keyboard types, and a step with signs shows its sign keys
 *   under the field. Once a step ends the tools are not drawn and their space is kept (rule 12).
 * - Every control on the lesson screen is square-cornered (Enter addendum 2.5): the fold arrow a
 *   56 square, the more-below arrow a 48 square, both on paper with a 2px line on a 4px edge.
 * - The answer's keys are one controller's (stepKeys.ts, paper-behaviour README §3.4, §3.5, §4): the
 *   fields in fill order, a slot that jumps on, Enter to the next empty field and then the check,
 *   the review walk after a miss, the arrows, Tab and Backspace. Sprawdź while quiet does not
 *   check: it moves the focus to the first empty field, or after a miss to the first marked one.
 *   After a verdict the runner's Enter presses Dalej (runner/Runner.tsx).
 *
 * An exercise type fills only the answer area and tells the shell whether its answer is complete.
 * Only what needs pressing now is drawn. "Jeszcze nie wiem" lives only at the end of the help note.
 *
 * Scrolling in a lesson: a step opens at its top; after a check the marked part comes into view
 * above the band; a new help card comes into view with the least scroll (HelpLadder.tsx). Focus
 * stays on the answer after a check, and one live region reads the band and new help aloud.
 */

import { copy } from "@jadwigo/copy";
import { Button, cn, Switch } from "@jadwigo/ui";
import { ArrowDown, ChevronDown, ChevronUp, X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PressHandlers } from "../stage/press.ts";
import type {
  Category,
  Language,
  PageHelp,
  PageHintCard,
  PageSolutionLine,
} from "../stage/types.ts";
import { keyboardInset, toolsAt, useFrame, useTouch } from "./frame.ts";
import { HelpLadder } from "./HelpLadder.tsx";
import { HelpPicture } from "./HelpPicture.tsx";
import { MathNotation } from "./notation.ts";
import { Picture } from "./Picture.tsx";
import { RichText } from "./RichText.tsx";
import { liveWords, uncoloured } from "./richTextMacros.ts";
import { SolutionCard } from "./SolutionCard.tsx";
import { StatusLine } from "./StatusLine.tsx";
import { afterRelease, scrollByAnimated, scrollToShow } from "./scroll.ts";
import {
  alsoWords,
  STATUS,
  type StatusInput,
  StepStatus,
  statusOf,
  statusWords,
} from "./status.ts";
import { StepKeys, type StepKeysInput, useStepKeys } from "./stepKeys.ts";
import { type ToolKind, Tray, type TrayValue } from "./Tools.tsx";
import { Tooltip } from "./Tooltip.tsx";

/** The step's Check. `ready` is false until the answer is complete: the button reads as disabled
 * but stays pressable, so a press too soon can say what is left (rule 8). */
interface CheckAction {
  ready: boolean;
  press: PressHandlers;
}

/** "Jeszcze nie wiem", as the runner offers it (runner/moveOn.ts), drawn at the end of the help note. */
export interface MoveOnOffer {
  enabled: boolean;
  press: PressHandlers;
}

/** Dalej after a verdict, as the runner offers it (runner/moveOn.ts nextVisible): it takes the
 * action slot, where Check was, and Enter presses it (data-next, runner/Runner.tsx). */
export interface NextOffer {
  press: PressHandlers;
  /** False while Dalej waits on a choice (the lesson end screen): quiet and aria-disabled, like
   * Sprawdź at rest, and still pressable. Absent, it is ready. */
  ready?: boolean | undefined;
}

/** The help note as the runner offers it: the cards released so far, and asking for the next. */
export interface HelpOffer {
  help: PageHelp | null;
  /** Null once nothing more can be given on this step. */
  ask: { enabled: boolean; press: PressHandlers } | null;
  /** The last request found nothing to give until the learner has a go. */
  refused: boolean;
}

/** How far through the lesson: steps ended of all steps, and whether this is the review round. */
export interface LessonProgress {
  done: number;
  total: number;
  review?: boolean | undefined;
}

/** What the lesson page adds to the pause sheet: the sound switch and ending for today. */
export interface LessonFrameValue {
  sound?: { on: boolean; set(on: boolean): void } | undefined;
  onStop?: (() => void) | undefined;
}

export const LessonFrame = createContext<LessonFrameValue>({});

export interface StepShellProps extends StatusInput {
  language: Language;
  category: Category;
  stem: ReactNode;
  answer: ReactNode;
  /** The Check, or null when the step has nothing to check (a solution, a step with nothing to
   * answer). */
  action: CheckAction | null;
  /** The boost: the view passes it from the first miss on, and it gives way to the worked solution. */
  hint?: string | null | undefined;
  workedSolution?: string[] | null | undefined;
  /** The solution card's lines, released with the solution after "Jeszcze nie wiem"
   * (families/help.ts solutionLines). Absent, a released worked solution fills the card. */
  solutionLines?: PageSolutionLine[] | null | undefined;
  /** A step whose last worked line is its body filled in (Khan's table, Slots addendum 6): the body drawn
   * printed, answers in ink and no field boxes, under that line's words in the solution card. */
  solutionBody?: ReactNode | null | undefined;
  moveOn?: MoveOnOffer | null | undefined;
  ladder?: HelpOffer | null | undefined;
  /** Dalej, once a verdict lets the lesson go on. */
  next?: NextOffer | null | undefined;
  /** In a lesson: the top bar's step bar. Absent, there is no top bar (a step shown on its own). */
  progress?: LessonProgress | null | undefined;
  /** After a miss, whether the child changed a marked part, when the view knows it (options,
   * paper-behaviour README §3.3). Absent, any tap, key or input in the answer counts. */
  edited?: boolean | undefined;
  /** The answer's fields in fill order, for the step keys (stepKeys.ts). Absent on a step with no
   * fields to type in (options, tiles), where any change to the answer counts after a miss. */
  keys?: StepKeysInput | null | undefined;
  /** The instruction as it reads on the screen, which the quiet Sprawdź's tooltip repeats before
   * a miss (paper-behaviour README §3.5). */
  instruction?: string | undefined;
  className?: string | undefined;
}

/** One of the state table's icons (docs/17 §2f rule 3). */
function TableIcon({
  row,
  className,
}: {
  row: StepStatus;
  className?: string | undefined;
}): JSX.Element | null {
  const Icon = STATUS[row].icon;
  return Icon === null || Icon === "spinner" ? null : (
    <Icon aria-hidden="true" className={className} />
  );
}

/** A released rung with nothing to show: no card or hint, no marked part, nothing given or worked. */
function emptyRung(h: PageHelp): boolean {
  return (
    (h.card?.text ?? "").trim() === "" &&
    h.card?.picture === undefined &&
    (h.hints?.length ?? 0) === 0 &&
    (h.focus?.length ?? 0) === 0 &&
    (h.given === null || h.given === undefined) &&
    (h.worked?.length ?? 0) === 0 &&
    (h.twin === null || h.twin === undefined)
  );
}

function HelpCard({
  state,
  language,
  children,
}: {
  state: "boost";
  language: Language;
  children: ReactNode;
}): JSX.Element {
  const words = STATUS[state].words;
  return (
    <aside data-help={state} className="kid-help-note">
      <p data-help-head>
        <TableIcon row={state} className="kid-help-bulb" />
        {typeof words === "string" && words !== "list" && words !== "incomplete" && (
          <span>{copy(language, words)}</span>
        )}
      </p>
      {children}
    </aside>
  );
}

function Worked({ lines, blankLast }: { lines: string[]; blankLast: boolean }): JSX.Element {
  return (
    <ol className="list-decimal pl-6">
      {lines.map((line) => (
        <li key={line}>
          <RichText inline text={line} />
        </li>
      ))}
      {blankLast && (
        <li data-help-blank>
          <span
            aria-hidden="true"
            className="inline-block h-8 w-24 rounded-lg border-2 border-dashed border-primary align-middle"
          />
        </li>
      )}
    </ol>
  );
}

/** One card of the help note as written (families/help.ts StackCard): its words, its pictures, its
 * worked lines with the blank the almost-there rung leaves. */
function Hint({ hint }: { hint: PageHintCard }): JSX.Element {
  return (
    <div data-hint className="flex flex-col gap-2">
      {hint.text.trim() !== "" && <RichText text={hint.text} />}
      {hint.pictures?.map((p, i) => (
        <Picture key={`${p.src}|${i}`} {...p} />
      ))}
      {hint.picture && <HelpPicture picture={hint.picture} />}
      {hint.lines && hint.lines.length > 0 && (
        <Worked lines={hint.lines} blankLast={hint.blank === true} />
      )}
    </div>
  );
}

/** What takes the focus when a step with no fields opens: something to write in. A step with
 * fields opens on its first field in fill order (stepKeys.ts). A step of options, tiles or a
 * surface opens with nothing focused but the step itself, as paper-behaviour README §3.6 has a
 * choice step, so its own keys work at once and Tab reaches its first part (dl-uukj.29.4). */
const FIRST_PART = "textarea:not([readonly]):not([disabled])";

/** A field of the answer: a typed input, a box the keypad types into, a chosen gap. A view marks
 * each with data-field, its id for the step keys. */
const FIELD = "[data-field]";

/** Focus the first part once, when a step with no fields opens, unless something already holds the
 * focus (a control the child or a screen reader is on). The step frame's own focus waits for this:
 * a child's effect runs before its parent's (stage/StepFrame.tsx). */
function useFocusOnOpen(answer: { current: HTMLElement | null }, fields: boolean): void {
  useEffect(() => {
    const held = document.activeElement;
    if (fields || (held !== null && held !== document.body)) return;
    answer.current?.querySelector<HTMLElement>(FIRST_PART)?.focus({ preventScroll: true });
    // Once per opening: a verdict or a retry re-renders the shell and must not move the focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** What the footer is now: the plain footer before a check, then one band. */
type Band = "none" | "right" | "miss" | "solution";

function bandOf(state: StepStatus): Band {
  if (state === StepStatus.Right) return "right";
  if (state === StepStatus.NotYet) return "miss";
  if (state === StepStatus.MovedOn) return "solution";
  return "none";
}

/** The progress as words, never a number (rule 13): at the start, about half, nearly the end. */
function progressWords(language: Language, p: LessonProgress): string {
  if (p.review) return copy(language, "ds_review_bar");
  const share = p.total === 0 ? 0 : p.done / p.total;
  return copy(
    language,
    share < 1 / 3 ? "ds_progress_start" : share < 2 / 3 ? "ds_progress_half" : "ds_progress_end",
  );
}

/** The instruction as a tooltip says it: its words without emphasis marks. One with maths or
 * markup a tooltip cannot draw (TeX, a picture, a line break) gets no tooltip, as a tooltip only
 * repeats words already on the screen. */
export function spokenInstruction(text: string | undefined): string | null {
  if (text === undefined || /[$\\![\]\n<]/.test(text)) return null;
  const words = text.replace(/[*_`]/g, "").trim();
  return words === "" ? null : words;
}

/** A list item's mark in a worked line: "- ", "* ", "• " or "1. ". */
const ITEM = /^(?:[-*•]|\d+[.)])\s+/;

/** A worked line as the right band says it (addendum 1.3, dl-uukj.29.76). A line that ends in a
 * list ("Do rysunku pasują te wyrażenia:" then "- 9 + 9", "- 2 × 9") becomes its items joined as
 * words, "9 + 9 i 2 × 9", so a step with several right answers names every one in the band's short
 * line. Any other line keeps its words, on one line. */
export function bandWords(line: string, language: Language): string {
  const rows = line
    .split("\n")
    .map((row) => row.trim())
    .filter((row) => row !== "");
  const items = rows.filter((row) => ITEM.test(row)).map((row) => row.replace(ITEM, ""));
  if (items.length === 0) return rows.join(" ");
  return new Intl.ListFormat(language, { type: "conjunction" }).format(items);
}

/** In a lesson the page scrolls under the fixed top bar and footer. */
const inLesson = (el: Element | null): boolean =>
  el?.closest("[data-learner-view], .kid-page") != null;

/** The lesson's scroll rules (rules 14, 15; dl-uukj.29.35): the step opens at its top, the top bar
 * shows its edge while content is under it, and the more-below arrow shows while content
 * continues under the footer, and on a phone under the docked tools (`tray`, their height). */
function useLessonScroll(
  shell: { current: HTMLElement | null },
  end: { current: HTMLElement | null },
  tray: number,
): { scrolled: boolean; below: boolean } {
  const [scrolled, setScrolled] = useState(false);
  const [below, setBelow] = useState(false);
  useLayoutEffect(() => {
    if (!inLesson(shell.current)) return;
    // Dalej opens the next step at its top.
    window.scrollTo?.({ top: 0 });
    const onScroll = (): void => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    if (
      !inLesson(shell.current) ||
      end.current === null ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    // The footer and the tray cover the bottom of the view: the end counts as seen only above them.
    const footer = shell.current?.querySelector<HTMLElement>("[data-bar]")?.offsetHeight ?? 0;
    // rootMargin in % of the view: the share of it they cover.
    const covered = ((footer + tray) / Math.max(1, window.innerHeight)) * 100;
    const observer = new IntersectionObserver(
      ([entry]) => setBelow(entry?.isIntersecting === false),
      {
        rootMargin: `0% 0% -${covered}% 0%`,
      },
    );
    observer.observe(end.current);
    return () => observer.disconnect();
  }, [shell, end, tray]);
  return { scrolled, below };
}

/** On a phone in a lesson the answer's tools are docked above the footer (addendum 1.1.1): their
 * height, 0 while folded, which the page leaves free at its bottom and its scroll padding counts. */
function useTrayHeight(el: HTMLElement | null, docked: boolean): number {
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    if (!docked || el === null || typeof ResizeObserver === "undefined") return setHeight(0);
    const read = (): void => setHeight(el.offsetHeight);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, docked]);
  useEffect(() => {
    if (!docked) return;
    const root = document.documentElement;
    root.style.setProperty("--kid-tray-height", `${height}px`);
    return () => {
      root.style.removeProperty("--kid-tray-height");
    };
  }, [docked, height]);
  return height;
}

/** On a touch phone in a lesson, while the system keyboard is up, the docked tools (the letter
 * row) ride on top of it (rule 18): how far the keyboard covers the window, from the visual viewport, also set as
 * --kid-keyboard for styles/stage.css. 0 while it is down. */
function useKeyboardInset(on: boolean): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = typeof window === "undefined" ? undefined : window.visualViewport;
    if (!on || !viewport) return setInset(0);
    const read = (): void => setInset(keyboardInset(window.innerHeight, viewport));
    read();
    viewport.addEventListener("resize", read);
    viewport.addEventListener("scroll", read);
    return () => {
      viewport.removeEventListener("resize", read);
      viewport.removeEventListener("scroll", read);
    };
  }, [on]);
  useEffect(() => {
    if (inset === 0) return;
    const root = document.documentElement;
    root.style.setProperty("--kid-keyboard", `${inset}px`);
    return () => {
      root.style.removeProperty("--kid-keyboard");
    };
  }, [inset]);
  return inset;
}

/** Behind close: the lesson waits. "Wróć do lekcji" goes back to the same question. */
function PauseSheet({ language, onBack }: { language: Language; onBack(): void }): JSX.Element {
  const frame = useContext(LessonFrame);
  // React 18's Button takes no ref: the sheet finds its own button.
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    sheet.current?.querySelector<HTMLElement>("[data-pause-back]")?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onBack();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onBack]);
  return (
    <div
      ref={sheet}
      data-pause-sheet
      role="dialog"
      aria-modal="true"
      aria-labelledby="kid-pause-title"
      className="kid-pause-sheet"
    >
      <div data-pause-body>
        <h2 id="kid-pause-title">{copy(language, "ds_pause_title")}</h2>
        <p>{copy(language, "ds_pause_text")}</p>
        {frame.sound && (
          <Switch data-sound checked={frame.sound.on} onCheckedChange={frame.sound.set}>
            {copy(language, "ds_sound")}
          </Switch>
        )}
        <Button
          type="button"
          size="commit"
          data-pause-back
          className="kid-action text-2xl"
          onClick={onBack}
        >
          {copy(language, "ds_pause_back")}
        </Button>
        {frame.onStop && (
          <Button
            type="button"
            variant="outline"
            size="commit"
            data-pause-stop
            className="text-2xl"
            onClick={frame.onStop}
          >
            {copy(language, "ds_pause_stop")}
          </Button>
        )}
      </div>
    </div>
  );
}

function TopBar({
  language,
  progress,
  scrolled,
  onPause,
}: {
  language: Language;
  progress: LessonProgress;
  scrolled: boolean;
  onPause(): void;
}): JSX.Element {
  const words = progressWords(language, progress);
  const pct =
    progress.total === 0 ? 0 : Math.min(100, Math.round((progress.done / progress.total) * 100));
  return (
    <header data-topbar data-scrolled={scrolled || undefined}>
      <div data-topbar-inner>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-pause
          aria-label={copy(language, "ds_pause_title")}
          onClick={onPause}
        >
          <X aria-hidden="true" />
        </Button>
        <div data-progress role="img" aria-label={words}>
          {progress.review && <span data-progress-label>{words}</span>}
          <div data-progress-track>
            <div data-progress-fill style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </header>
  );
}

export function StepShell({
  language,
  category,
  stem,
  answer,
  action,
  hint,
  workedSolution,
  solutionLines,
  solutionBody = null,
  moveOn,
  ladder,
  next,
  progress = null,
  keys = null,
  edited,
  instruction,
  className,
  ...input
}: StepShellProps): JSX.Element {
  const state = statusOf(input);
  const verdict = bandOf(state);
  const shellRef = useRef<HTMLDivElement>(null);
  const answerArea = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useFocusOnOpen(answerArea, keys !== null && keys.fields.length > 0);
  // The frame by input and shape (frame.ts, README §2), and where it puts the tools.
  const frame = useFrame(shellRef);
  const touch = useTouch(shellRef);
  const at = toolsAt(frame);
  // In a lesson on a phone or an upright tablet the keypad and the letter row are docked above
  // the footer; the answer itself stays in the page (addendum 1.1, 1.1.1).
  const docked = progress !== null && at === "tray";
  const [dock, setDock] = useState<HTMLElement | null>(null);
  const [dockBox, setDockBox] = useState<HTMLElement | null>(null);
  // A keyboard smaller than this is no system keyboard (a browser's own bar coming and going).
  const keyboard = useKeyboardInset(docked && touch) > 120;
  const [paused, setPaused] = useState(false);
  // After a check on a step with no fields, the marked part comes into view above the band
  // (§3.7); a step with fields scrolls to the first marked field as the focus moves there.
  useEffect(() => {
    if (
      input.feedback?.kind !== "try_again" ||
      !inLesson(shellRef.current) ||
      (keys !== null && keys.fields.length > 0)
    )
      return;
    scrollToShow(answerArea.current?.querySelector('[data-tone="try_again"]') ?? null);
    // Once per verdict.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.feedback]);

  // A rung that shows nothing (no card, no marked part, nothing given) is no help: the note never
  // opens empty, and the bulb gives way to "Jeszcze nie wiem" (owner 2026-10-29, dl-uukj.29.154).
  // Until the wire says how much help a step has (dl-e8ov.1.2), the first ask is how it is found.
  const rung = ladder?.help ?? null;
  const nothing = rung !== null && emptyRung(rung);
  const help = nothing ? null : rung;
  const ask = ladder?.ask?.enabled === true && !nothing ? ladder.ask : null;
  const leaving = moveOn?.enabled === true ? moveOn : null;
  const open = help !== null || ladder?.refused === true;
  const ended = verdict === "right" || verdict === "solution";

  // The answer's tools (Tools.tsx): which kinds the step has, and whether the phone's docked tools
  // are folded. Help opening folds them (rule 8), in the
  // same render, so the note that opens is placed with the tools already gone (dl-uukj.29.77).
  const [tools, setTools] = useState<Partial<Record<ToolKind, number>>>({});
  const register = useCallback((kind: ToolKind) => {
    setTools((t) => ({ ...t, [kind]: (t[kind] ?? 0) + 1 }));
    return () => setTools((t) => ({ ...t, [kind]: (t[kind] ?? 1) - 1 }));
  }, []);
  const [folded, setFolded] = useState(false);
  const [wasHelpOpen, setWasHelpOpen] = useState(open);
  if (open !== wasHelpOpen) {
    setWasHelpOpen(open);
    if (open) setFolded(true);
  }
  const hasTools = (tools.keypad ?? 0) + (tools.letters ?? 0) > 0;
  const dockShown = docked && hasTools && !ended && !folded;
  const trayHeight = useTrayHeight(dockBox, dockShown);
  const { scrolled, below } = useLessonScroll(shellRef, end, trayHeight);
  const tray = useMemo<TrayValue>(
    () => ({
      frame,
      folded: at === "tray" && folded,
      ended,
      docked,
      dock,
      register,
    }),
    [frame, at, folded, ended, docked, dock, register],
  );
  // Once the step ends the tools are gone and their space is kept (rule 12): the answer holds the
  // tallest it has been on this step, and the solution fills that space.
  const tallest = useRef(0);
  useLayoutEffect(() => {
    if (!ended && answerArea.current)
      tallest.current = Math.max(tallest.current, answerArea.current.offsetHeight);
  });
  // A tap on a field opens the folded tray again (rule 8). The shell's own focus moves (back to the
  // field when help opens or when the focused bulb goes) hold the fold: the README's Pomóż mi row
  // keeps the field active and folded until the child taps it (dl-uukj.29.140).
  const holdFold = useRef(false);
  const quietly = (move: () => void): void => {
    holdFold.current = true;
    try {
      move();
    } finally {
      holdFold.current = false;
    }
  };
  const unfold = (event: { target: EventTarget }): void => {
    if (holdFold.current) return;
    if (event.target instanceof Element && event.target.closest(FIELD)) setFolded(false);
  };
  // The step's keys (stepKeys.ts): Enter, Tab, the arrows and Backspace, the focus after a miss,
  // and whether a marked part changed since.
  const stepKeys = useStepKeys({
    keys,
    edited,
    shell: shellRef,
    answer: answerArea,
    feedback: input.feedback ?? null,
    verdict,
    complete: action?.ready === true,
    touch,
    onFocusField: () => {
      if (!holdFold.current) setFolded(false);
    },
  });
  // The miss band folds back to the plain footer once the child edits a marked part (§3.5) or help
  // is out. A view may say itself whether a marked part changed (options, §3.3); else a step with no
  // fields counts any change to its answer: a tap, a key or an input.
  const band: Band = verdict === "miss" && (stepKeys.changed || open) ? "none" : verdict;
  const onEdit =
    keys === null && edited === undefined && stepKeys.phase === "miss"
      ? stepKeys.markChanged
      : undefined;
  // The step ends (§3.6): focus moves to Dalej, so Enter continues. Its frame shows only when the
  // check came from the keyboard (keyboardFocus.ts). After "Jeszcze nie wiem" the whole solution
  // card comes into view with the least scroll, or its top under the top bar when it is taller
  // than the room (addendum 1.2), once the finger that pressed is up. With no card, the solution's
  // first line: a Gaps solution marks it (data-solution-line), an Enter or Choose solution is one box.
  useLayoutEffect(() => {
    if (!ended) return;
    shellRef.current?.querySelector<HTMLElement>("[data-next]")?.focus({ preventScroll: true });
    if (verdict === "solution" && inLesson(shellRef.current))
      afterRelease(() =>
        scrollToShow(
          shellRef.current?.querySelector("[data-solution-card]") ??
            answerArea.current?.querySelector("[data-solution-line]") ??
            answerArea.current?.querySelector("[data-solution]") ??
            null,
        ),
      );
    // Once per verdict, and again when Dalej arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdict, next !== null && next !== undefined]);
  // Help opens (§3.2): on a laptop the focus goes back to the field the child was in, so typing
  // goes on; the rung is read out through the live region. On a phone the folded field stays
  // active and a tap on it brings the keypad back.
  const wasOpen = useRef(open);
  useLayoutEffect(() => {
    if (open && !wasOpen.current && frame === "laptop") {
      // The bulb that opened it holds its place unseen, so the focus must not stay on it: a
      // step with fields goes back to its field, one without to its text box or the step.
      if (keys !== null && keys.fields.length > 0) quietly(stepKeys.resume);
      else if (
        document.activeElement === document.body ||
        document.activeElement?.closest("[data-bulb]")
      )
        (
          answerArea.current?.querySelector<HTMLElement>(FIRST_PART) ??
          shellRef.current?.closest<HTMLElement>("fieldset")
        )?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  });
  // Focus is never lost (§4): when the focused element goes (Więcej pomocy after the last rung),
  // the first marked or empty field takes it; on a step with no fields, the step itself.
  const held = useRef<Element | null>(null);
  useEffect(() => {
    const el = shellRef.current;
    if (el === null) return;
    const onFocusIn = (event: FocusEvent): void => {
      held.current = event.target instanceof Element ? event.target : null;
    };
    el.addEventListener("focusin", onFocusIn);
    return () => el.removeEventListener("focusin", onFocusIn);
  }, []);
  useLayoutEffect(() => {
    const gone = held.current;
    if (
      gone === null ||
      gone.isConnected ||
      (document.activeElement !== null && document.activeElement !== document.body)
    )
      return;
    held.current = null;
    if (ended) return;
    if (keys !== null && keys.fields.length > 0) quietly(stepKeys.restore);
    else shellRef.current?.closest<HTMLElement>("fieldset")?.focus({ preventScroll: true });
  });
  // The bulb: only while there is help to give. With none left, its slot holds "Jeszcze nie wiem",
  // the way out, one tap away (owner 2026-10-29, dl-uukj.29.154).
  const bulbPress: PressHandlers | null = ended ? null : ask ? ask.press : null;
  const wayOut: PressHandlers | null = ended || ask ? null : (leaving?.press ?? null);
  // A rung the api writes itself (look again, a smaller step) has its card and no hints: the card is
  // the note's one card, or the note opened empty (owner 2026-10-29, dl-uukj.29.154).
  const written: PageHintCard[] =
    (help?.hints?.length ?? 0) > 0
      ? (help?.hints ?? [])
      : help?.card
        ? [
            {
              text: help.card.text,
              ...(help.card.picture === undefined ? {} : { picture: help.card.picture }),
            },
          ]
        : [];
  const cards = written.map((h, i) => <Hint key={i} hint={h} />);
  // The solution card's lines (addendum 1.2): as released with the solution, else a worked
  // solution released before (a Choose step with no help, after its second miss). That release
  // shows mid-step in the same card, never in help's yellow (dl-uukj.29.96): yellow stays help,
  // ink stays solution. A right answer keeps its one worked line in the band and draws no card.
  const released: PageSolutionLine[] =
    workedSolution?.map((text) => ({ text: uncoloured(text) })) ?? [];
  const cardLines: PageSolutionLine[] =
    verdict === "solution" ? (solutionLines ?? released) : ended ? [] : released;
  // A right answer shows the line its result names (the question's form of a swapped equation,
  // the other form, or why), else its worked line (dl-uukj.29.108).
  const workedLine =
    workedSolution?.at(-1) !== undefined ? bandWords(workedSolution.at(-1) ?? "", language) : null;
  const rightLine = alsoWords({ ...input, language, category }) ?? workedLine;
  const movedLine = statusWords(StepStatus.MovedOn, {
    ...input,
    language,
    category,
  });
  const bandLine =
    band === "right"
      ? `${copy(language, "ds_right_short")} ${rightLine ?? ""}`
      : band === "miss"
        ? `${copy(language, "ds_miss_short")} ${copy(language, "ds_miss_fix")}`
        : band === "solution"
          ? next
            ? copy(language, "ds_solution_band")
            : (movedLine ?? "")
          : "";
  // One polite live region for the step (§4): the band, each new help rung and Dobrze!.
  const [announce, setAnnounce] = useState("");
  // Its words never hold TeX or markdown: a colour macro is never read out (dl-uukj.29.78).
  useEffect(() => {
    if (bandLine !== "") setAnnounce(liveWords(bandLine, language));
  }, [bandLine, language]);
  const rungs = written.length;
  useEffect(() => {
    const newest = written[rungs - 1];
    if (newest) setAnnounce(liveWords(newest.text, language));
    // A new rung is the change to read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rungs]);

  const helpButton = (where: "rest" | "miss") => {
    if (wayOut !== null)
      return (
        <Button
          key={`move-on-${where}`}
          type="button"
          variant="outline"
          size="commit"
          data-move-on
          className="kid-help-ask"
          onPointerDown={wayOut.onPointerDown}
          onClick={wayOut.onClick}
        >
          <TableIcon row={StepStatus.MovedOn} />
          <span data-help-label>{copy(language, "dont_know_yet")}</span>
        </Button>
      );
    if (bulbPress === null) return null;
    // While the note is open the bulb's slot stays empty, holding its width (README §3).
    const held = where === "rest" && open;
    return (
      <Button
        key={`help-${where}`}
        type="button"
        variant="outline"
        size="commit"
        data-help-ask
        data-bulb
        aria-label={copy(language, "help_me")}
        aria-hidden={held || undefined}
        tabIndex={held ? -1 : undefined}
        data-held={held ? "" : undefined}
        className="kid-help-ask"
        onPointerDown={bulbPress.onPointerDown}
        onClick={bulbPress.onClick}
      >
        <TableIcon row={StepStatus.Boost} />
        <span data-help-label>{copy(language, "help_me")}</span>
      </Button>
    );
  };
  // Sprawdź while quiet points the way (§3.5): the focus goes to the first empty field, and an
  // answer not yet complete still says what is left. After a miss it stays quiet until a marked
  // part changes; a press then checks nothing and goes to the first marked field, and its
  // tooltip repeats the band's words, already on the screen.
  const quiet = action !== null && (!action.ready || stepKeys.phase === "miss");
  const pointTheWay = stepKeys.quiet;
  const checkPress: PressHandlers | null =
    action === null
      ? null
      : quiet
        ? {
            onPointerDown: (event) => {
              pointTheWay();
              if (!action.ready) action.press.onPointerDown(event);
            },
            onClick: (event) => {
              if (event.detail !== 0) return;
              pointTheWay();
              if (!action.ready) action.press.onClick(event);
            },
          }
        : action.press;
  // The quiet Sprawdź's tooltip repeats words already on the screen (§3.5): the band's line after
  // a miss, the instruction before one.
  // A tooltip shows on a mouse or a keyboard only (Tooltip.tsx), so only the laptop draws one: a
  // phone's would never show, and its hidden bubble would widen the page (dl-uukj.29.4).
  const quietTip =
    !quiet || frame !== "laptop"
      ? null
      : stepKeys.phase === "miss"
        ? copy(language, "ds_miss_fix")
        : spokenInstruction(instruction);
  const checkButton = (
    <Button
      key="check"
      type="button"
      size="commit"
      data-check
      className="kid-action text-2xl"
      aria-disabled={quiet}
      onPointerDown={checkPress?.onPointerDown}
      onClick={checkPress?.onClick}
    >
      {copy(language, "check")}
    </Button>
  );
  const dalej = next && (
    <div data-area="action">
      <Button
        key="next"
        type="button"
        size="commit"
        data-next
        className="kid-action text-2xl"
        aria-disabled={next.ready === false || undefined}
        onPointerDown={next.press.onPointerDown}
        onClick={next.press.onClick}
      >
        {copy(language, "continue")}
      </Button>
    </div>
  );

  const shell = (
    <div
      ref={shellRef}
      data-step-shell
      data-band={band}
      data-framed={progress ? "" : undefined}
      data-frame={frame}
      data-tools={hasTools && !ended ? "" : undefined}
      data-keypad-tool={(tools.keypad ?? 0) > 0 && !ended ? "" : undefined}
      data-keyboard={keyboard ? "" : undefined}
      className={cn("kid-step-shell", className)}
    >
      {progress && (
        <TopBar
          language={language}
          progress={progress}
          scrolled={scrolled}
          onPause={() => setPaused(true)}
        />
      )}
      <div data-stage>
        <div data-area="stem">{stem}</div>
        <div
          ref={answerArea}
          data-area="answer"
          style={ended && tallest.current > 0 ? { minHeight: tallest.current } : undefined}
          onInputCapture={onEdit}
          onPointerDownCapture={(event) => {
            onEdit?.();
            unfold(event);
          }}
          onFocusCapture={unfold}
          onKeyDownCapture={onEdit}
        >
          <Tray.Provider value={tray}>
            <StepKeys.Provider value={stepKeys.value}>{answer}</StepKeys.Provider>
          </Tray.Provider>
          {at === "tray" && !docked && hasTools && !ended && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              data-fold
              aria-label={copy(language, "ds_keys")}
              aria-expanded={!folded}
              onClick={() => setFolded((f) => !f)}
            >
              {folded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
            </Button>
          )}
        </div>
        <div data-area="help" className="flex flex-col gap-4">
          {open && !ended && (
            <HelpLadder
              language={language}
              cards={cards}
              of={help?.hintsTotal ?? (help?.more ? null : cards.length)}
              more={help !== null && ask ? ask.press : null}
              dontKnow={leaving?.press ?? null}
              refused={ladder?.refused === true}
            />
          )}
          {hint && !workedSolution && help === null && !ended && (
            <HelpCard state="boost" language={language}>
              <RichText text={hint} />
            </HelpCard>
          )}
          {cardLines.length > 0 && (
            <SolutionCard
              language={language}
              lines={cardLines}
              body={verdict === "solution" ? solutionBody : null}
            />
          )}
        </div>
        <div ref={end} data-stage-end aria-hidden="true" />
      </div>
      {/* On a phone in a lesson the keypad and the letter row, docked above the footer (addendum
                1.1.1). Folded, only the fold arrow stays, on the footer's top line, and the tools stay
                mounted (Enter addendum section 5, help). Ended, the dock is hidden. */}
      {docked && (
        <div
          ref={setDockBox}
          data-tools-dock
          data-folded={folded ? "" : undefined}
          hidden={!hasTools || ended}
        >
          <div ref={setDock} data-tools-slot hidden={folded} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            data-fold
            aria-label={copy(language, "ds_keys")}
            aria-expanded={!folded}
            onClick={() => setFolded((f) => !f)}
          >
            {folded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </Button>
        </div>
      )}
      {/* The footer, pinned to the bottom: the plain footer before a check, then the band. */}
      <div data-bar data-band={band} data-folded={verdict !== band ? "" : undefined}>
        {below && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            data-more-below
            aria-label={copy(language, "ds_more_below")}
            onClick={() => scrollByAnimated(window.innerHeight * 0.7, shellRef.current)}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
        )}
        <div data-bar-inner>
          {band === "none" && (
            <>
              {helpButton("rest")}
              {(state === StepStatus.Incomplete || state === StepStatus.Checking) && (
                <div data-bar-verdict>
                  <StatusLine state={state} language={language} category={category} {...input} />
                </div>
              )}
              {dalej ||
                (action !== null && (
                  <div data-area="action">
                    {quietTip !== null ? (
                      <Tooltip text={quietTip}>{checkButton}</Tooltip>
                    ) : (
                      checkButton
                    )}
                  </div>
                ))}
            </>
          )}
          {band === "miss" && (
            <>
              {helpButton("miss")}
              <span data-disc>
                <TableIcon row={StepStatus.NotYet} />
              </span>
              <div data-bar-verdict>
                <p data-band-title>{copy(language, "ds_miss_short")}</p>
                <p data-band-line>{copy(language, "ds_miss_fix")}</p>
              </div>
            </>
          )}
          {band === "right" && (
            <>
              <span data-disc>
                <TableIcon row={StepStatus.Right} />
              </span>
              <div data-bar-verdict>
                <p data-band-title>{copy(language, "ds_right_short")}</p>
                {rightLine && (
                  <p data-band-line>
                    <RichText inline text={rightLine} />
                  </p>
                )}
              </div>
              {dalej}
            </>
          )}
          {band === "solution" && (
            <>
              <span data-disc>
                <TableIcon row={StepStatus.MovedOn} />
              </span>
              <div data-bar-verdict>
                {/* A phone's band has no disc and a short title, so both lines fit (addendum 1.3). */}
                <p data-band-title>
                  {next
                    ? copy(language, frame === "phone" ? "ds_solution_label" : "ds_solution_band")
                    : movedLine}
                </p>
                {next && <p data-band-line>{copy(language, "ds_compare_solution")}</p>}
              </div>
              {dalej}
            </>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite" data-announce>
        {announce}
      </p>
      {paused && <PauseSheet language={language} onBack={() => setPaused(false)} />}
    </div>
  );
  // Maths in the stem, the answer and the help is drawn in the lesson's notation (notation.ts).
  return <MathNotation.Provider value={language}>{shell}</MathNotation.Provider>;
}
