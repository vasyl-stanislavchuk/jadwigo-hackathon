/**
 * Part: the "checked too soon" line (Enter addendum 2.2, decision dl-y3th 3b; Slots addendum 3.3,
 * dl-4e0f): what complete.ts says is still missing, 18 px bold ink at line-height 1.35, directly
 * under the field (Enter) or under the question card (Slots), on a phone too. It is the one move a
 * step allows: it pushes what is under it down by its line, and on the first key it fades over the
 * theme's mark time (--jw-dur-mark) and goes. A polite live region says it, out of the flow, so it
 * moves nothing. The footer stays plain: the step passes no `incomplete` to StepShell.
 */

import { type CopyKey, copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { useEffect, useRef, useState } from "react";
import type { Language } from "../stage/types.ts";
import { afterRelease, scrollToShow } from "./scroll.ts";

/** The fade's length: the theme's mark time (--jw-dur-mark, the duration-jw-mark utility: 120 ms,
 * 0 under reduced motion). Where the theme gives none, the line goes at once. */
function fadeMs(el: Element): number {
  const value = getComputedStyle(el).getPropertyValue("--jw-dur-mark").trim();
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return value.endsWith("ms") ? n : value.endsWith("s") ? n * 1000 : n;
}

export function TooSoon({
  reason,
  language,
  className,
}: {
  reason: CopyKey | null;
  language: Language;
  className?: string | undefined;
}): JSX.Element {
  const [shown, setShown] = useState<CopyKey | null>(reason);
  const line = useRef<HTMLParagraphElement>(null);
  if (reason !== null && reason !== shown) setShown(reason);
  // A new line comes into view with the least scroll, once the finger that pressed Sprawdź is up:
  // on a phone it may land under the docked keypad (scroll.ts, paper-behaviour README §3.7).
  useEffect(() => {
    if (reason !== null) afterRelease(() => scrollToShow(line.current));
  }, [reason]);
  // On the first key the line fades out over the theme's mark time, then goes (at once under
  // reduced motion, or where the browser draws no animation).
  useEffect(() => {
    if (reason !== null || shown === null) return;
    const el = line.current;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    if (el === null || reduced || typeof el.animate !== "function") return setShown(null);
    const duration = fadeMs(el);
    if (duration <= 0) return setShown(null);
    const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration,
      easing: "ease-out",
      fill: "forwards",
    });
    let live = true;
    fade.finished.then(
      () => live && setShown(null),
      () => {},
    );
    return () => {
      live = false;
      fade.cancel();
    };
  }, [reason, shown]);
  return (
    <>
      <p className="sr-only" role="status" aria-live="polite" data-too-soon-live>
        {reason === null ? "" : copy(language, reason)}
      </p>
      {shown !== null && (
        <p
          ref={line}
          aria-hidden="true"
          data-too-soon
          data-leaving={reason === null ? "" : undefined}
          className={cn("text-lg leading-[1.35] font-bold text-foreground", className)}
        >
          {copy(language, shown)}
        </p>
      )}
    </>
  );
}
