/**
 * Whether the parent closed the context chip for a conversation (dl-uukj.47.36; research §15.3,
 * "closable, and a closed chip stays closed"): held in sessionStorage by conversation id, so it
 * survives a reload and a new turn, and a new conversation starts open.
 */

import { useCallback, useState } from "react";

const KEY = (conversation: string) => `jw.chat.context-closed.${conversation}`;

function read(conversation: string, held: Storage): boolean {
  try {
    return held.getItem(KEY(conversation)) === "1";
  } catch {
    return false;
  }
}

export function useContextClosed(
  conversation: string,
  held: Storage = window.sessionStorage,
): { closed: boolean; close(): void } {
  const [closed, setClosed] = useState(() => read(conversation, held));
  const close = useCallback(() => {
    try {
      held.setItem(KEY(conversation), "1");
    } catch {
      // Storage refused: closed for this page, open again after a reload.
    }
    setClosed(true);
  }, [conversation, held]);
  return { closed, close };
}
