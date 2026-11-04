/**
 * The api's error report (dl-5ssh.161): the failures a route catches, logs and carries on from
 * never reach `logFailure`, so they report here. `createHandler` sets the reporter once; until then,
 * and in tests that set none, a report does nothing. It never throws.
 */
import type { ReportContext, ReportError } from "@jadwigo/analytics/server";

let reporter: ReportError = () => Promise.resolve();

export function setReporter(report: ReportError): void {
  reporter = report;
}

export function reportFailure(error: unknown, context: ReportContext): Promise<void> {
  return reporter(error, context);
}
