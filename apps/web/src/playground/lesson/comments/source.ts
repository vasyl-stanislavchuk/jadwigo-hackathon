/**
 * Where the comments come from (dl-a38n.13): the dev server's `GET /@builder/asks` once, then every
 * `builder:asks` HMR push, shared by every step's slot through one store. Only `vite` serves those,
 * so without HMR (a build, a test) the store stays empty and the slots draw nothing. A test hands
 * its own source to AsksProvider instead.
 */
import {
  createContext,
  createElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useSyncExternalStore,
} from "react";
import type { Ask } from "../../../../../../tools/builder/drafts.ts";
import type { AsksPayload } from "./threads.ts";

export type NewAsk = Pick<Ask, "draft_id" | "step_id" | "intent" | "text">;

export type AsksSource = {
  payload: AsksPayload | null;
  /** Posts a comment; resolves to the reason it was refused, or null once it is written. */
  send: (ask: NewAsk) => Promise<string | null>;
};

const ASK_PATH = "/@builder/ask";
const ASKS_PATH = "/@builder/asks";
const ASKS_EVENT = "builder:asks";

/**
 * One value the dev server keeps current: read once from `path`, then replaced by every `event`
 * push. Every slot on the page shares it. Vitest gives a module HMR too, so a test never starts
 * one; it hands its own source to a provider instead.
 */
export function hmrStore<T>(path: string, event: string) {
  let current: T | null = null;
  let started = false;
  const listeners = new Set<() => void>();
  const set = (value: T) => {
    current = value;
    for (const listener of listeners) listener();
  };
  const start = () => {
    const hot = import.meta.hot;
    if (started || !hot || import.meta.env.MODE === "test") return;
    started = true;
    hot.on(event, (value: T) => set(value));
    void fetch(path)
      .then((res) => (res.ok ? (res.json() as Promise<T>) : null))
      .then((value) => {
        if (value && current === null) set(value);
      })
      .catch(() => {
        // The next push brings it.
      });
  };
  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      start();
      return () => listeners.delete(listener);
    },
    get: (): T | null => current,
  };
}

const asks = hmrStore<AsksPayload>(ASKS_PATH, ASKS_EVENT);

async function send(ask: NewAsk): Promise<string | null> {
  try {
    const res = await fetch(ASK_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Builder": "1" },
      body: JSON.stringify(ask),
    });
    if (res.ok) return null;
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return body?.error ?? `the dev server answered ${res.status}`;
  } catch {
    return "the dev server did not answer";
  }
}

const AsksContext = createContext<AsksSource | null>(null);

export function AsksProvider({
  source,
  children,
}: {
  source: AsksSource;
  children: ReactNode;
}): ReactElement {
  return createElement(AsksContext.Provider, { value: source }, children);
}

export function useAsks(): AsksSource {
  const given = useContext(AsksContext);
  const payload = useSyncExternalStore(given ? noSubscribe : asks.subscribe, asks.get, () => null);
  return given ?? { payload, send };
}

export const noSubscribe = () => () => {};
