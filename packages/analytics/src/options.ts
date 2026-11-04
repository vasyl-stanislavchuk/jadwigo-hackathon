/**
 * The one PostHog configuration the site and the app share (decision dl-376c8): EU cloud, no person
 * profiles, no autocapture, and session replay with every input masked. Every visitor is opted in
 * from the first page (the owner's call on 2026-11-04, dl-w0b4.129): startAnalytics opts in a
 * browser that has not answered, and only a browser that said no stays out.
 */
import { posthogHosts } from "@jadwigo/config";
import type { PostHogConfig } from "posthog-js";
import { beforeSendFor, cutPath, maskAttribute } from "./before-send.ts";
import type { Surface } from "./catalog.ts";

export function posthogOptions(surface: Surface): Partial<PostHogConfig> {
  return {
    api_host: posthogHosts.ingest,
    ui_host: posthogHosts.ui,
    defaults: "2025-05-24",
    cross_subdomain_cookie: true,
    // The answer to the banner is a cookie on .jadwigo.pl, not localStorage, so a yes or a no on
    // jadwigo.pl holds on app.jadwigo.pl and the visitor is asked once (dl-w0b4.118).
    opt_out_capturing_persistence_type: "cookie",
    person_profiles: "never",
    respect_dnt: false,
    autocapture: false,
    rageclick: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    enable_recording_console_log: false,
    session_recording: {
      // Inputs are masked: what a parent or a child types never reaches a replay. Text on the
      // screen is recorded (dl-376c8). Wrap anything else in `ph-no-capture` to block it.
      maskAllInputs: true,
      maskInputOptions: { password: true },
      recordHeaders: false,
      recordBody: false,
      // The recorder writes the page's href into every replay (its Meta and $url_changed events)
      // through this function: cut it as before_send cuts an event's URLs.
      // Every element attribute too: a link's href (/parent?for=lrn_…) and a data-* id
      // (data-learner-card="lrn_…") would otherwise ride in the replay's snapshots.
      maskAttributeFn: (name, value) => maskAttribute(name, value),
      maskCapturedNetworkRequestFn: (request) => ({
        ...request,
        name: cutPath(String(request["name"] ?? "")),
      }),
    },
    disable_capture_url_hashes: true,
    before_send: beforeSendFor(surface),
  };
}
