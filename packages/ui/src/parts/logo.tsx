/// <reference path="../brand/svg.d.ts" />
// The logo (decision jadwigo-marketing/decisions/2026-10-30-jadwigo-wears-lockup-4a-an-andika-
// wordmark-with-a-crown-tipped-o): the wordmark, inlined so it reads Zeszyt's roles and follows
// night mode, and so its crown tips on hover or keyboard focus (brand/README.md, hover 5a). With
// `mark` it is the crown alone, for the parent's folded sidebar (decision 2026-11-01-the-parent-app-
// is-a-sidebar-shell-and-a-3-column-lesson-workspac, dl-xo0q). Its height is the caller's (h-*); the
// width follows. The name is the SVG's own title, or `label` for the crown.
import type { ReactElement } from "react";
import wordmark from "../brand/wordmark.svg?raw";
import { cn } from "../lib/utils.ts";

function Logo({
  mark = false,
  label = "Jadwigo",
  className,
}: {
  mark?: boolean;
  label?: string;
  className?: string;
}): ReactElement {
  if (mark)
    return (
      <svg
        data-slot="logo"
        data-mark=""
        viewBox="0 0 40 26"
        role="img"
        aria-label={label}
        className={cn("h-6 w-auto", className)}
      >
        <path
          d="M3 23 L3 6 L12 14 L20 3 L28 14 L37 6 L37 23 Z"
          className="fill-jw-crown stroke-jw-crown-line"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      </svg>
    );
  return (
    <span
      data-slot="logo"
      className={cn("inline-flex h-6 [&>svg]:h-full [&>svg]:w-auto", className)}
      // The wordmark is this package's own file, read at build time: no outside text reaches it. Inlined, not an <img>, so the tokens and the crown's tip reach the SVG.
      dangerouslySetInnerHTML={{ __html: wordmark }}
    />
  );
}

export { Logo };
