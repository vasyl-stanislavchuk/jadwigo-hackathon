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

let current: AsksPayload | null = null;
const listeners = new Set<() => void>();
let started = false;

function set(payload: AsksPayload): void {
  current = payload;
  for (const listener of listeners) listener();
}

function start(): void {
  const hot = import.meta.hot;
  // Vitest gives a module HMR too; a test hands its own source to AsksProvider instead.
  if (started || !hot || import.meta.env.MODE === "test") return;
  started = true;
  hot.on(ASKS_EVENT, (payload: AsksPayload) => set(payload));
  void fetch(ASKS_PATH)
    .then((res) => (res.ok ? (res.json() as Promise<AsksPayload>) : null))
    .then((payload) => {
      if (payload && current === null) set(payload);
    })
    .catch(() => {
      // The next push brings it.
    });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

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
  const payload = useSyncExternalStore(
    given ? noSubscribe : subscribe,
    () => current,
    () => null,
  );
  return given ?? { payload, send };
}

const noSubscribe = () => () => {};
