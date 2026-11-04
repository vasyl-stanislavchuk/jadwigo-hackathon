export { beforeSend, beforeSendFor } from "./before-send.ts";
export { CATALOG, type EventName, type PropsOf, type Surface } from "./catalog.ts";
export { posthogOptions } from "./options.ts";
export { cutPath, scrubExceptionList, scrubMessage } from "./scrub.ts";
export {
  acceptConsent,
  type ConsentStatus,
  consentStatus,
  type Load,
  rejectConsent,
  resetAnalyticsForTests,
  startAnalytics,
  track,
} from "./start.ts";
