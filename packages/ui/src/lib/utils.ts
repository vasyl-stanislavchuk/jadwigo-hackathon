// The shadcn/ui class helper (dl-0ax3 foundation): clsx joins, tailwind-merge resolves conflicts.
import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// text-kid-say and text-kid-answer are font sizes (@theme in styles/tailwind.css). Without this,
// tailwind-merge reads any unknown text-* as a colour and drops one of a size/colour pair.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["kid-say", "kid-answer"] }] } },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
