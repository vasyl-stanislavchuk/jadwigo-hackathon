/**
 * What may leave the browser (decision dl-376c8). PostHog's own `$` events (pageviews, replay
 * snapshots, consent) pass with their URLs cut to route shapes, so no learner or lesson id rides
 * along. An exception passes scrubbed (scrub.ts). Our events pass only as the catalogue declares
 * them. Anything else is dropped.
 */
import type { CaptureResult } from "posthog-js";
import { CATALOG, isEventName, type PropSpec, type Surface } from "./catalog.ts";
import { cutPath, ID_ANYWHERE, scrubExceptionList } from "./scrub.ts";

/** PostHog events we never send: identity calls carry a person. */
const DROPPED_SYSTEM_EVENTS = new Set([
  "$identify",
  "$create_alias",
  "$set",
  "$groupidentify",
  "$autocapture",
  "$rageclick",
  "$dead_click",
]);

/** The attributes whose value is a URL. */
const URL_ATTRIBUTES = new Set(["href", "src", "action", "poster"]);

/**
 * What a session replay records of an element's attribute (dl-w0b4.13): a URL cut as an event's
 * URLs are, and any id in another attribute (`data-learner-card="lrn_…"`) as `:id`. rrweb's
 * snapshots reach PostHog compressed, where before_send cannot see them, so the recorder cuts
 * them as it writes.
 */
export function maskAttribute(name: string, value: string): string {
  if (URL_ATTRIBUTES.has(name)) return cutPath(value);
  return value.replace(ID_ANYWHERE, ":id");
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

/** An exception's scrubbed list and level, with PostHog's other `$` keys and nothing else: every
 * other `$exception_*` (a person URL, a raw message) is dropped. No list, no event. */
function exceptionProps(props: Record<string, unknown>): Record<string, unknown> | null {
  const list = scrubExceptionList(props["$exception_list"]);
  const kept = ownProps({}, props);
  if (list === null || kept === null) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(kept)) {
    if (!key.startsWith("$exception_")) out[key] = value;
  }
  out["$exception_list"] = list;
  if (typeof props["$exception_level"] === "string")
    out["$exception_level"] = props["$exception_level"];
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
    if (name === "$exception") {
      const kept = exceptionProps(props);
      return kept === null ? null : { ...rest, properties: cutUrls(kept) };
    }
    return { ...rest, properties: cutUrls(props) };
  }
  if (!isEventName(name)) return null;
  const kept = ownProps(CATALOG[name].props, props);
  if (kept === null) return null;
  return { ...rest, properties: cutUrls(kept) };
}
