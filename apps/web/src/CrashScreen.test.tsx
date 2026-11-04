import { reportError } from "@jadwigo/analytics";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrashBoundary } from "./CrashScreen.tsx";

vi.mock("@jadwigo/analytics", () => ({ reportError: vi.fn() }));

const failure = new Error("render failed");
function Throws(): ReactElement {
  throw failure;
}

beforeEach(() => {
  // React prints a caught render error; this test expects one.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(reportError).mockClear();
  document.documentElement.lang = "";
});

describe("CrashBoundary", () => {
  it("passes its children through while nothing throws", () => {
    render(
      <CrashBoundary>
        <p>fine</p>
      </CrashBoundary>,
    );
    expect(screen.getByText("fine")).toBeTruthy();
    expect(reportError).not.toHaveBeenCalled();
  });

  it.each([
    ["pl", "Spróbuj jeszcze raz"],
    ["en", "Try again"],
  ])("shows the crash screen in %s, reports once, and retries", (lang, retry) => {
    document.documentElement.lang = lang;
    const onRetry = vi.fn();
    render(
      <CrashBoundary onRetry={onRetry}>
        <Throws />
      </CrashBoundary>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(failure, "error_boundary");
    fireEvent.click(screen.getByRole("button", { name: retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
