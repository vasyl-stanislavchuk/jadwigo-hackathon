import type { Load } from "@jadwigo/analytics";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsentBanner } from "./ConsentBanner.tsx";
import { resetAppAnalyticsForTests, startAppAnalytics } from "./start.ts";

afterEach(() => {
  cleanup();
  resetAppAnalyticsForTests();
});

/** A PostHog double whose consent starts pending and follows the banner's answer. */
function posthogDouble() {
  let status: "pending" | "granted" | "denied" = "pending";
  const client = {
    init: vi.fn(),
    capture: vi.fn(),
    opt_in_capturing: vi.fn(() => {
      status = "granted";
    }),
    opt_out_capturing: vi.fn(() => {
      status = "denied";
    }),
    get_explicit_consent_status: vi.fn(() => status),
  };
  const load = vi.fn(() => Promise.resolve(client));
  return { client, load: load as unknown as Load, loadSpy: load };
}

describe("the cookie banner", () => {
  it("never starts PostHog on the owner's playground", async () => {
    const { loadSpy, load } = posthogDouble();
    expect(await startAppAnalytics("/playground/system", "phc_test", load)).toBe("off");
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it("shows nothing when the build has no key", async () => {
    const { loadSpy, load } = posthogDouble();
    render(<ConsentBanner language="pl" />);
    await act(() => startAppAnalytics("/parent", null, load));
    expect(loadSpy).not.toHaveBeenCalled();
    expect(document.querySelector("[data-analytics-consent]")).toBeNull();
  });

  it("opts a visitor who has not answered in, and never asks (dl-w0b4.129)", async () => {
    const { client, load } = posthogDouble();
    render(<ConsentBanner language="en" />);
    await act(() => startAppAnalytics("/parent", "phc_test", load));
    expect(client.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-analytics-consent]")).toBeNull();
  });

  it("leaves a browser that said no opted out, and does not ask again", async () => {
    const { client, load } = posthogDouble();
    client.opt_out_capturing();
    render(<ConsentBanner language="pl" />);
    await act(() => startAppAnalytics("/parent", "phc_test", load));
    expect(client.opt_in_capturing).not.toHaveBeenCalled();
    expect(document.querySelector("[data-analytics-consent]")).toBeNull();
  });
});
