/**
 * The app's PostHog (decision dl-376c8, dl-uukj.56): started once from main.tsx with the build's
 * public key, never on the owner's /playground. Every browser that has not said no is opted in from
 * the first page, a learner's screens included (the owner's call on 2026-11-04, dl-w0b4.129).
 */
import {
  acceptConsent,
  type ConsentStatus,
  consentStatus,
  type Load,
  rejectConsent,
  resetAnalyticsForTests,
  startAnalytics,
} from "@jadwigo/analytics";
import { useEffect, useState } from "react";

declare const __JW_ANALYTICS__: string | null | undefined;

/** The build's PostHog key (vite.config.ts), or null: then nothing loads. */
const KEY = typeof __JW_ANALYTICS__ === "undefined" ? null : __JW_ANALYTICS__;

let started: Promise<ConsentStatus> | null = null;
const listeners = new Set<(status: ConsentStatus) => void>();

/** Starts PostHog unless the page is the owner's playground. Safe to call more than once. */
export function startAppAnalytics(
  path: string,
  key: string | null = KEY,
  load?: Load,
): Promise<ConsentStatus> {
  if (path.startsWith("/playground")) return Promise.resolve("off");
  started ??= startAnalytics(key, "app", load);
  return started.then((status) => {
    for (const listener of listeners) listener(status);
    return status;
  });
}

function answer(yes: boolean): void {
  if (yes) acceptConsent();
  else rejectConsent();
  const status = consentStatus();
  for (const listener of listeners) listener(status);
}

/** The banner's state: the consent status once PostHog has started, and the two answers. */
export function useAnalyticsConsent(): {
  status: ConsentStatus;
  accept: () => void;
  reject: () => void;
} {
  const [status, setStatus] = useState<ConsentStatus>(consentStatus);
  useEffect(() => {
    listeners.add(setStatus);
    setStatus(consentStatus());
    return () => {
      listeners.delete(setStatus);
    };
  }, []);
  return { status, accept: () => answer(true), reject: () => answer(false) };
}

/** Forgets the started promise, for tests. */
export function resetAppAnalyticsForTests(): void {
  resetAnalyticsForTests();
  started = null;
  listeners.clear();
}
