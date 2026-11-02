/**
 * The one PostHog configuration the site and the app share (decision dl-376c8): EU cloud, nothing
 * captured until the visitor answers the banner (`cookieless_mode: "on_reject"`), no person
 * profiles, no autocapture, and session replay with every input masked.
 */
import { posthogHosts } from "@jadwigo/config";
import type { PostHogConfig } from "posthog-js";
import { beforeSendFor } from "./before-send.ts";
import type { Surface } from "./catalog.ts";

export function posthogOptions(surface: Surface): Partial<PostHogConfig> {
  return {
    api_host: posthogHosts.ingest,
    ui_host: posthogHosts.ui,
    defaults: "2025-05-24",
    cookieless_mode: "on_reject",
    cross_subdomain_cookie: true,
    person_profiles: "never",
    respect_dnt: true,
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
    },
    before_send: beforeSendFor(surface),
  };
}
