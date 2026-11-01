// The shadcn/ui class helper (dl-0ax3 foundation): clsx joins, tailwind-merge resolves conflicts.
import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The named utilities of @theme inline (styles/tailwind.css) that tailwind-merge cannot guess
// (dl-uukj.32): text-kid-* and text-jw-<size> are font sizes, not colours; min-h-kid-tap and
// min-h-jw-control are the same group, so the later one wins; the same for the radii, the shadow,
// the durations, the easing and the page leading. The parent app frame's sizes (dl-uukj.47.1) too. Without this, cn() keeps both classes of a pair
// and Tailwind's own order picks, so a key could draw 56 instead of 72.
const SIZES = [
  "kid-say",
  "kid-answer",
  "jw-instruction",
  "jw-prompt",
  "jw-option",
  "jw-math",
  "jw-verdict",
  "jw-body",
  "jw-small",
  "jw-target",
  "jw-key",
  "jw-key-sign",
  "jw-key-strip",
  "jw-unit",
  "jw-page-h1",
  "jw-page-h2",
  "jw-page-body",
  "jw-page-small",
  "jw-page-question",
];
const SPACING = [
  "kid-tap",
  "kid-key",
  "kid-commit",
  "kid-choice",
  "kid-status",
  "kid-credit",
  "jw-control",
  "jw-control-sm",
  "jw-shell-side",
  "jw-shell-rail",
  "jw-shell-bar",
  "jw-shell-chat",
  "jw-shell-details",
  "jw-shell-strip",
  "jw-shell-band",
  "jw-shell-box",
  "jw-dialog",
];
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: SPACING,
      radius: ["jw-card", "jw-control", "jw-small", "jw-dialog", "jw-box"],
      shadow: ["jw-act"],
      ease: ["jw-out"],
      leading: ["jw-page"],
    },
    classGroups: {
      "font-size": [{ text: SIZES }],
      duration: [{ duration: ["jw-fast", "jw-mark", "jw-band", "jw-step"] }],
      // border-jw and its sides are a line's width (--jw-border), never a colour: without these,
      // tailwind-merge reads border-jw as a colour and a later border-jw-line drops it, and the
      // part loses its line.
      "border-w": [{ border: ["jw"] }],
      "border-w-t": [{ "border-t": ["jw"] }],
      "border-w-r": [{ "border-r": ["jw"] }],
      "border-w-b": [{ "border-b": ["jw"] }],
      "border-w-l": [{ "border-l": ["jw"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
