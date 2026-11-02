/**
 * The "Następne" queue (dl-uukj.47.34; research §15.3 and the engine brief's "Queue, don't cancel"):
 * words the parent sends while a turn runs wait here, in the tab, instead of joining the running
 * turn unseen. Each can go now as a steer ("Wyślij teraz"), be taken back to the composer or
 * removed; when the turn ends they go out in order, one turn each. A reload keeps them: they are
 * held in sessionStorage, per conversation.
 */

import { useCallback, useState } from "react";

const KEY = (conversation: string) => `jw.chat.next.${conversation}`;

/** The queue as the tab holds it; empty when nothing is held or storage refuses. */
export function heldQueue(conversation: string, held: Storage = window.sessionStorage): string[] {
  try {
    const raw = held.getItem(KEY(conversation));
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

function hold(conversation: string, items: readonly string[], held: Storage): void {
  try {
    if (items.length === 0) held.removeItem(KEY(conversation));
    else held.setItem(KEY(conversation), JSON.stringify(items));
  } catch {
    // Storage refused: the queue still works for this page, and a reload starts it empty.
  }
}

export interface NextQueue {
  items: readonly string[];
  add(text: string): void;
  /** Takes one row out by its place, answering its words. */
  take(index: number): string | null;
}

export function useNextQueue(
  conversation: string,
  held: Storage = window.sessionStorage,
): NextQueue {
  const [items, setItems] = useState<string[]>(() => heldQueue(conversation, held));
  const write = useCallback(
    (next: string[]) => {
      hold(conversation, next, held);
      setItems(next);
    },
    [conversation, held],
  );
  const add = useCallback(
    (text: string) => write([...heldQueue(conversation, held), text]),
    [write, conversation, held],
  );
  const take = useCallback(
    (index: number): string | null => {
      const now = heldQueue(conversation, held);
      const text = now[index] ?? null;
      if (text !== null) write(now.filter((_, i) => i !== index));
      return text;
    },
    [write, conversation, held],
  );
  return { items, add, take };
}
