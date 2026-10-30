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

/** A custom property as the stylesheets declare it at :root, outside any @media block, or inside the
 * phone's (width < 37.5rem) when `phone` is set, read from the CSSOM's rules. A computed style
 * cannot give it: in a laptop-wide window the phone block does not apply, so getComputedStyle
 * returns the laptop's value. Reading the rule lets the page draw a laptop's and a phone's size side
 * by side in one window without a copy of either. "" when no sheet declares it (a unit test loads
 * none). */
export function declaredAt(token: string, phone: boolean): string {
  const want = phone ? "phone" : "root";
  let found = "";
  const walk = (rules: CSSRuleList, at: "root" | "phone" | "other"): void => {
    for (const rule of rules) {
      if (rule instanceof CSSMediaRule)
        walk(
          rule.cssRules,
          at === "root" && rule.conditionText.includes("37.5rem") ? "phone" : "other",
        );
      else if (rule instanceof CSSStyleRule) {
        if (at !== want || !/(^|,)\s*:root\b/.test(rule.selectorText)) continue;
        const value = rule.style.getPropertyValue(token).trim();
        if (value !== "") found = value;
      } else if (rule instanceof CSSGroupingRule) walk(rule.cssRules, at);
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules, "root");
    } catch {
      // A sheet from another origin keeps its rules to itself; Zeszyt's are the app's own.
    }
  }
  return found;
}
