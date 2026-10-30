/**
 * Custom properties as an element resolves them (dl-uukj.32.12): the System page shows each token's
 * value read from the page itself, so it never holds a copy that could drift. `again` re-reads them
 * when it changes (the page's day or night).
 */

import { type RefObject, useLayoutEffect, useState } from "react";

export function useLiveValues(
  root: RefObject<HTMLElement>,
  tokens: readonly string[],
  again?: unknown,
): Record<string, string> {
  const [values, setValues] = useState<Record<string, string>>({});
  // The tokens are fixed for the section's life; `again` is the only thing that changes them.
  useLayoutEffect(() => {
    const el = root.current;
    if (el === null) return;
    const style = getComputedStyle(el);
    setValues(Object.fromEntries(tokens.map((t) => [t, style.getPropertyValue(t).trim()])));
  }, [root, again]);
  return values;
}

/** A value with a colour in it, which the page draws as a swatch beside its text. */
export const isColour = (value: string): boolean => /^(#|rgb|hsl|oklch|color\()/i.test(value);
