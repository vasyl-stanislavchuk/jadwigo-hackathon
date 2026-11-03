/** Whether the screen is a phone's (below 768, handoff §9): a list loads more there instead of paging. */

import { useSyncExternalStore } from "react";

// Tailwind's md breakpoint, 768 at the default 16 root size.
const QUERY = "(width < 48rem)";

const subscribe = (listener: () => void): (() => void) => {
  const media = window.matchMedia?.(QUERY);
  media?.addEventListener("change", listener);
  return () => media?.removeEventListener("change", listener);
};

const phone = (): boolean => window.matchMedia?.(QUERY).matches ?? false;

export function usePhone(): boolean {
  return useSyncExternalStore(subscribe, phone, () => false);
}
