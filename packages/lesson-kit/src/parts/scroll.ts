/**
 * Part: the one way the lesson frame scrolls (paper-behaviour README §3.1 rule 2 and §3.7). Every
 * scroll the frame makes follows the child's own action, by the least distance that shows the
 * result, over --jw-dur-scroll (320 ms) easing out. It jumps under prefers-reduced-motion (the token
 * is 0 there too), and nothing scrolls while a pointer is down, so nothing moves under a finger.
 *
 * `scrollDelta` is the pure part: how far the page moves so a box shows between the clear edges.
 * `insetsOf` reads those edges from the step: the top bar above, the footer and the docked tools
 * (a phone's keypad or letter row) below, each with the 16 px the README keeps.
 */

/** The room kept between a box and the bar it would sit against (§3.2, §3.4). */
export const GAP = 16;

/** The edges of the view a box must stay clear of, in px from the top and from the bottom. */
export interface Insets {
  top: number;
  bottom: number;
}

/** How far to scroll (positive is down) so the box from `top` to `bottom` shows inside the view of
 * `height` between the insets: nothing when it already does; a box taller than the room stops with
 * its top at the top inset. */
export function scrollDelta(
  box: { top: number; bottom: number },
  height: number,
  insets: Insets,
): number {
  const first = insets.top;
  const last = height - insets.bottom;
  if (box.top < first) return box.top - first;
  if (box.bottom > last) return Math.min(box.bottom - last, box.top - first);
  return 0;
}

let pressed = false;
let installed = false;

function install(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("pointerdown", () => (pressed = true), true);
  for (const end of ["pointerup", "pointercancel"] as const)
    document.addEventListener(end, () => (pressed = false), true);
}
install();

const reduced = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** The scroll's length from the motion token on the element (0 under reduced motion). */
function duration(el: Element | null): number {
  if (reduced()) return 0;
  const raw = el ? getComputedStyle(el).getPropertyValue("--jw-dur-scroll").trim() : "";
  const ms = raw.endsWith("ms")
    ? Number.parseFloat(raw)
    : raw.endsWith("s")
      ? Number.parseFloat(raw) * 1000
      : Number.NaN;
  return Number.isFinite(ms) ? ms : 320;
}

// The token's ease-out, cubic-bezier(0.22, 1, 0.36, 1), is close to a quartic ease-out.
const easeOut = (t: number): number => 1 - (1 - t) ** 4;

let running: number | null = null;

/** Scroll the window by `dy`, over the motion token, or at once under reduced motion or when
 * `instant`. A new scroll stops the one before it. */
export function scrollByAnimated(dy: number, from: Element | null = null, instant = false): void {
  if (dy === 0 || typeof window === "undefined") return;
  if (running !== null) cancelAnimationFrame(running);
  running = null;
  const ms = instant ? 0 : duration(from ?? document.documentElement);
  const start = window.scrollY;
  if (ms <= 0 || typeof requestAnimationFrame === "undefined") {
    window.scrollTo({ top: start + dy });
    return;
  }
  const t0 = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - t0) / ms);
    window.scrollTo({ top: start + dy * easeOut(t) });
    running = t < 1 ? requestAnimationFrame(step) : null;
  };
  running = requestAnimationFrame(step);
}

/** The clear edges for a box in this step: in a lesson the top bar, and the footer with a phone's
 * docked tools on it, each with the 16 px gap. Outside a lesson nothing is fixed over the page. */
export function insetsOf(el: Element): Insets {
  const shell = el.closest("[data-step-shell]");
  if (shell?.closest("[data-learner-view], .kid-page") == null) return { top: 0, bottom: 0 };
  const bar = shell.querySelector<HTMLElement>("[data-topbar]")?.offsetHeight ?? 0;
  const footer = shell.querySelector<HTMLElement>("[data-bar]")?.offsetHeight ?? 0;
  const dock = shell.querySelector<HTMLElement>("[data-tools-dock]:not([hidden])");
  // A box inside the docked tools is above the footer only; any other box is above them too, and
  // above the half of their fold arrow that stands over the dock line (dl-uukj.29.111).
  const overhang = (dock?.querySelector<HTMLElement>("[data-fold]")?.offsetHeight ?? 0) / 2;
  const tray = dock !== null && !dock.contains(el) ? dock.offsetHeight + overhang : 0;
  return { top: bar + GAP, bottom: footer + tray + GAP };
}

/** Run `fn` now, or once the pointer that is down comes up: a scroll that follows a tap (the step
 * ending on "Jeszcze nie wiem", pressed on pointerdown) waits for the finger to lift instead of
 * being dropped, so nothing moves under the finger and the result still comes into view. */
export function afterRelease(fn: () => void): void {
  if (!pressed || typeof document === "undefined") {
    fn();
    return;
  }
  const done = (): void => {
    for (const end of ["pointerup", "pointercancel"] as const)
      document.removeEventListener(end, done, true);
    fn();
  };
  // Added after install()'s listeners, so `pressed` is already false when this runs.
  for (const end of ["pointerup", "pointercancel"] as const)
    document.addEventListener(end, done, true);
}

/** What a step that opens on `field` shows (dl-uukj.29.116): from the step's top, its instruction
 * (or the question card when the card holds it), down to the field. Under the frame's scroll rule
 * (`scrollDelta`) the whole of it shows when it fits between the top bar and the footer or the
 * docked keypad's fold arrow. When it does not, the instruction keeps its place 16 px under the top
 * bar and the field shows as far as the room allows: Choose README 6.6 and 6.7 open a step "at the
 * top", and a child reads the task before they answer it. */
function openBox(field: Element): { top: number; bottom: number } {
  const box = (field.closest("[data-scroll-target]") ?? field).getBoundingClientRect();
  const start = field
    .closest("[data-step-shell]")
    ?.querySelector("[data-instruction], [data-prompt-card]");
  const top = start ? Math.min(start.getBoundingClientRect().top, box.top) : box.top;
  return { top, bottom: box.bottom };
}

/** How far a step opening on a field scrolls: none when `open` (the instruction down to the field)
 * fits between the insets. When it does not, the instruction still stops 16 px under the top bar
 * while the field's own box (`own`) then ends above the dock's line (`line`, from the view's top):
 * on a short phone the fold arrow may stand over the card's corner, and the child reads the task and
 * sees the field (owner 2026-10-29, dl-uukj.29.140). Else the least scroll that brings the field
 * above the dock, and the instruction may scroll off (Slots addendum 2.5: a child on a phone sees
 * the field the keypad types into). */
export function openDelta(
  open: { top: number; bottom: number },
  field: { top: number; bottom: number },
  height: number,
  insets: Insets,
  own?: { box: { top: number; bottom: number }; line: number },
): number {
  const fits = open.bottom - open.top <= height - insets.top - insets.bottom;
  if (fits) return scrollDelta(open, height, insets);
  const atTop = open.top - insets.top;
  if (own !== undefined && own.box.bottom - atTop <= own.line) return atTop;
  return scrollDelta(field, height, insets);
}

/** Where the docked tools start, in px from the view's top: the dock's line over the footer, or
 * the footer's when nothing is docked. Outside a lesson, the view's bottom. */
function dockLineOf(el: Element, height: number): number {
  const shell = el.closest("[data-step-shell]");
  if (shell?.closest("[data-learner-view], .kid-page") == null) return height;
  const footer = shell.querySelector<HTMLElement>("[data-bar]")?.offsetHeight ?? 0;
  const dock = shell.querySelector<HTMLElement>("[data-tools-dock]:not([hidden])");
  return height - footer - (dock !== null && !dock.contains(el) ? dock.offsetHeight : 0);
}

/** A step opening on its first field: show `openBox`, or the field when that does not fit, at
 * once (README 6.6: Dalej jumps). */
export function showOnOpen(field: Element): void {
  if (typeof window === "undefined") return;
  const box = (field.closest("[data-scroll-target]") ?? field).getBoundingClientRect();
  const height = window.innerHeight;
  const own = { box: field.getBoundingClientRect(), line: dockLineOf(field, height) };
  scrollByAnimated(openDelta(openBox(field), box, height, insetsOf(field), own), field, true);
}

/** Show `el` with the least scroll (§3.7), between the step's clear edges or the given ones. Does
 * nothing while a pointer is down, except at once when `instant`: a step opening, part of its
 * jump to the top, while the tap on Dalej may still be down. */
export function scrollToShow(el: Element | null, insets?: Insets, instant = false): void {
  if (el === null || (pressed && !instant) || typeof window === "undefined") return;
  // A field in a maths line shows its whole question card (Enter addendum 2.4, InlineField.tsx).
  const r = (el.closest("[data-scroll-target]") ?? el).getBoundingClientRect();
  scrollByAnimated(scrollDelta(r, window.innerHeight, insets ?? insetsOf(el)), el, instant);
}
