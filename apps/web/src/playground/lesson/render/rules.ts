/**
 * The render check (dl-a38n.28): what a step looks like once drawn, read from the real DOM in the
 * builder's page, as findings of the check's shape so they pin under the step like the check's.
 * check.ts sees the file and the compile; the live run's q1 passed it and still drew one line per
 * fragment (dl-a38n.27). These rules see the drawing (lead decision 1, wave 2): pure functions over
 * a step's root element, run in the page after the step draws, never in happy-dom for real, which
 * does no layout. The structural rules hold in happy-dom too, and their tests run there; the
 * layout rule (overflow) says in its fix that it needs a real page.
 *
 *   render-raw-tex        a `$…$` or a `\macro` left in the text a child reads
 *   render-split-inline   a sentence's runs as items of a flex or grid host, one line each
 *   render-picture-missing  a picture with no address, or one that did not load
 *   render-empty-option   an option with nothing in it to read or see
 *   render-overflow       something wider than the step (warn)
 */

import type { Finding } from "@jadwigo/lesson-import/file";

/** The step the root draws: its id and where it is in the lesson file. */
export interface RenderedStep {
  step_id: string;
  path: string;
}

const SNIPPET = 40;
const RAW_TEX = /\$[^$\n]+\$|\\[A-Za-z]+/;
/** Where TeX is KaTeX's own (its MathML copy) or code a child is shown as code. */
const NOT_PROSE = ".katex, code, [data-code], script, style";
/** Content a reader sees without words. */
const SEEN = "img, svg, canvas, [role='img'], [role='math'], [aria-label]";
const OPTIONS = "[data-option], [data-still-option]";
const INLINE_RUN = "[data-formula], [role='math'], strong, em, code";

const short = (text: string): string => {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > SNIPPET ? `${one.slice(0, SNIPPET - 1)}…` : one;
};

/** Every text node under `root` a child reads: not KaTeX's, not code, not hidden. */
function proseNodes(root: Element): Text[] {
  const out: Text[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    const host = n.parentElement;
    if (host === null || host.closest(NOT_PROSE) !== null) continue;
    if (host.closest("[aria-hidden='true']") !== null) continue;
    out.push(n as Text);
  }
  return out;
}

function rawTex(root: Element, step: RenderedStep): Finding[] {
  const text = proseNodes(root)
    .map((n) => n.data)
    .join("");
  const found = RAW_TEX.exec(text);
  if (found === null) return [];
  const at = Math.max(0, found.index - 10);
  return [
    {
      step_id: step.step_id,
      path: step.path,
      level: "error",
      rule: "render-raw-tex",
      text: `TeX is drawn as its source: "${short(text.slice(at, at + SNIPPET))}".`,
      fix: "Close every $…$ pair and keep TeX inside it; a lone $ or a \\macro outside $…$ is read as text.",
    },
  ];
}

const isLaidOut = (e: Element): boolean => {
  const display = e.ownerDocument.defaultView?.getComputedStyle(e).display ?? "";
  return /(^|-)(flex|grid)$/.test(display);
};

function splitInline(root: Element, step: RenderedStep): Finding[] {
  const out: Finding[] = [];
  for (const host of [root, ...root.querySelectorAll("*")]) {
    if (!isLaidOut(host)) continue;
    const kids = [...host.childNodes];
    const words = kids.some((n) => n.nodeType === 3 && (n.textContent ?? "").trim() !== "");
    const run = kids.some((n) => n.nodeType === 1 && (n as Element).matches(INLINE_RUN));
    if (!words || !run) continue;
    out.push({
      step_id: step.step_id,
      path: step.path,
      level: "error",
      rule: "render-split-inline",
      text: `A sentence breaks into one line per fragment: "${short(host.textContent ?? "")}".`,
      fix: "The part that draws this text must wrap the sentence's runs in one element; this is a lesson-kit bug, not the lesson's (dl-a38n.27 is the first).",
    });
  }
  return out;
}

function pictureMissing(root: Element, step: RenderedStep): Finding[] {
  return [...root.querySelectorAll("img")].flatMap((img): Finding[] => {
    const src = img.getAttribute("src") ?? "";
    // A picture still loading is not a finding: the page runs the rules once its pictures settle.
    const failed = src !== "" && img.complete && img.naturalWidth === 0;
    if (src !== "" && !failed) return [];
    return [
      {
        step_id: step.step_id,
        path: step.path,
        level: "error",
        rule: "render-picture-missing",
        text: src === "" ? "A picture has no address." : `A picture did not load: ${short(src)}.`,
        fix: "Point the picture at a ref the media URL serves (<sha>.<ext>), and set VITE_MEDIA_URL for the dev server.",
      },
    ];
  });
}

/** Whether `e` shows anything: words a reader gets, or something seen. */
function hasContent(e: Element): boolean {
  if (proseNodes(e).some((n) => n.data.trim() !== "")) return true;
  return [...e.querySelectorAll(SEEN)].some((s) => s.closest("[data-key-badge]") === null);
}

function emptyOption(root: Element, step: RenderedStep): Finding[] {
  return [...root.querySelectorAll(OPTIONS)].flatMap((option): Finding[] => {
    // The option's own key badge ("1") is not its content.
    const copy = option.cloneNode(true) as Element;
    for (const badge of copy.querySelectorAll("[data-key-badge]")) badge.remove();
    if (hasContent(copy)) return [];
    const id = option.getAttribute("data-option") ?? option.getAttribute("data-still-option");
    return [
      {
        step_id: step.step_id,
        path: step.path,
        level: "error",
        rule: "render-empty-option",
        text: `An option draws empty${id ? ` (${id})` : ""}.`,
        fix: "Give the option content of its kind: text, a number, a picture or an array.",
      },
    ];
  });
}

function overflow(root: Element, step: RenderedStep): Finding[] {
  const frame = root.getBoundingClientRect();
  if (frame.width === 0) return [];
  const wide = [...root.querySelectorAll("*")].find(
    (e) => e.getBoundingClientRect().right > frame.right + 1,
  );
  if (wide === undefined) return [];
  return [
    {
      step_id: step.step_id,
      path: step.path,
      level: "warn",
      rule: "render-overflow",
      text: `Something is wider than the step: "${short(wide.textContent ?? wide.tagName)}".`,
      fix: "Shorten the line or the figure so it fits the frame (rule 17: a formula never breaks). Seen on the real page only; happy-dom does no layout.",
    },
  ];
}

/** Every finding the drawn step gives, in rule order. */
export function renderFindings(root: Element, step: RenderedStep): Finding[] {
  return [
    ...rawTex(root, step),
    ...splitInline(root, step),
    ...pictureMissing(root, step),
    ...emptyOption(root, step),
    ...overflow(root, step),
  ];
}
