/**
 * The ink caret (the Zeszyt export's AnswerField: "a 3 px ink caret breathes slowly", 1.2 s, solid
 * under reduced motion). A browser draws an input's caret about 1 px wide and CSS can colour it but
 * never widen it, so under [data-lesson-theme='zeszyt'] the native caret is hidden and one bar is
 * drawn over the focused field, at the caret, in --jw-focus. Any other theme keeps the native caret.
 *
 * One bar for the whole document, installed once: it follows whichever single-line text field has
 * the focus, so every typed field (Entry, a gap in a sentence, a field not written yet) gets it
 * without a wrapper. While letters are selected it stands at the selection's moving end, beside the
 * selection's fill, so a focused field always shows it (dl-uukj.29.99). It hides on a read-only
 * field. A textarea keeps the native caret: its lines wrap.
 */

/** The x of the caret inside the field's content box: where the text starts by its alignment,
 * plus the prefix before the caret, less how far the field has scrolled. */
export function caretX({
  align,
  box,
  full,
  prefix,
  scroll,
}: {
  align: string;
  box: number;
  full: number;
  prefix: number;
  scroll: number;
}): number {
  const free = Math.max(0, box - full);
  const start = align === "center" ? free / 2 : align === "right" || align === "end" ? free : 0;
  return start + prefix - scroll;
}

/** Where the caret stands: at the caret, or with letters selected at the end the selection moves
 * from (the end, unless the child selected backwards). */
export function caretEnd(start: number, end: number, direction: string | null): number {
  return direction === "backward" ? start : end;
}

const TYPED = new Set(["text", "search", "tel", "url", "email", "number", ""]);
const FONT = [
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-stretch",
  "font-variant",
  "font-variant-numeric",
  "font-feature-settings",
  "font-kerning",
];
const WIDTH = 3;
const BREATH = "jw-caret 1.2s ease-in-out infinite";

function inkField(el: Element | null): HTMLInputElement | null {
  if (!(el instanceof HTMLInputElement)) return null;
  if (!TYPED.has(el.getAttribute("type") ?? "") || el.readOnly || el.disabled) return null;
  return el.closest("[data-lesson-theme='zeszyt']") ? el : null;
}

let installed = false;

export function installInkCaret(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  const bar = document.createElement("div");
  bar.setAttribute("aria-hidden", "true");
  bar.dataset["inkCaret"] = "";
  Object.assign(bar.style, {
    position: "fixed",
    width: `${WIDTH}px`,
    borderRadius: "0.125rem",
    pointerEvents: "none",
    zIndex: "2147483646",
    display: "none",
  });
  const ruler = document.createElement("span");
  Object.assign(ruler.style, {
    position: "fixed",
    visibility: "hidden",
    whiteSpace: "pre",
    left: "0",
    top: "0",
    pointerEvents: "none",
  });
  document.body.append(bar, ruler);
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  let field: HTMLInputElement | null = null;
  let frame = 0;
  let last = "";
  // The focused field itself is watched too, not only the body: a gap grows to its word over a
  // width transition after a miss while the body keeps its size, and the bar drawn on the
  // transition's first frame stayed there, 6 px short of the selection's end (dl-uukj.29.110).
  const own = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => soon());

  const measure = (text: string, style: CSSStyleDeclaration): number => {
    // Longhands, not style.font: Chrome gives an empty shorthand once a longhand such as
    // font-variant-numeric has no place in it, and the ruler then measured in the page's font,
    // so the caret stood short of the text's end (dl-uukj.29.99).
    for (const prop of FONT) ruler.style.setProperty(prop, style.getPropertyValue(prop));
    ruler.style.letterSpacing = style.letterSpacing;
    ruler.style.textTransform = style.textTransform;
    ruler.textContent = text;
    return ruler.getBoundingClientRect().width;
  };

  const draw = () => {
    frame = 0;
    const el = field;
    if (
      el === null ||
      document.activeElement !== el ||
      el.selectionStart === null ||
      el.selectionEnd === null
    ) {
      bar.style.display = "none";
      return;
    }
    // With letters selected the caret stands at the selection's moving end, so the focus always
    // shows (dl-uukj.29.99): a whole number selected after a miss has it after its last digit.
    const at0 = caretEnd(el.selectionStart, el.selectionEnd, el.selectionDirection);
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const left = rect.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const box =
      rect.width -
      parseFloat(style.borderLeftWidth) -
      parseFloat(style.borderRightWidth) -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    const x = caretX({
      align: style.textAlign,
      box,
      full: measure(el.value, style),
      prefix: measure(el.value.slice(0, at0), style),
      scroll: el.scrollLeft,
    });
    const height = parseFloat(style.fontSize) * 1.1;
    // Never past the field's edge, where a 3px bar would sit on the line.
    const at = Math.min(Math.max(left + x - 1, left - 1), left + box - WIDTH + 1);
    const top = rect.top + rect.height / 2 - height / 2;
    bar.style.display = "block";
    bar.style.background = style.getPropertyValue("--jw-focus").trim() || style.color;
    bar.style.left = `${at}px`;
    bar.style.top = `${top}px`;
    bar.style.height = `${height}px`;
    // A caret that moved shows solid at once, then breathes again, as a native caret does.
    const where = `${at}|${top}`;
    if (where !== last) {
      last = where;
      bar.style.animation = "none";
      void bar.offsetWidth;
    }
    bar.style.animation = reduced?.matches ? "none" : BREATH;
  };
  const soon = () => {
    if (frame === 0) frame = requestAnimationFrame(draw);
  };

  const watch = (next: HTMLInputElement | null) => {
    if (field !== null) {
      field.style.caretColor = "";
      own?.unobserve(field);
    }
    field = next;
    if (field !== null) {
      field.style.caretColor = "transparent";
      own?.observe(field);
    }
  };
  document.addEventListener("focusin", (e) => {
    watch(inkField(e.target as Element));
    last = "";
    soon();
  });
  document.addEventListener("focusout", () => {
    watch(null);
    soon();
  });
  // A field can also move without resizing (a neighbour grows, the step settles): the end of any
  // transition redraws, and so does a font arriving, since the ruler measures in it.
  for (const type of ["selectionchange", "input", "keyup", "pointerup", "transitionend"])
    document.addEventListener(type, soon);
  document.fonts?.addEventListener?.("loadingdone", soon);
  window.addEventListener("scroll", soon, true);
  window.addEventListener("resize", soon);
  // The field can grow as letters arrive (a gap widens) or move as the step lays out.
  new ResizeObserver(soon).observe(document.body);
}
