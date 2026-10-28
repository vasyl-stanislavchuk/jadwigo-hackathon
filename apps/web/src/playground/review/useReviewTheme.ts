/**
 * Try it and the review tab hold the page at one theme while they are open (dl-w3.47), so a type
 * is seen in dark on a light laptop and the other way round. Mounting holds, unmounting releases,
 * and the page follows the laptop again (@jadwigo/ui holdTheme).
 */

import { holdTheme, type Theme } from "@jadwigo/ui";
import { useEffect } from "react";

export function useReviewTheme(theme: Theme | null): void {
  useEffect(() => {
    holdTheme(document.documentElement, theme);
    return () => holdTheme(document.documentElement, null);
  }, [theme]);
}
