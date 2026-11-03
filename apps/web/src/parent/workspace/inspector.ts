/**
 * The chat's preview as one door (dl-uukj.47.58; since dl-1eieq.1 a modal over the chat, decision
 * 2026-11-03-the-lesson-opens-in-a-preview-modal-from-an-expand-button-on-the): what is open and the
 * way to open or shut it, for the lesson card's expand button, a citation chip and a child's widget
 * alike.
 *
 *   ?open=<kind>:<id>   the thing open in the preview (chat/objects/ref.ts), kept in the URL so a
 *                       reload or a shared link opens it again
 *
 * Opening and shutting replace the URL, so Back leaves the lesson rather than walking the previews.
 */

import { useCallback } from "react";
import { formatOpen, type ObjectRef, OPEN_PARAM, parseOpen } from "../../chat/objects/ref.ts";
import { navigate, useLocation } from "../../nav/location.ts";

/** The current URL with `?open` set to `object`, or taken out for null. */
function withOpen(object: ObjectRef | null): string {
  const url = new URL(window.location.href);
  if (object === null) url.searchParams.delete(OPEN_PARAM);
  else url.searchParams.set(OPEN_PARAM, formatOpen(object));
  return url.pathname + url.search;
}

export interface Inspector {
  /** What `?open` names, or null while the preview is shut. */
  current: ObjectRef | null;
  open(object: ObjectRef): void;
  close(): void;
}

export function useInspector(): Inspector {
  const { query } = useLocation();
  const current = parseOpen(query.get(OPEN_PARAM));
  const open = useCallback(
    (object: ObjectRef) => navigate(withOpen(object), { replace: true }),
    [],
  );
  const close = useCallback(() => navigate(withOpen(null), { replace: true }), []);
  return { current, open, close };
}
