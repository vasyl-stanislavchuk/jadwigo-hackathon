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

/**
 * What a report may say besides the error, to find its cause: the route or operation that failed,
 * how bad it is, the Lambda request id that finds its CloudWatch line (`request_id`), and the run
 * `make run-timeline` opens (`run_id`). Only values that look like a name or an id leave.
 */
export interface ReportContext {
  route?: string;
  operation?: string;
  level?: "error" | "warning";
  request_id?: string | undefined;
  run_id?: string | undefined;
}

/** Reports one failure. */
export type ReportError = (error: unknown, context?: ReportContext) => Promise<void>;

const CONTEXT_KEYS = ["route", "operation", "request_id", "run_id"] as const;
const SAFE_VALUE = /^[A-Za-z0-9_.:-]{1,80}$/;

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
    const context: Record<string, string> = {};
    for (const key of CONTEXT_KEYS) {
      const value = props[key];
      if (typeof value === "string" && SAFE_VALUE.test(value)) context[key] = value;
    }
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
        ...context,
      },
    };
  };
}

export function serverErrorReporter(options: ReporterOptions): ReportError {
  const { key, surface } = options;
  if (!key) return () => Promise.resolve();
  const timeout_ms = options.timeout_ms ?? TIMEOUT_MS;
  let client: PostHog | undefined;

  const send = (error: unknown, context: ReportContext = {}): Promise<void> => {
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
    const { level, ...rest } = context;
    return client.captureExceptionImmediate(error, `server:${surface}`, {
      ...rest,
      ...(level === undefined ? {} : { $exception_level: level }),
    });
  };

  return async (error, context) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeout_ms);
    });
    try {
      await Promise.race([send(error, context).catch(() => {}), timeout]);
    } catch {
      // Building the client or the event failed: the failure is already in the function's log.
    } finally {
      clearTimeout(timer);
    }
  };
}
