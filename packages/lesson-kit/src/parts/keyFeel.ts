/**
 * Part: how a key on the Polish letter row feels (dl-w3.68.30, the owner after playing the
 * practice lesson on 2026-10-23: "pretty static"). Three small motions, each with the Web
 * Animations API and no motion library, as the playground's theme motion does
 * (playground/celebrate/motion.ts, lesson-motion.md M1): the pill sinks and comes back on a press,
 * the letter pops into the field at the caret, and the glyphs turn over when the case flips.
 *
 * The motion level comes from the page: a lesson page that has a Motion level switch sets
 * `data-motion-level` around the lesson (full, calm or reduced).
 * Calm plays the same motions shorter and smaller. Reduced plays none: the key still changes
 * colour, which is not motion. The device's reduced-motion setting always wins. A page with no
 * switch plays full, as a lesson does.
 *
 * Every motion is a transform or an opacity on its own element, so nothing moves the layout
 * (docs/17 §2f rule 2), and each one is over well inside the 300 ms feedback rule (§2a).
 */

import { prefersReducedMotion } from "./tone.ts";

export type KeyMotion = "full" | "calm" | "reduced";

/** The motion level for a key under `el`: the device first, then the page's switch. */
export function keyMotionOf(el: Element | null): KeyMotion {
  if (prefersReducedMotion()) return "reduced";
  const level = el?.closest("[data-motion-level]")?.getAttribute("data-motion-level");
  return level === "calm" || level === "reduced" ? level : "full";
}

/** Each motion's length and size. Calm is shorter and smaller, never a different motion. */
const FEEL = {
  full: { press: 160, sink: 0.86, pop: 280, popFrom: 1.9, flip: 200 },
  calm: { press: 90, sink: 0.94, pop: 150, popFrom: 1.3, flip: 110 },
} as const;

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)"; // --ease-out in styles/tokens.css

function animate(
  el: Element | null,
  keyframes: Keyframe[],
  ms: number,
  easing = EASE_OUT,
): Animation | null {
  if (el === null || typeof (el as HTMLElement).animate !== "function") return null;
  return (el as HTMLElement).animate(keyframes, { duration: ms, easing });
}

/** The pill sinks under the finger and springs back. */
export function sink(pill: Element | null, motion: KeyMotion): void {
  if (motion === "reduced") return;
  const f = FEEL[motion];
  animate(
    pill,
    [
      { transform: "scale(1)" },
      { transform: `scale(${f.sink}) translateY(6%)` },
      { transform: "scale(1)" },
    ],
    f.press,
  );
}

/** The row's glyphs turn over when the case flips, a short lift from below. */
export function flip(glyphs: Iterable<Element>, motion: KeyMotion): void {
  if (motion === "reduced") return;
  const f = FEEL[motion];
  for (const g of glyphs)
    animate(
      g,
      [
        { transform: "translateY(45%) scaleY(0.4)", opacity: 0.2 },
        { transform: "none", opacity: 1 },
      ],
      f.flip,
    );
}

/** The width `text` takes in `input`'s font, from a hidden mirror span. */
function measure(input: HTMLInputElement, text: string): number {
  const style = getComputedStyle(input);
  const mirror = document.createElement("span");
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    whiteSpace: "pre",
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing,
  });
  mirror.textContent = text;
  document.body.appendChild(mirror);
  const width = mirror.getBoundingClientRect().width;
  mirror.remove();
  return width;
}

/**
 * The letter just put at `at` in `input` pops in: a copy of it starts larger over its place and
 * settles onto the real letter, then goes. The copy is drawn over the page, outside the field, so
 * the field and its text are never touched; it is hidden from screen readers and takes no tap.
 */
export function popLetter(
  input: HTMLInputElement | null,
  at: number,
  letter: string,
  motion: KeyMotion,
): void {
  if (input === null || motion === "reduced" || typeof input.getBoundingClientRect !== "function")
    return;
  const f = FEEL[motion];
  const style = getComputedStyle(input);
  const rect = input.getBoundingClientRect();
  const padLeft = parseFloat(style.paddingLeft) || 0;
  const padRight = parseFloat(style.paddingRight) || 0;
  const border = parseFloat(style.borderLeftWidth) || 0;
  const content = input.clientWidth - padLeft - padRight;
  // A centred field (a typed gap) starts its text where the whole text is centred.
  const start =
    style.textAlign === "center" ? Math.max(0, (content - measure(input, input.value)) / 2) : 0;
  const x =
    rect.left +
    border +
    padLeft +
    start +
    measure(input, input.value.slice(0, at - letter.length)) -
    input.scrollLeft;
  const ghost = document.createElement("span");
  ghost.setAttribute("aria-hidden", "true");
  ghost.dataset["letterPop"] = letter;
  ghost.className = "text-primary";
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${x}px`,
    top: `${rect.top}px`,
    height: `${rect.height}px`,
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
    whiteSpace: "pre",
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    transformOrigin: "center 70%",
  });
  ghost.textContent = letter;
  document.body.appendChild(ghost);
  const done = () => ghost.remove();
  const a = animate(
    ghost,
    [
      { transform: `scale(${f.popFrom})`, opacity: 0.9 },
      { transform: "scale(1)", opacity: 1, offset: 0.7 },
      { transform: "scale(1)", opacity: 0 },
    ],
    f.pop,
  );
  if (a === null) {
    done();
    return;
  }
  a.onfinish = done;
  a.oncancel = done;
}
