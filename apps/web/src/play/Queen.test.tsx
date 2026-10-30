import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Queen } from "./Queen.tsx";

function motion(reduce: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce, media: query }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Queen", () => {
  it("offers Safari's .mov before the .webm", () => {
    motion(false);
    const { container } = render(<Queen onDone={() => undefined} />);
    const sources = [...container.querySelectorAll("source")].map((s) => s.getAttribute("type"));
    expect(sources).toEqual(['video/mp4; codecs="hvc1"', "video/webm"]);
  });

  it("is done when the clip ends, on a load error and on any tap", () => {
    motion(false);
    const onDone = vi.fn();
    const { container } = render(<Queen onDone={onDone} />);
    const video = container.querySelector("video") as HTMLVideoElement;
    fireEvent.ended(video);
    fireEvent.error(video);
    fireEvent.pointerDown(document.body);
    expect(onDone).toHaveBeenCalledTimes(3);
  });

  it("does not play under reduced motion", () => {
    motion(true);
    const { container } = render(<Queen onDone={() => undefined} />);
    expect(container.querySelector("video")).toBeNull();
  });
});
