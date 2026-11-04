/**
 * Whether the page should hold still (dl-7wlo.44): the device asks for reduced motion, or the page
 * says `data-motion-level="reduced"` on <html> (lesson-kit's keyFeel reads the same attribute; ui
 * may not import lesson-kit). It follows a change to the device setting while it is mounted, and it
 * says "still" when it cannot tell, so the first paint never moves by mistake.
 *
 * The loading cast needs this in the host: CSS inside an SVG shown as an <img> kept moving under
 * Chromium's emulated reduced motion, so `Loading` swaps to the still file itself.
 */
import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function query(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia(REDUCED_MOTION_QUERY);
}

function pageSaysReduced(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-motion-level") === "reduced";
}

function reduced(list: MediaQueryList | null): boolean {
  return list === null || list.matches || pageSaysReduced();
}

export function useReducedMotion(): boolean {
  const [still, setStill] = useState(() => reduced(query()));
  useEffect(() => {
    const list = query();
    setStill(reduced(list));
    // A test's stub, or an old Safari, may give a list that cannot be listened to.
    if (list === null || typeof list.addEventListener !== "function") return;
    const change = () => setStill(reduced(list));
    list.addEventListener("change", change);
    return () => list.removeEventListener("change", change);
  }, []);
  return still;
}
