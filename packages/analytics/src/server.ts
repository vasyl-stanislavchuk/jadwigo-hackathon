/**
 * The Lambdas' error report (dl-5ssh.158, decision dl-9tuku): a failure no refusal names reaches
 * PostHog as its type, its stack and a scrubbed message, with no person and no GeoIP. A report
 * never throws and waits at most `timeout_ms`, so a slow or broken PostHog can't change an answer.
 * A separate entry, `@jadwigo/analytics/server`, so posthog-node never reaches a browser bundle.
 */
import { posthogHosts } from "@jadwigo/config";
import { type EventMessage, PostHog, type PostHogOptions } from "posthog-node";
import { scrubExceptionList } from "./scrub.ts";

export type ServerSurface = "api" | "runner";

/** Reports one failure. `route` names a route, never a value from a request. */
export type ReportError = (error: unknown, context?: { route?: string }) => Promise<void>;

export interface ReporterOptions {
  /** The project's public key. Without one, every report is a no-op. */
  key: string | undefined;
  surface: ServerSurface;
  /** A Lambda freezes once it answers, so a report is awaited, for no longer than this. */
  timeout_ms?: number;
  /** Replaces the network, for tests. */
  fetch?: PostHogOptions["fetch"];
}

const TIMEOUT_MS = 1000;

/** Only the scrubbed list, its level and these keys leave. Anything else on the event is dropped. */
function beforeSendFor(surface: ServerSurface) {
  return (event: EventMessage | null): EventMessage | null => {
    if (event === null || event.event !== "$exception") return null;
    const props = event.properties ?? {};
    const list = scrubExceptionList(props["$exception_list"]);
    if (list === null) return null;
    const route = props["route"];
    return {
      ...event,
      properties: {
        $exception_list: list,
        $process_person_profile: false,
        $geoip_disable: true,
        surface,
        ...(typeof props["$exception_level"] === "string"
          ? { $exception_level: props["$exception_level"] }
          : {}),
        ...(typeof route === "string" ? { route } : {}),
      },
    };
  };
}

export function serverErrorReporter(options: ReporterOptions): ReportError {
  const { key, surface } = options;
  if (!key) return () => Promise.resolve();
  const timeout_ms = options.timeout_ms ?? TIMEOUT_MS;
  let client: PostHog | undefined;

  const send = (error: unknown, route: string | undefined): Promise<void> => {
    client ??= new PostHog(key, {
      host: posthogHosts.ingest,
      disableGeoip: true,
      flushAt: 1,
      flushInterval: 0,
      fetchRetryCount: 0,
      requestTimeout: timeout_ms,
      before_send: beforeSendFor(surface),
      ...(options.fetch === undefined ? {} : { fetch: options.fetch, disableCompression: true }),
    });
    return client.captureExceptionImmediate(
      error,
      `server:${surface}`,
      route === undefined ? {} : { route },
    );
  };

  return async (error, context) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeout_ms);
    });
    try {
      await Promise.race([send(error, context?.route).catch(() => {}), timeout]);
    } catch {
      // Building the client or the event failed: the failure is already in the function's log.
    } finally {
      clearTimeout(timer);
    }
  };
}
