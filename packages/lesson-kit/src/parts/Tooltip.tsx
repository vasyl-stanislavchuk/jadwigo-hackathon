/**
 * Part: a small ink bubble above (or under) a control, from the design system's Tooltip
 * (docs/plan/design-system/claude-design/components/lesson/Tooltip.jsx, dl-uukj.29.30). It shows on
 * a mouse's hover and on keyboard focus only, never on touch, so it may only repeat words already on
 * the screen, name what a waiting control waits for, or name an icon-only button (the turtle's
 * "Wolniej", lesson-frame/README.md §6). Never on an option or an answer.
 * styles/stage.css draws it; `open` holds it shown, as the System page does. Each time it shows, it
 * slides back inside the window if it would leave it (Sprawdź sits at the footer's right edge),
 * and its arrow stays on the control's centre.
 */

import { cn } from "@jadwigo/ui";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef } from "react";

/** The room the bubble keeps from the window's edges. */
const EDGE = 8;

/** How far a bubble spanning [left, right] moves to sit inside a window `width` wide. */
export function shiftInto(left: number, right: number, width: number): number {
  if (right - left > width - 2 * EDGE) return EDGE - left;
  if (left < EDGE) return EDGE - left;
  if (right > width - EDGE) return width - EDGE - right;
  return 0;
}

export function Tooltip({
  text,
  open = false,
  placement = "top",
  align = "center",
  children,
}: {
  text: string;
  open?: boolean | undefined;
  placement?: "top" | "bottom" | undefined;
  align?: "center" | "start" | undefined;
  children: ReactNode;
}): JSX.Element {
  const bubble = useRef<HTMLSpanElement>(null);
  const host = useRef<HTMLSpanElement>(null);
  const fitBubble = useCallback(() => {
    const el = bubble.current;
    if (el === null) return;
    el.style.removeProperty("--tip-shift");
    const r = el.getBoundingClientRect();
    el.style.setProperty(
      "--tip-shift",
      `${shiftInto(r.left, r.right, document.documentElement.clientWidth)}px`,
    );
    // Aligned to the start, the arrow points at the control's centre.
    el.style.setProperty(
      "--tip-anchor",
      `${(el.parentElement?.getBoundingClientRect().width ?? 0) / 2}px`,
    );
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    fitBubble();
    window.addEventListener("resize", fitBubble);
    return () => window.removeEventListener("resize", fitBubble);
  }, [open, fitBubble, text]);
  // A hover or a focus inside fits the bubble before it shows.
  useEffect(() => {
    const el = host.current;
    if (el === null) return;
    el.addEventListener("pointerenter", fitBubble);
    el.addEventListener("focusin", fitBubble);
    return () => {
      el.removeEventListener("pointerenter", fitBubble);
      el.removeEventListener("focusin", fitBubble);
    };
  }, [fitBubble]);
  return (
    <span
      ref={host}
      className="kid-tooltip"
      data-open={open ? "" : undefined}
      data-placement={placement}
      data-align={align}
    >
      {children}
      <span ref={bubble} role="tooltip" className={cn("kid-tooltip-bubble")}>
        {text}
      </span>
    </span>
  );
}
