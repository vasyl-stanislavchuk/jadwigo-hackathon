import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useInspector } from "./inspector.ts";

const CONVERSATION = "cnv_00000000000000000000000001";
const LEARNER = "lrn_00000000000000000000000001";

beforeEach(() => {
  window.history.replaceState(null, "", `/parent/lessons/${CONVERSATION}?lang=pl`);
});
afterEach(cleanup);

describe("the inspector, the preview's one door (dl-uukj.47.58, dl-1eieq.1)", () => {
  it("opens a thing: ?open names it", () => {
    const { result } = renderHook(() => useInspector());
    expect(result.current.current).toBeNull();

    act(() => result.current.open({ kind: "learner", id: LEARNER }));
    expect(window.location.search).toBe(`?lang=pl&open=learner%3A${LEARNER}`);
    expect(result.current.current).toEqual({ kind: "learner", id: LEARNER });
  });

  it("shuts the preview and forgets what was open, keeping the page's other query", () => {
    const { result } = renderHook(() => useInspector());
    act(() => result.current.open({ kind: "lesson", id: CONVERSATION }));
    act(() => result.current.close());
    expect(window.location.search).toBe("?lang=pl");
    expect(result.current.current).toBeNull();
  });

  it("opens the preview for a link that names a thing, and ignores one that does not parse", () => {
    window.history.replaceState(
      null,
      "",
      `/parent/lessons/${CONVERSATION}?open=lesson:${CONVERSATION}`,
    );
    const { result } = renderHook(() => useInspector());
    expect(result.current.current).toEqual({ kind: "lesson", id: CONVERSATION });
    cleanup();
    window.history.replaceState(null, "", `/parent/lessons/${CONVERSATION}?open=lesson:nope`);
    const again = renderHook(() => useInspector());
    expect(again.result.current.current).toBeNull();
  });
});
