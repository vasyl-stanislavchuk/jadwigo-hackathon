/**
 * Where the activity panel's lines come from (dl-a38n.15): the dev server's `GET /@builder/activity`
 * once, then every `builder:activity` push (apps/web/dev/activity.ts). A test hands its own payload
 * to ActivityProvider.
 */
import {
  createContext,
  createElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useSyncExternalStore,
} from "react";
import { hmrStore, noSubscribe } from "../comments/source.ts";

export type Mark = "done" | "current" | "failed";

/** What apps/web/dev/activity.ts serves. */
export type ActivityPayload = {
  session_id: string | null;
  steps: { at: string; text: string; mark: Mark }[];
};

const activity = hmrStore<ActivityPayload>("/@builder/activity", "builder:activity");

const ActivityContext = createContext<ActivityPayload | null>(null);

export function ActivityProvider({
  payload,
  children,
}: {
  payload: ActivityPayload;
  children: ReactNode;
}): ReactElement {
  return createElement(ActivityContext.Provider, { value: payload }, children);
}

export function useActivity(): ActivityPayload | null {
  const given = useContext(ActivityContext);
  const live = useSyncExternalStore(
    given ? noSubscribe : activity.subscribe,
    activity.get,
    () => null,
  );
  return given ?? live;
}
