import { afterEach, describe, expect, it, vi } from "vitest";
import { posthogOptions } from "./options.ts";
import {
  acceptConsent,
  consentStatus,
  type Load,
  rejectConsent,
  reportError,
  resetAnalyticsForTests,
  startAnalytics,
  track,
} from "./start.ts";

afterEach(resetAnalyticsForTests);

function double() {
  const client = {
    init: vi.fn(),
    capture: vi.fn(),
    captureException: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    get_explicit_consent_status: vi.fn((): "pending" | "granted" | "denied" => "pending"),
  };
  client.opt_in_capturing.mockImplementation(() =>
    client.get_explicit_consent_status.mockReturnValue("granted"),
  );
  const load = vi.fn(() => Promise.resolve(client)) as unknown as Load & { mock: unknown };
  return { client, load };
}

describe("startAnalytics", () => {
  it("loads nothing without a key, and every call is a no-op", async () => {
    const { load, client } = double();
    expect(await startAnalytics(null, "app", load)).toBe("off");
    expect(await startAnalytics("", "app", load)).toBe("off");
    track("email_sign_in_submitted", { locale: "pl" });
    acceptConsent();
    expect(load).not.toHaveBeenCalled();
    expect(client.capture).not.toHaveBeenCalled();
    expect(consentStatus()).toBe("off");
  });

  it("opts in a browser that has not answered", async () => {
    const { load, client } = double();
    expect(await startAnalytics("phc_x", "app", load)).toBe("granted");
    expect(client.opt_in_capturing).toHaveBeenCalledTimes(1);
  });

  it("leaves a browser that said no opted out", async () => {
    const { load, client } = double();
    client.get_explicit_consent_status.mockReturnValue("denied");
    expect(await startAnalytics("phc_x", "app", load)).toBe("denied");
    expect(client.opt_in_capturing).not.toHaveBeenCalled();
  });

  it("starts once with the shared options and answers the banner", async () => {
    const { load, client } = double();
    expect(await startAnalytics("phc_x", "app", load)).toBe("granted");
    await startAnalytics("phc_x", "app", load);
    expect(client.init).toHaveBeenCalledTimes(1);
    expect(client.init).toHaveBeenCalledWith(
      "phc_x",
      expect.objectContaining({ autocapture: false }),
    );
    track("chat_response_rated", { verdict: "good" });
    expect(client.capture).toHaveBeenCalledWith("chat_response_rated", { verdict: "good" });
    acceptConsent();
    rejectConsent();
    expect(client.opt_in_capturing).toHaveBeenCalledTimes(2);
    expect(client.opt_out_capturing).toHaveBeenCalledTimes(1);
  });
});

describe("posthogOptions", () => {
  it("cuts the page's href the replay recorder writes", () => {
    const mask = posthogOptions("app").session_recording?.maskCapturedNetworkRequestFn;
    expect(mask?.({ name: "https://app.jadwigo.pl/parent/children/lrn_2?x=1" })?.["name"]).toBe(
      "https://app.jadwigo.pl/parent/children/:id",
    );
  });

  it("captures without waiting, keeps no person, masks inputs and sends to the EU", () => {
    const {
      before_send: _beforeSend,
      session_recording: _recording,
      ...options
    } = posthogOptions("app");
    expect(options).toMatchObject({
      api_host: "https://eu.i.posthog.com",
      opt_out_capturing_persistence_type: "cookie",
      cross_subdomain_cookie: true,
      person_profiles: "never",
      autocapture: false,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
      respect_dnt: false,
      disable_capture_url_hashes: true,
    });
    expect(options).not.toHaveProperty("cookieless_mode");
    expect(_recording).toMatchObject({
      maskAllInputs: true,
      recordHeaders: false,
      recordBody: false,
    });
  });

  it("reports a caught error with its source", async () => {
    const failure = new Error("crash");
    const { client, load } = double();
    await startAnalytics("phc_key", "app", load);
    reportError(failure, "error_boundary");
    expect(client.captureException).toHaveBeenCalledTimes(1);
    expect(client.captureException).toHaveBeenCalledWith(failure, { source: "error_boundary" });
  });

  // dl-uukj.69: a crash in the app's first render comes before the SDK's dynamic import resolves.
  it("holds an error reported before the start, and sends it once, when it starts", async () => {
    const failure = new Error("first render");
    reportError(failure, "error_boundary");
    const { client, load } = double();
    await startAnalytics("phc_key", "app", load);
    expect(client.captureException).toHaveBeenCalledTimes(1);
    expect(client.captureException).toHaveBeenCalledWith(failure, { source: "error_boundary" });
    await startAnalytics("phc_key", "app", load);
    expect(client.captureException).toHaveBeenCalledTimes(1);
  });

  it("holds at most 10 early errors, and sends none without a key", async () => {
    for (let i = 0; i < 12; i++) reportError(new Error(`e${i}`), "error_boundary");
    const { client, load } = double();
    await startAnalytics(null, "app", load);
    expect(load).not.toHaveBeenCalled();
    await startAnalytics("phc_key", "app", load);
    expect(client.captureException).toHaveBeenCalledTimes(10);
  });
});
