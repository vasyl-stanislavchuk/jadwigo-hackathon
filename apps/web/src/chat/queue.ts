/**
 * The "Następne" queue (dl-uukj.47.34; research §15.3 and the engine brief's "Queue, don't cancel"):
 * words the parent sends while a turn runs wait here, in the tab, instead of joining the running
 * turn unseen. Each can go now as a steer ("Wyślij teraz"), be taken back to the composer or
 * removed; when the turn ends they go out in order, one turn each. A reload keeps them: they are
 * held in sessionStorage, per conversation.
 *
 * A row may carry photos (handoff dl-uukj.47.71 D6, dl-uukj.47.70): their ids are held beside the
 * words, by place, and the row above the composer reads how many there are, never an empty row.
 *
 * They are kept for one signed-in account, as the first screen's draft is (newLesson/draft.ts):
 * another account on the same tab reads none and drops them, and sign-out clears them all
 * (`clearChatQueues`), so one parent's words never reach another's page or go out under their name.
 */

import { MessageContext } from "@jadwigo/contracts/run";
import { useCallback, useEffect, useMemo, useState } from "react";

const PREFIX = "jw.chat.next.";
const KEY = (conversation: string) => `${PREFIX}${conversation}`;

/**
 * One waiting row: its words (empty for photos alone), the ids of the photos that go with it, and
 * the page it was sent from (the Dla child), when it was sent with one: a queued photo of one
 * child's worksheet goes with that child, whoever the page names by the time it drains.
 */
export interface Waiting {
  text: string;
  attachmentIds: readonly string[];
  context?: MessageContext;
}

interface Held {
  /** The signed-in account the words belong to, or null where there is no sign-in (dev). */
  owner: string | null;
  items: string[];
  /** Each row's photo ids, by place; absent where no row has any. */
  photos: string[][];
  /** Each row's context, by place (null for none); absent where no row has one. */
  contexts: (MessageContext | null)[];
}

const idsOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((t): t is string => typeof t === "string") : [];

function readHeld(key: string, held: Storage): Held | null {
  try {
    const raw = held.getItem(key);
    if (raw === null) return null;
    const read: unknown = JSON.parse(raw);
    if (typeof read !== "object" || read === null) return null;
    const { owner, items, photos, contexts } = read as Record<string, unknown>;
    const words = idsOf(items);
    const byRow = Array.isArray(photos) ? photos : [];
    const contextByRow = Array.isArray(contexts) ? contexts : [];
    return {
      owner: typeof owner === "string" ? owner : null,
      items: words,
      photos: words.map((_, i) => idsOf(byRow[i])),
      // A context that does not read as one is dropped, never sent half-formed.
      contexts: words.map((_, i) => {
        const parsed = MessageContext.safeParse(contextByRow[i]);
        return parsed.success ? parsed.data : null;
      }),
    };
  } catch {
    return null;
  }
}

/** `owner`'s queue for the conversation; another account's reads as empty. */
export function heldQueue(
  conversation: string,
  owner: string | null,
  held: Storage = window.sessionStorage,
): string[] {
  return heldRows(conversation, owner, held).map((row) => row.text);
}

/** `owner`'s waiting rows for the conversation, photos included. */
function heldRows(conversation: string, owner: string | null, held: Storage): Waiting[] {
  const kept = readHeld(KEY(conversation), held);
  if (kept === null || kept.owner !== owner) return [];
  return kept.items.map((text, i) => {
    const context = kept.contexts[i] ?? null;
    return { text, attachmentIds: kept.photos[i] ?? [], ...(context === null ? {} : { context }) };
  });
}

function hold(conversation: string, owner: string | null, rows: readonly Waiting[], held: Storage) {
  try {
    const items = rows.map((row) => row.text);
    const photos = rows.some((row) => row.attachmentIds.length > 0)
      ? { photos: rows.map((row) => [...row.attachmentIds]) }
      : {};
    const contexts = rows.some((row) => row.context !== undefined)
      ? { contexts: rows.map((row) => row.context ?? null) }
      : {};
    if (rows.length === 0) held.removeItem(KEY(conversation));
    else held.setItem(KEY(conversation), JSON.stringify({ owner, items, ...photos, ...contexts }));
  } catch {
    // Storage refused: the queue still works for this page, and a reload starts it empty.
  }
}

/** Every queue in the tab, or every one not `keep`'s: sign-out, and another account signing in. */
export function clearChatQueues(held: Storage = window.sessionStorage, keep?: string | null): void {
  try {
    const keys = Array.from({ length: held.length }, (_, i) => held.key(i)).filter(
      (k): k is string => k?.startsWith(PREFIX) === true,
    );
    for (const key of keys)
      if (keep === undefined || readHeld(key, held)?.owner !== keep) held.removeItem(key);
  } catch {
    // Nothing was kept.
  }
}

/** The same row: its words, its photos in order, and its context. */
function sameRow(a: Waiting, b: Waiting): boolean {
  return (
    a.text === b.text &&
    a.attachmentIds.length === b.attachmentIds.length &&
    a.attachmentIds.every((id, i) => id === b.attachmentIds[i]) &&
    JSON.stringify(a.context ?? null) === JSON.stringify(b.context ?? null)
  );
}

export interface NextQueue {
  items: readonly string[];
  /** The same rows with their photos, for the row above the composer. */
  rows: readonly Waiting[];
  /** Whether the owner is known: until then nothing is read, added or drained. */
  ready: boolean;
  add(text: string, attachmentIds?: readonly string[], context?: MessageContext): void;
  /** Takes one row out by its place, answering its words. */
  take(index: number): string | null;
  /**
   * Takes out the row that went, once it went: the first with the same words, photos and context,
   * so a row with the same words but other photos stays (and its photos still go).
   */
  remove(row: Waiting): void;
  /** Drops every queue in the tab: the words belong to an account no longer signed in here. */
  clear(): void;
}

/**
 * The queue of `conversation` for `owner`: undefined while the signed-in account is not known yet,
 * when the queue holds nothing; null where there is no sign-in.
 */
export function useNextQueue(
  conversation: string,
  owner: string | null | undefined,
  held: Storage = window.sessionStorage,
): NextQueue {
  const ready = owner !== undefined;
  const [rows, setRows] = useState<Waiting[]>(() =>
    ready ? heldRows(conversation, owner, held) : [],
  );
  // Once the account is known: read its queue, and drop any other account's from the tab.
  useEffect(() => {
    if (owner === undefined) return;
    clearChatQueues(held, owner);
    setRows(heldRows(conversation, owner, held));
  }, [conversation, owner, held]);
  const write = useCallback(
    (next: Waiting[]) => {
      if (owner === undefined) return;
      hold(conversation, owner, next, held);
      setRows(next);
    },
    [conversation, owner, held],
  );
  const now = useCallback(
    () => (owner === undefined ? [] : heldRows(conversation, owner, held)),
    [conversation, owner, held],
  );
  const add = useCallback(
    (text: string, attachmentIds: readonly string[] = [], context?: MessageContext) =>
      write([...now(), { text, attachmentIds, ...(context === undefined ? {} : { context }) }]),
    [write, now],
  );
  const take = useCallback(
    (index: number): string | null => {
      const kept = now();
      const row = kept[index];
      if (row === undefined) return null;
      write(kept.filter((_, i) => i !== index));
      return row.text;
    },
    [write, now],
  );
  const remove = useCallback(
    (went: Waiting) => {
      const kept = now();
      const index = kept.findIndex((row) => sameRow(row, went));
      if (index >= 0) write(kept.filter((_, i) => i !== index));
    },
    [write, now],
  );
  const clear = useCallback(() => {
    clearChatQueues(held);
    setRows([]);
  }, [held]);
  const items = useMemo(() => rows.map((row) => row.text), [rows]);
  return { items, rows, ready, add, take, remove, clear };
}
