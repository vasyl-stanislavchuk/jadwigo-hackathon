/**
 * What may leave the browser (decision dl-376c8). PostHog's own `$` events (pageviews, replay
 * snapshots, consent) pass with their URLs cut to route shapes, so no learner or lesson id rides
 * along. Our events pass only as the catalogue declares them. Anything else is dropped.
 */
import type { CaptureResult } from "posthog-js";
import { CATALOG, isEventName, type PropSpec, type Surface } from "./catalog.ts";

/** PostHog events we never send: exceptions carry messages, identity calls carry a person. */
const DROPPED_SYSTEM_EVENTS = new Set([
  "$exception",
  "$identify",
  "$create_alias",
  "$set",
  "$groupidentify",
  "$autocapture",
  "$rageclick",
  "$dead_click",
]);

/** Path segments that follow these words are ids; they become `:id`. */
const ID_AFTER = new Set(["play", "children", "attempts", "assignments", "lessons", "history"]);

/** An id-looking segment: a prefixed id (`lrn_…`), a uuid, or a long run of digits or hex. */
const ID_SEGMENT = /^([a-z]{2,5}_[0-9A-Za-z]+|[0-9a-f-]{16,}|\d{4,})$/;

/** Cuts ids out of a path or a URL, and drops its query and hash (`?claim=`, `?for=` carry ids).
 * A value that is neither, such as PostHog's `$direct` referrer, passes unchanged. */
export function cutPath(value: string): string {
  if (!value.startsWith("/") && !/^[a-z]+:\/\//i.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value, "https://x.invalid");
  } catch {
    return "";
  }
  const parts = url.pathname.split("/");
  const cut = parts.map((part, i) =>
    (i > 0 && ID_AFTER.has(parts[i - 1] ?? "")) || ID_SEGMENT.test(part) ? ":id" : part,
  );
  const path = cut.join("/");
  return /^[a-z]+:\/\//i.test(value) ? `${url.origin}${path}` : path;
}

/** The PostHog properties that hold a URL or a path. */
const URL_KEYS = [
  "$current_url",
  "$pathname",
  "$referrer",
  "$prev_pageview_pathname",
  "$initial_current_url",
  "$initial_pathname",
  "$initial_referrer",
  "$session_entry_url",
  "$session_entry_pathname",
  "$session_entry_referrer",
  "title",
];

/** rrweb's Meta event (type 4) and PostHog's `$url_changed` custom event (type 5) carry the page's
 * href inside a replay snapshot. The recorder already cuts them (options.ts,
 * maskCapturedNetworkRequestFn); this cuts them again on the way out. */
function cutSnapshotHrefs(data: unknown): unknown {
  if (!Array.isArray(data)) return data;
  return data.map((item: unknown) => {
    if (typeof item !== "object" || item === null) return item;
    const event = item as { type?: unknown; data?: unknown };
    const inner = event.data as { href?: unknown; payload?: { href?: unknown } } | undefined;
    if (event.type === 4 && typeof inner?.href === "string")
      return { ...event, data: { ...inner, href: cutPath(inner.href) } };
    if (event.type === 5 && typeof inner?.payload?.href === "string")
      return {
        ...event,
        data: { ...inner, payload: { ...inner.payload, href: cutPath(inner.payload.href) } },
      };
    return item;
  });
}

function cutUrls(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...props };
  if ("$snapshot_data" in out) out["$snapshot_data"] = cutSnapshotHrefs(out["$snapshot_data"]);
  for (const key of URL_KEYS) {
    const value = out[key];
    if (key === "title") delete out[key];
    else if (typeof value === "string") out[key] = cutPath(value);
  }
  return out;
}

function allowed(spec: PropSpec, value: unknown): boolean {
  if (spec.kind === "boolean") return typeof value === "boolean";
  return typeof value === "string" && spec.values.includes(value);
}

/** Keeps a catalogued event's declared keys with allowed values, and PostHog's own `$` keys. */
function ownProps(
  specs: Readonly<Record<string, PropSpec>>,
  props: Record<string, unknown>,
): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    const spec = specs[key];
    if (spec !== undefined) {
      if (!allowed(spec, value)) return null;
      out[key] = value;
    } else if (key.startsWith("$") || key === "token" || key === "distinct_id") {
      out[key] = value;
    }
  }
  return out;
}

/** The before_send for one surface: `beforeSend`, then the surface and no GeoIP on every event. */
export function beforeSendFor(
  surface: Surface,
): (event: CaptureResult | null) => CaptureResult | null {
  return (event) => {
    const kept = beforeSend(event);
    if (kept === null) return null;
    return { ...kept, properties: { ...kept.properties, surface, $geoip_disable: true } };
  };
}

export function beforeSend(event: CaptureResult | null): CaptureResult | null {
  if (event === null) return null;
  // Person properties never leave: there are no person profiles (person_profiles: "never").
  const { $set: _set, $set_once: _setOnce, $unset: _unset, ...rest } = event;
  const name = rest.event;
  const props = rest.properties ?? {};
  if (name.startsWith("$")) {
    if (DROPPED_SYSTEM_EVENTS.has(name)) return null;
    return { ...rest, properties: cutUrls(props) };
  }
  if (!isEventName(name)) return null;
  const kept = ownProps(CATALOG[name].props, props);
  if (kept === null) return null;
  return { ...rest, properties: cutUrls(kept) };
}
