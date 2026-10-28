/**
 * Part: the step's keys, the one controller that owns an answer's fields (paper-behaviour README
 * §3.4, §3.5 and §4; decision dl-j2lo). It is pure: the step shell (StepShell.tsx) gives it the
 * fields in fill order and the phase, and it says where the focus goes, what is selected and when
 * a check happens. The two keyboard demos in designs/Lesson Behaviour.dc.html are its reference,
 * and stepKeys.test.ts replays them key by key.
 *
 * Two kinds of field (§3.4): a slot holds exactly one character (a digit of a column sum, a letter
 * in a gap) and jumps on to the next empty slot once filled; a field holds a number or a word of
 * any length and never jumps, because "1" may still become "12", unless its type fixes its length
 * (a `range`: a clock's hour, its minutes, grosze), when it moves on once no longer answer is
 * possible (Slots addendum 2.4).
 *
 * The phase (§4): `rest` before a miss and again once a marked field was edited, `miss` from a
 * miss until then, `ended` once the step is right or shows its solution. `review` is true from a
 * miss until the next check: Enter then walks every field in order (§3.5).
 */

import {
  createContext,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { afterRelease, scrollToShow, showOnOpen } from "./scroll.ts";

type FieldKind = "slot" | "field";

/** One field of the answer, as the view that draws it reports it. */
export interface StepField {
  /** The view's id for it; the element carries it as `data-field`. */
  id: string;
  kind: FieldKind;
  maxLength: number;
  value: string;
  /** The result marked it missed, and it was not edited since. */
  marked: boolean;
  /** A word, not a number: after a miss only its first run of missed letters is selected (§3.5). */
  word?: boolean | undefined;
  /** The first run of missed letters in a word, [start, end), when letter marks give it (an
   * accent or one-letter slip, components/parts/letters.ts). Absent, the whole word is selected. */
  missedRun?: readonly [number, number] | undefined;
  /** May stay empty and the answer is still complete (a column's small cell). */
  optional?: boolean | undefined;
  /** A number field whose length its type fixes (Slots addendum 2.4): the numbers it takes, from
   * and to. It moves on by itself once no longer answer is possible (`full`). */
  range?: readonly [number, number] | undefined;
}

export type KeysPhase = "rest" | "miss" | "ended";

export interface KeysState {
  phase: KeysPhase;
  review: boolean;
  /** The view's own completeness: every field it needs is filled (Sprawdź is ready). */
  complete: boolean;
}

/** What a key does: move the focus to a field (selecting its marked part or not), check, or
 * nothing. */
export type KeysMove =
  | { to: "field"; at: number; select: boolean }
  | { to: "check" }
  | { to: "stay" };

const STAY: KeysMove = { to: "stay" };
const CHECK: KeysMove = { to: "check" };
const field = (at: number, select = false): KeysMove =>
  at < 0 ? STAY : { to: "field", at, select };

const empty = (f: StepField): boolean => f.value.trim() === "";

/** The next empty field after `from` in fill order, wrapping to the start; -1 when no other is
 * empty. From -1 it is the first empty field. */
export function nextEmpty(fields: readonly StepField[], from: number): number {
  const n = fields.length;
  for (let k = 1; k <= n; k++) {
    const j = (from + k + n) % n;
    const g = fields[j];
    if (j !== from && g !== undefined && empty(g)) return j;
  }
  return -1;
}

/** The first marked field in fill order, or -1. */
const firstMarked = (fields: readonly StepField[]): number => fields.findIndex((f) => f.marked);

/** Where the focus goes after a miss, and on a quiet Sprawdź after one: the first marked field,
 * else the first empty, else the first. */
function markedOrFirst(fields: readonly StepField[]): number {
  const m = firstMarked(fields);
  if (m >= 0) return m;
  return Math.max(0, nextEmpty(fields, -1));
}

/** The part of a field selected after a miss (§3.5): a number whole, so the next key replaces it;
 * a word only its first run of missed letters when letter marks give `missedRun` (an accent or
 * one-letter slip, Enter addendum 3.6), else whole too. */
export function selectRange(f: StepField): [number, number] {
  if (f.word && f.missedRun) return [f.missedRun[0], f.missedRun[1]];
  return [0, f.value.length];
}

/** Enter in field `at` (§3.4 before a miss, §3.5's review walk after one). `at` is -1 when no
 * field holds the focus. */
export function onEnter(fields: readonly StepField[], at: number, s: KeysState): KeysMove {
  if (s.phase === "ended") return STAY;
  if (fields.length === 0) return s.complete ? CHECK : STAY;
  if (s.review) {
    const last = fields.length - 1;
    if (at < last) {
      const next = at + 1;
      return field(next, fields[next]?.marked);
    }
    if (s.phase === "rest" && s.complete) return CHECK;
    return field(markedOrFirst(fields), true);
  }
  if (s.complete) return CHECK;
  if (at < 0) return field(nextEmpty(fields, -1));
  // An empty field holds Enter, except one that may stay empty (a column's carry, Slots addendum
  // 4.4): Enter goes on past it, to the tens (dl-uukj.29.133).
  const f = fields[at];
  if (f !== undefined && empty(f) && !f.optional) return STAY;
  return field(nextEmpty(fields, at));
}

/** Sprawdź pressed (§3.5): ready, it checks; quiet after a miss, the first marked field with its
 * part selected; quiet before one, the first empty field. */
export function onSprawdz(fields: readonly StepField[], s: KeysState): KeysMove {
  if (s.phase === "ended") return STAY;
  if (s.phase === "rest" && s.complete) return CHECK;
  if (fields.length === 0) return STAY;
  if (s.phase === "miss") return field(markedOrFirst(fields), true);
  return field(Math.max(0, nextEmpty(fields, -1)));
}

/** Where a pointer went down while a step is open: in one of its fields (`at`), on a control (a
 * button, a key, a link, the ruler), or on the page itself. */
export type PointerAt = { on: "field"; at: number } | { on: "control" } | { on: "page" };

/** What a pointer does to the field look after a miss (Enter addendum 2.3, decision dl-y3th 4b):
 * a click on the page sends the child away, so the field shows its dashed miss mark; a tap back
 * into a marked field brings it back exactly as just after the miss, its answer selected again, so
 * the next key replaces it (fixes dl-uukj.29.100: 24, away, back, 0 gave 240). A tap into an
 * unmarked field puts the caret at the end, nothing selected (§3.4). A control changes nothing:
 * Sprawdź and help move the focus their own way. Null: nothing to do. */
export type AwayMove = { away: true } | { away: false; at: number; select: boolean } | null;

export function onPointer(
  fields: readonly StepField[],
  where: PointerAt,
  phase: KeysPhase,
): AwayMove {
  if (phase === "ended" || fields.length === 0 || where.on === "control") return null;
  if (where.on === "page") return phase === "miss" ? { away: true } : null;
  const f = fields[where.at];
  if (f === undefined) return null;
  return { away: false, at: where.at, select: phase === "miss" && f.marked };
}

/** A key pressed while the child is away after a miss (addendum 2.3, on a laptop): back to the
 * first marked field, its answer selected, and the key then does what it does there (a digit
 * replaces the answer). Not away, or the miss is over: nothing. */
export function onKeyAway(fields: readonly StepField[], away: boolean, phase: KeysPhase): KeysMove {
  if (!away || phase !== "miss" || fields.length === 0) return STAY;
  return field(markedOrFirst(fields), true);
}

/** Where the focus goes once the result marked the answer (§3.5): the first marked field in fill
 * order, its part selected, even if the caret was elsewhere. */
export const onMiss = (fields: readonly StepField[]): KeysMove =>
  fields.length === 0 ? STAY : field(markedOrFirst(fields), true);

/** The element with the focus went (Więcej pomocy after the last rung, §3.2 and §4): the first
 * marked field after a miss, its part selected, else the first empty field, else the first. */
function onFocusLost(fields: readonly StepField[], phase: KeysPhase): KeysMove {
  if (fields.length === 0 || phase === "ended") return STAY;
  return phase === "miss"
    ? field(markedOrFirst(fields), true)
    : field(Math.max(0, nextEmpty(fields, -1)));
}

/** Whether field `f` can take no longer answer (Slots addendum 2.4): a slot once it holds its one
 * character; a field with a range once it holds its full length, or once any further digit would
 * leave the range (an hour from 0 to 23 after "7", minutes after "6"). Any other field never is,
 * because "1" may still become "12". */
function full(f: StepField): boolean {
  if (f.kind === "slot") return [...f.value].length === 1;
  if (f.range === undefined || !/^\d+$/.test(f.value)) return false;
  return f.value.length >= f.maxLength || Number(`${f.value}0`) > f.range[1];
}

/** The child typed into field `at` and its value is now `value`. A field that can take no longer
 * answer (`full`) moves on to the next empty field in fill order, wrapping, but not while the miss
 * stands (§4 onInput); any other field stays. Wrapping skips a field that may stay empty (a
 * column's carry): once the tens are typed past an empty carry the sum is whole and the focus
 * stays (dl-uukj.29.133). */
export function afterInput(fields: readonly StepField[], at: number, phase: KeysPhase): KeysMove {
  const f = fields[at];
  if (f === undefined || phase !== "rest" || !full(f)) return STAY;
  const next = nextEmpty(fields, at);
  if (next >= 0 && next < at && fields[next]?.optional) {
    const needed = fields.findIndex((g, i) => i !== at && !g.optional && empty(g));
    return field(needed);
  }
  return field(next);
}

export type Arrow = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

/** An arrow key in field `at` (§3.4): ↑ ↓ always move to the previous or next field; ← → do at the
 * caret's start or end of the text, and always in a slot. They stop at the ends and never wrap. */
export function onArrow(
  fields: readonly StepField[],
  at: number,
  key: Arrow,
  caret: { atStart: boolean; atEnd: boolean },
): number {
  const slot = fields[at]?.kind === "slot";
  const back = key === "ArrowUp" || (key === "ArrowLeft" && (slot || caret.atStart));
  const on = key === "ArrowDown" || (key === "ArrowRight" && (slot || caret.atEnd));
  if (back && at > 0) return at - 1;
  if (on && at < fields.length - 1) return at + 1;
  return -1;
}

/** Tab and Shift+Tab in field `at`: the next or previous field in fill order, filled or not; -1
 * past the ends, where the browser's Tab goes on to the buttons. */
export function onTab(fields: readonly StepField[], at: number, shift: boolean): number {
  const to = shift ? at - 1 : at + 1;
  return at >= 0 && to >= 0 && to < fields.length ? to : -1;
}

/** Backspace in field `at`: in an empty slot it goes back to the previous slot and clears it
 * (§3.4); -1 anywhere else, where the key edits as usual. */
export function onBackspace(fields: readonly StepField[], at: number): number {
  const f = fields[at];
  const before = fields[at - 1];
  return f?.kind === "slot" && empty(f) && before?.kind === "slot" ? at - 1 : -1;
}

/** The phone keyboard's return key on field `at` (§3.4): "next" until it is the last empty field,
 * then "go", which checks. */
export function enterHint(fields: readonly StepField[], at: number): "next" | "go" {
  const others = fields.some((f, i) => i !== at && !f.optional && empty(f));
  return others ? "next" : "go";
}

/** What the shell gives the parts inside its answer: the keypad's → key does what Enter does. */
export interface StepKeysValue {
  enter(): void;
}

export const StepKeys = createContext<StepKeysValue | null>(null);

/** What a view hands the shell for its fields: the fields in fill order, how to clear one (a
 * Backspace in the empty slot after it), and where to keep the selection of a field that is no
 * real input (a box the keypad types into), so the next key replaces it. */
export interface StepKeysInput {
  fields: StepField[];
  clear(id: string): void;
  select(id: string | null): void;
  /** After a miss, the child clicked away on the page (true) or came back to a field (false):
   * the view draws the marked field as its dashed miss mark while away (Enter addendum 2.3). A
   * view that leaves it out keeps one look. */
  away?: ((away: boolean) => void) | undefined;
}

/** What a pointer on the page may land on that is a control, not the page: it never sends the
 * child away (addendum 2.3). The keypad and the tools are the field's own. */
const CONTROL =
  'button, a, input, textarea, select, label, [role="button"], [role="slider"], [role="radio"], [role="checkbox"], [data-keypad], [data-tools]:not([data-step-shell]), [data-tools-dock], [data-key-click]';

/** Keys that type nothing on their own: they never bring the child back from away. */
const MODIFIER: ReadonlySet<string> = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "Fn",
]);

/** A step that opens: its instruction and first field come into view at once (scroll.ts
 * showOnOpen), and again while its pictures and fonts settle and push it down, until the child
 * does anything or a moment has passed (fives-everywhere s06: the clock lands after the commit). */
const SETTLE_MS = 1500;

function keepInViewOnOpen(field: HTMLElement): void {
  const show = (): void => {
    if (document.activeElement === field) showOnOpen(field);
  };
  show();
  const stage = field.closest("[data-stage]");
  if (stage === null || typeof ResizeObserver === "undefined") return;
  const observer = new ResizeObserver(show);
  observer.observe(stage);
  const stop = (): void => {
    observer.disconnect();
    clearTimeout(timer);
    for (const kind of ["pointerdown", "keydown", "wheel", "touchmove"] as const)
      document.removeEventListener(kind, stop, true);
  };
  const timer = setTimeout(stop, SETTLE_MS);
  for (const kind of ["pointerdown", "keydown", "wheel", "touchmove"] as const)
    document.addEventListener(kind, stop, true);
}

/** What can take the focus inside a field's element: the element itself, or the first button or
 * input in it (a fraction's boxes). */
const FOCUSABLE = "input, textarea, button, [tabindex]";

/** What the browser's Tab reaches. */
const TABBABLE = "a[href], button, input, select, textarea, [tabindex]";

/**
 * Where Tab goes once it leaves the fields (§3.4 "then on to the buttons"): the first element Tab
 * can reach after every field in the page's order, or with Shift the last one before them all. A
 * field's own boxes, and an element that holds the fields (the step's own frame), are never it. Null when there is none, and the browser's Tab goes on.
 */
function pastFields(fieldEls: readonly (HTMLElement | null)[], back: boolean): HTMLElement | null {
  const els = fieldEls.filter((e): e is HTMLElement => e !== null);
  if (els.length === 0) return null;
  const inField = (c: Element): boolean => els.some((e) => e.contains(c) || c.contains(e));
  const after = (c: Element, e: Element): boolean =>
    (e.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  const reachable = [...document.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (c) =>
      c.tabIndex >= 0 &&
      !c.matches(":disabled") &&
      !c.closest('[inert], [hidden], [aria-hidden="true"]') &&
      c.checkVisibility?.() !== false &&
      !inField(c),
  );
  if (back) return reachable.filter((c) => els.every((e) => after(e, c))).at(-1) ?? null;
  return reachable.find((c) => els.every((e) => after(c, e))) ?? null;
}

const isText = (el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

export interface StepKeysHook {
  /** A marked part was edited since the last miss (§3.5): the band folds and Sprawdź is ready. */
  changed: boolean;
  phase: KeysPhase;
  /** A step whose view hands no fields: any change in the answer counts (lesson-frame rule 2). */
  markChanged(): void;
  /** A quiet Sprawdź was pressed: move the focus where §3.5 says. */
  quiet(): void;
  /** Help opened on a laptop (§3.2): the focus goes back to the field the child was in. */
  resume(): void;
  /** The focused element went: the first marked or empty field takes the focus (§4). */
  restore(): void;
  value: StepKeysValue;
}

/**
 * The controller's hook: it keeps the phase and the active field, reads the fields the view hands
 * it, and does what the pure functions above say. Enter, Tab, the arrows and Backspace are taken
 * on the document in the capture phase, so a field's own Enter and the keypad's hardware keys
 * never answer them too. `onFocusField` runs before the controller moves the focus to a field (the
 * shell unfolds the phone's tray).
 */
export function useStepKeys({
  keys,
  edited,
  shell,
  answer,
  feedback,
  verdict,
  complete,
  touch = false,
  onFocusField,
}: {
  keys: StepKeysInput | null;
  /** The view's own word on whether a marked part changed since the miss (options, §3.3). */
  edited?: boolean | undefined;
  shell: RefObject<HTMLElement>;
  answer: RefObject<HTMLElement>;
  /** The runner's verdict object: a new one is a new check. */
  feedback: object | null;
  verdict: "none" | "miss" | "right" | "solution";
  complete: boolean;
  /** On touch a typed word's system keyboard closes on a miss, so the band and the marks are
   * seen, and a tap on the field opens it again with the same selection (rule 18, §3.5). */
  touch?: boolean | undefined;
  onFocusField(): void;
}): StepKeysHook {
  // The verdict a marked part changed under; changed only while that verdict stands.
  const [changedAt, setChangedAt] = useState<object | null>(null);
  const changed = edited ?? (changedAt !== null && changedAt === feedback);
  const review = verdict === "miss";
  const phase: KeysPhase =
    verdict === "right" || verdict === "solution" ? "ended" : review && !changed ? "miss" : "rest";
  const state: KeysState = { phase, review, complete };
  const fields = keys?.fields ?? [];
  // The field the child is in: the keypad's → and an Enter from a keypad key start from it.
  const active = useRef<string | null>(null);
  // After a miss, whether the child clicked away on the page (addendum 2.3); the view draws it.
  const away = useRef(false);
  const setAway = (next: boolean): void => {
    if (away.current === next) return;
    away.current = next;
    keysRef.current?.away?.(next);
  };
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const elementOf = (id: string): HTMLElement | null =>
    answer.current?.querySelector<HTMLElement>(`[data-field="${id}"]`) ?? null;
  const focusTo = (move: KeysMove, options?: FocusOptions): void => {
    if (move.to !== "field" || keys === null) return;
    const f = fields[move.at];
    const el = f ? elementOf(f.id) : null;
    const target = el?.matches(FOCUSABLE) ? el : el?.querySelector<HTMLElement>(FOCUSABLE);
    if (!f || !target) return;
    onFocusField();
    // The frame's own scroll (scroll.ts, §3.7): the least that puts the field 16 px above the
    // footer or the tray. On open the step stays at its top.
    target.focus({ preventScroll: true });
    if (!options?.preventScroll) scrollToShow(target);
    // On open the step stays at its top (§3.6), unless its first field would sit under the
    // footer or the tray: then the least jump that shows it 16 px above them, never past the
    // instruction's top 16 px under the top bar (dl-uukj.29.116, scroll.ts openBox).
    else if (target.closest("[data-learner-view], .kid-page") !== null) keepInViewOnOpen(target);
    active.current = f.id;
    // A tap or a move puts the caret at the end, nothing selected; after a miss the marked part is.
    if (isText(target)) {
      const [start, end] = move.select
        ? selectRange(f)
        : [target.value.length, target.value.length];
      target.setSelectionRange(start, end);
    }
    keys.select(move.select ? f.id : null);
    setAway(false);
  };
  const indexOf = (id: string | null): number =>
    id === null ? -1 : fields.findIndex((f) => f.id === id);
  const check = (): void => shell.current?.querySelector<HTMLElement>("[data-check]")?.click();
  const enter = (from: number): void => {
    const move = onEnter(fields, from, state);
    if (move.to === "check") check();
    else focusTo(move);
  };

  // The step opens with the first field in fill order focused, unless something already holds
  // the focus (a control the child or a screen reader is on). In the commit, not after it: the
  // tap on Dalej that opened the step is still running, and a phone opens its keyboard for a
  // word only when the focus moves inside a tap (rule 18; iOS asks for the gesture).
  useLayoutEffect(() => {
    const held = document.activeElement;
    if (fields.length === 0) return;
    // The first field is the one in use even when a control keeps the focus (the playground's
    // example menu): the keypad hears the keyboard without the focus and types there, so
    // Enter and Tab from the page start from it too (dl-uukj.29.133).
    if (held !== null && held !== document.body) {
      active.current = fields[0]?.id ?? null;
      return;
    }
    focusTo({ to: "field", at: 0, select: false }, { preventScroll: true });
    // Once per opening: a verdict or a retry re-renders the shell and must not move the focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A miss: the focus goes to the first marked field in fill order, its part selected. On touch a
  // word's field is not focused, so its keyboard stays closed and the band and the marks are seen;
  // the field is the one in use, and the tap that opens it selects its part again (§3.5, below).
  useLayoutEffect(() => {
    setAway(false);
    if (verdict !== "miss") return;
    const move = onMiss(fields);
    const f = move.to === "field" ? fields[move.at] : undefined;
    const el = f ? elementOf(f.id) : null;
    if (touch && f && isText(el)) {
      active.current = f.id;
      if (
        document.activeElement instanceof HTMLElement &&
        answer.current?.contains(document.activeElement)
      )
        document.activeElement.blur();
      scrollToShow(el);
      return;
    }
    focusTo(move);
    // Once per verdict.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  // What the child typed, read from the fields the view hands back: an edit in a marked field
  // ends the miss, and a filled slot jumps on.
  const before = useRef(new Map<string, StepField>());
  useLayoutEffect(() => {
    const was = before.current;
    before.current = new Map(fields.map((f) => [f.id, f]));
    let markedEdit = false;
    let typed = -1;
    const edits: number[] = [];
    fields.forEach((f, i) => {
      const p = was.get(f.id);
      if (p === undefined || p.value === f.value) return;
      if (p.marked) markedEdit = true;
      edits.push(i);
      if (f.id === active.current) typed = i;
    });
    // The keypad hears the keyboard without the focus (Keypad.tsx), so a digit may land in its
    // box while the focus is on a control outside the step: the one field that changed is the
    // one typed into, and it moves on as if it had the focus (dl-uukj.29.133).
    if (typed < 0 && edits.length === 1) typed = edits[0] ?? typed;
    if (markedEdit && phase === "miss") setChangedAt(feedback);
    if (typed >= 0) {
      // A step too tall to open with both its instruction and its field in view opens on the
      // instruction (scroll.ts openBox); the first key then lifts the field it typed into
      // clear of the keypad, the least scroll that shows the result of the child's own action
      // (README 6.1 rule 2, dl-uukj.29.116). A field already in view does not move.
      const id = fields[typed]?.id;
      const el = id === undefined ? null : elementOf(id);
      if (el !== null && el.closest("[data-learner-view], .kid-page") !== null)
        afterRelease(() => scrollToShow(el));
      focusTo(afterInput(fields, typed, markedEdit && phase === "miss" ? "rest" : phase));
    }
    // The phone keyboard's return key reads "next" until the last empty field, then "go".
    fields.forEach((f, i) => {
      const el = elementOf(f.id);
      if (isText(el)) el.setAttribute("enterkeyhint", enterHint(fields, i));
    });
  });

  const onKey = useRef<(event: KeyboardEvent) => void>(() => {});
  onKey.current = (event) => {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const root = shell.current;
    const target = event.target instanceof Element ? event.target : null;
    const inShell = root !== null && target !== null && root.contains(target);
    const fieldEl = inShell ? target.closest("[data-field]") : null;
    let at = indexOf(fieldEl?.getAttribute("data-field") ?? null);
    // Away after a miss, any key brings the child back (addendum 2.3, on a laptop): the marked
    // field, its answer selected, and the key goes on to act there (a digit replaces it). Enter
    // and Tab only bring the child back.
    const back = onKeyAway(fields, away.current, phase);
    if (back.to === "field" && !MODIFIER.has(event.key)) {
      focusTo(back);
      at = back.at;
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    if (event.key === "Enter") {
      if (event.repeat || event.shiftKey || root === null) return;
      // Once the step ends the runner's Enter presses Dalej. A step with no fields has Enter
      // press Sprawdź, which the miss band does not draw.
      if (phase === "ended" || (keys === null && !root.querySelector("[data-check]"))) return;
      // Enter is the controller's from a field, an option (a radio or a data-option
      // checkbox), a keypad key, the step itself or nowhere; a part with keys of its own (a chosen gap's menu, a picture's
      // crosshair, a button) keeps its Enter.
      const walkable =
        target === null ||
        target.contains(root) ||
        (inShell &&
          (fieldEl !== null ||
            target.matches('input[type="radio"]') ||
            target.closest("[data-option]") !== null ||
            target.closest("[data-keypad]") !== null));
      // A chosen gap's menu opens on Enter while the gap is empty; once picked, Enter walks on
      // or checks like any filled field (§3.4), and Space opens the menu again (dl-uukj.29.4).
      const menu = target?.closest("[aria-haspopup]") != null;
      if (!walkable || (menu && (at < 0 || fields[at]?.value === ""))) return;
      event.preventDefault();
      // The keypad and a field's own Enter must not answer it too.
      event.stopPropagation();
      if (keys === null) return check();
      enter(at >= 0 ? at : indexOf(active.current));
      return;
    }
    if (keys === null || phase === "ended") return;
    if (event.key === "Tab") {
      // From nowhere (the page itself: Safari never focuses a tapped button, and the keypad
      // hears the keyboard without the focus) Tab starts from the field in use.
      const from =
        at >= 0
          ? at
          : target === null || target === document.body || target === document.documentElement
            ? indexOf(active.current)
            : -1;
      if (from < 0) return;
      const to = onTab(fields, from, event.shiftKey);
      // Past the ends of the fill order the focus goes on to the buttons (§3.4). The browser's
      // own Tab would follow the page's order instead, and where the fill order is not the
      // reading order (a pyramid's bottom row first, a column's units first) it would land
      // back on a field: from a pyramid's top brick on to the brick under it, round and round.
      const next =
        to >= 0
          ? null
          : pastFields(
              fields.map((f) => elementOf(f.id)),
              event.shiftKey,
            );
      if (to < 0 && next === null) return;
      event.preventDefault();
      if (next !== null) next.focus();
      else focusTo({ to: "field", at: to, select: false });
      return;
    }
    if (at < 0) return;
    if (event.shiftKey) return;
    if (
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight"
    ) {
      const caret = isText(target)
        ? {
            atStart: target.selectionStart === 0 && target.selectionEnd === 0,
            atEnd: target.selectionStart === target.value.length,
          }
        : { atStart: true, atEnd: true };
      const to = onArrow(fields, at, event.key, caret);
      if (to < 0) return;
      event.preventDefault();
      event.stopPropagation();
      focusTo({ to: "field", at: to, select: false });
      return;
    }
    if (event.key === "Backspace") {
      const to = onBackspace(fields, at);
      if (to < 0) return;
      event.preventDefault();
      // The keypad's own Backspace must not erase the slot it came from too.
      event.stopPropagation();
      keys.clear(fields[to]?.id ?? "");
      focusTo({ to: "field", at: to, select: false });
    }
  };
  useEffect(() => {
    const listener = (event: KeyboardEvent): void => onKey.current(event);
    document.addEventListener("keydown", listener, true);
    return () => document.removeEventListener("keydown", listener, true);
  }, []);

  // The field in use, and a tap on a field (§3.4): focus there, the caret at the end and nothing
  // selected. A tap inside a field that already has the focus places the caret where it lands. A
  // tap on a marked field after a miss, the tap that opens a word's keyboard on a phone included,
  // selects its part again (Enter addendum 2.3, dl-uukj.29.100).
  const tapped = useRef<{ id: string; select: boolean } | null>(null);
  useEffect(() => {
    const el = answer.current;
    if (el === null || keys === null) return;
    const idOf = (t: EventTarget | null): string | null =>
      t instanceof Element ? (t.closest("[data-field]")?.getAttribute("data-field") ?? null) : null;
    const fieldsNow = (): readonly StepField[] => keysRef.current?.fields ?? [];
    const onFocusIn = (event: FocusEvent): void => {
      const id = idOf(event.target);
      if (id === null || id === active.current) return;
      active.current = id;
      const f = fieldsNow().find((x) => x.id === id);
      keysRef.current?.select(phaseRef.current === "miss" && f?.marked ? id : null);
    };
    const onPointerDown = (event: PointerEvent): void => {
      const id = idOf(event.target);
      if (id === null) return;
      const move = onPointer(
        fieldsNow(),
        { on: "field", at: fieldsNow().findIndex((x) => x.id === id) },
        phaseRef.current,
      );
      const select = move !== null && !move.away && move.select;
      tapped.current = select || id !== active.current ? { id, select } : null;
      // The tapped field is the one in use even when the browser gives a tapped button no
      // focus (Safari), so Enter and Tab from the page start from it.
      active.current = id;
      keysRef.current?.select(select ? id : null);
      setAway(false);
    };
    const onClick = (event: MouseEvent): void => {
      const tap = tapped.current;
      if (tap === null || idOf(event.target) !== tap.id) return;
      tapped.current = null;
      const target = event.target;
      if (!isText(target)) return;
      const f = fieldsNow().find((x) => x.id === tap.id);
      const [start, end] =
        tap.select && f ? selectRange(f) : [target.value.length, target.value.length];
      target.setSelectionRange(start, end);
    };
    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("pointerdown", onPointerDown, true);
    el.addEventListener("click", onClick, true);
    return () => {
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("pointerdown", onPointerDown, true);
      el.removeEventListener("click", onClick, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, keys === null]);

  // A click on the page outside the step's fields and controls, after a miss: the child is away
  // (addendum 2.3). On a laptop the keypad hears the keyboard without the DOM focus, so away is
  // this click, not a blur. The field lets go of the focus, so its edge and caret go with it.
  useEffect(() => {
    if (keys === null) return;
    const onDown = (event: PointerEvent): void => {
      const t = event.target instanceof Element ? event.target : null;
      if (t === null || t.closest("[data-field]") !== null) return;
      const where: PointerAt = t.closest(CONTROL) !== null ? { on: "control" } : { on: "page" };
      if (!onPointer(keysRef.current?.fields ?? [], where, phaseRef.current)?.away) return;
      setAway(true);
      const held = document.activeElement;
      if (held instanceof HTMLElement && answer.current?.contains(held)) held.blur();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys === null]);
  const keysRef = useRef(keys);
  keysRef.current = keys;

  const value = useMemo<StepKeysValue>(() => ({ enter: () => enterRef.current() }), []);
  const enterRef = useRef(() => {});
  enterRef.current = () => enter(indexOf(active.current));

  return {
    changed,
    phase,
    markChanged: () => {
      if (review && !changed) setChangedAt(feedback);
    },
    quiet: () => focusTo(onSprawdz(fields, state)),
    resume: () => {
      const at = indexOf(active.current);
      const id = fields[at]?.id;
      const el = id === undefined ? null : elementOf(id);
      const target = el?.matches(FOCUSABLE) ? el : el?.querySelector<HTMLElement>(FOCUSABLE);
      // Back where it was: the caret and any selection stay as the child left them.
      if (target && document.activeElement !== target) target.focus({ preventScroll: true });
    },
    restore: () => focusTo(onFocusLost(fields, phase)),
    value,
  };
}
