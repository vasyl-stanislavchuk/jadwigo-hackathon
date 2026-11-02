import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { folds } from "../shell/fold.ts";
import { INSPECT, useInspector } from "./inspector.ts";

const CONVERSATION = "cnv_00000000000000000000000001";
const LEARNER = "lrn_00000000000000000000000001";

beforeEach(() => {
  window.localStorage.clear();
  folds.set("lesson", false);
  window.history.replaceState(null, "", `/parent/lessons/${CONVERSATION}?lang=pl`);
});
afterEach(cleanup);

describe("the inspector, the right column's one door (dl-uukj.47.58)", () => {
  it("opens a thing: ?open names it, the column opens, the phone hears it", () => {
    const heard = vi.fn();
    window.addEventListener(INSPECT, heard);
    const { result } = renderHook(() => useInspector());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.current).toBeNull();

    act(() => result.current.open({ kind: "learner", id: LEARNER }));
    expect(window.location.search).toBe(`?lang=pl&open=learner%3A${LEARNER}`);
    expect(result.current.current).toEqual({ kind: "learner", id: LEARNER });
    expect(result.current.isOpen).toBe(true);
    expect(folds.open("lesson")).toBe(true);
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener(INSPECT, heard);
  });

  it("shuts the column and forgets what was open, keeping the page's other query", () => {
    const { result } = renderHook(() => useInspector());
    act(() => result.current.open({ kind: "lesson", id: CONVERSATION }));
    act(() => result.current.close());
    expect(window.location.search).toBe("?lang=pl");
    expect(result.current.current).toBeNull();
    expect(result.current.isOpen).toBe(false);
  });

  it("opens the column for a link that names a thing, and ignores one that does not parse", () => {
    window.history.replaceState(
      null,
      "",
      `/parent/lessons/${CONVERSATION}?open=lesson:${CONVERSATION}`,
    );
    const { result } = renderHook(() => useInspector());
    expect(result.current.isOpen).toBe(true);
    cleanup();
    window.history.replaceState(null, "", `/parent/lessons/${CONVERSATION}?open=lesson:nope`);
    const again = renderHook(() => useInspector());
    expect(again.result.current.current).toBeNull();
    expect(again.result.current.isOpen).toBe(false);
  });
});
