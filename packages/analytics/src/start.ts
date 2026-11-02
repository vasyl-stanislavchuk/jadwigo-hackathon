/**
 * Starting PostHog, sending catalogued events, and the consent banner's three calls. Without a key
 * nothing loads: tests, local dev and a build with no project stay off the network, and every call
 * here is a no-op.
 */
import type { PostHog } from "posthog-js";
import type { EventName, PropsOf, Surface } from "./catalog.ts";
import { posthogOptions } from "./options.ts";

type Client = Pick<
  PostHog,
  "init" | "capture" | "opt_in_capturing" | "opt_out_capturing" | "get_explicit_consent_status"
>;

/** Loads the SDK; a test passes a double. */
export type Load = () => Promise<Client>;

const loadPostHog: Load = () => import("posthog-js").then((module) => module.default);

let client: Client | null = null;

/** `off` when PostHog never started (no key); otherwise the visitor's answer to the banner. */
export type ConsentStatus = "off" | "pending" | "granted" | "denied";

/** Starts PostHog once, when `key` is set, and resolves to the consent status. */
export async function startAnalytics(
  key: string | null | undefined,
  surface: Surface,
  load: Load = loadPostHog,
): Promise<ConsentStatus> {
  if (client === null && key) {
    const loaded = await load();
    loaded.init(key, posthogOptions(surface));
    client = loaded;
  }
  return consentStatus();
}

export function consentStatus(): ConsentStatus {
  return client === null ? "off" : client.get_explicit_consent_status();
}

/** Yes on the banner: storage and session replay start. */
export function acceptConsent(): void {
  client?.opt_in_capturing();
}

/** No on the banner: the visit is still counted, cookieless, and nothing is stored or recorded. */
export function rejectConsent(): void {
  client?.opt_out_capturing();
}

/** Sends one catalogued event with its typed properties. */
export function track<E extends EventName>(event: E, props: PropsOf<E>): void {
  client?.capture(event, props);
}

/** Forgets the started client, for tests. */
export function resetAnalyticsForTests(): void {
  client = null;
}
