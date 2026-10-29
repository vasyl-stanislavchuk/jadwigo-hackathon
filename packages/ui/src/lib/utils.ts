// The shadcn/ui class helper (dl-0ax3 foundation): clsx joins, tailwind-merge resolves conflicts.
import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The named utilities of @theme inline (styles/tailwind.css) that tailwind-merge cannot guess
// (dl-uukj.32): text-kid-* and text-jw-<size> are font sizes, not colours; min-h-kid-tap and
// min-h-jw-control are the same group, so the later one wins; the same for the radii, the shadow,
// the durations and the easing. Without this, cn() keeps both classes of a pair and Tailwind's own
// order picks, so a key could draw 56 instead of 72.
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
];
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: SPACING,
      radius: ["jw-card", "jw-control", "jw-small"],
      shadow: ["jw-act"],
      ease: ["jw-out"],
    },
    classGroups: {
      "font-size": [{ text: SIZES }],
      duration: [{ duration: ["jw-fast", "jw-mark", "jw-band", "jw-step"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
