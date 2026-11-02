/**
 * The workspace's right column as one door (dl-uukj.47.58): what is open in it and the way to open
 * or shut it, for the chat's object cards and the top bar's "Pokaż lekcję" alike.
 *
 *   ?open=<kind>:<id>   the thing open beside the chat (chat/objects/ref.ts), kept in the URL so a
 *                       reload or a shared link opens it again
 *   usePanel("lesson")  whether the column is open, remembered per device (shell/fold.ts)
 *
 * Opening a thing opens the column and, on a phone, brings the Lekcja pane to the front: the
 * workspace hears `INSPECT` and switches its Rozmowa / Lekcja tabs. Shutting it clears both.
 */

import { useCallback } from "react";
import { formatOpen, type ObjectRef, OPEN_PARAM, parseOpen } from "../../chat/objects/ref.ts";
import { navigate, useLocation } from "../../nav/location.ts";
import { folds, usePanel } from "../shell/fold.ts";

/** The window event that asks the phone's workspace to show its right pane. */
export const INSPECT = "jw:inspect";

/** The current URL with `?open` set to `object`, or taken out for null. */
function withOpen(object: ObjectRef | null): string {
  const url = new URL(window.location.href);
  if (object === null) url.searchParams.delete(OPEN_PARAM);
  else url.searchParams.set(OPEN_PARAM, formatOpen(object));
  return url.pathname + url.search;
}

/** Opens `object` beside the chat (null: the column's own lesson). */
function inspect(object: ObjectRef | null): void {
  navigate(withOpen(object), { replace: true });
  folds.set("lesson", true);
  window.dispatchEvent(new Event(INSPECT));
}

/** Shuts the right column and forgets what was open in it. */
function closeInspector(): void {
  navigate(withOpen(null), { replace: true });
  folds.set("lesson", false);
}

export interface Inspector {
  /** What `?open` names, or null for the column's own lesson. */
  current: ObjectRef | null;
  /** Whether the right column is open: the parent opened it, or the URL names a thing. */
  isOpen: boolean;
  open(object: ObjectRef | null): void;
  close(): void;
}

export function useInspector(): Inspector {
  const { query } = useLocation();
  const [lessonOpen] = usePanel("lesson");
  const current = parseOpen(query.get(OPEN_PARAM));
  const open = useCallback((object: ObjectRef | null) => inspect(object), []);
  const close = useCallback(() => closeInspector(), []);
  return { current, isOpen: lessonOpen || current !== null, open, close };
}
