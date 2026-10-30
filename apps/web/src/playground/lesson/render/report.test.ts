import type { Finding } from "@jadwigo/lesson-import/file";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderReport } from "./report.ts";

const found = (step_id: string): Finding => ({
  step_id,
  path: "script.parts[0].steps[0]",
  level: "error",
  rule: "render-raw-tex",
  text: "TeX is drawn as its source.",
  fix: "Close the $…$ pair.",
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});

describe("renderReport", () => {
  it("posts a draft's findings once every drawn step reported, and not again unchanged", () => {
    const send = vi.fn();
    const report = renderReport(send, 300);
    report("x", ["s02", "s05"], "s02", []);
    vi.advanceTimersByTime(300);
    expect(send).not.toHaveBeenCalled();
    report("x", ["s02", "s05"], "s05", [found("s05")]);
    vi.advanceTimersByTime(300);
    expect(send).toHaveBeenCalledWith("x", [found("s05")]);
    // The file it writes comes back with the draft, the steps draw again, and report the same.
    report("x", ["s02", "s05"], "s02", []);
    report("x", ["s02", "s05"], "s05", [found("s05")]);
    vi.advanceTimersByTime(300);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("posts again when a step is fixed or leaves the draft, and starts clean on a new draft", () => {
    const send = vi.fn();
    const report = renderReport(send, 300);
    report("x", ["s02", "s05"], "s02", [found("s02")]);
    report("x", ["s02", "s05"], "s05", [found("s05")]);
    vi.advanceTimersByTime(300);
    report("x", ["s05"], "s05", [found("s05")]);
    vi.advanceTimersByTime(300);
    expect(send).toHaveBeenLastCalledWith("x", [found("s05")]);
    report("y", ["s02"], "s02", []);
    vi.advanceTimersByTime(300);
    expect(send).toHaveBeenLastCalledWith("y", []);
    expect(send).toHaveBeenCalledTimes(3);
  });
});
