import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Iwona, Queen } from "./Queen.tsx";

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
    const webm = container.querySelector('source[type="video/webm"]') as HTMLSourceElement;
    fireEvent.ended(video);
    fireEvent.error(video);
    fireEvent.error(webm);
    fireEvent.pointerDown(document.body);
    expect(onDone).toHaveBeenCalledTimes(4);
  });

  // dl-1eieq.4: every browser but Safari skips the .mov and fires `error` at its <source>, which
  // React hands to the video's onError; she must stay for the .webm.
  it("stays when a browser skips the .mov", () => {
    motion(false);
    const onDone = vi.fn();
    const { container } = render(<Queen onDone={onDone} />);
    const mov = container.querySelector("source") as HTMLSourceElement;
    fireEvent.error(mov);
    expect(onDone).not.toHaveBeenCalled();
    expect(container.querySelector("[data-queen]")).not.toBeNull();
  });

  it("does not play under reduced motion", () => {
    motion(true);
    const { container } = render(<Queen onDone={() => undefined} />);
    expect(container.querySelector("video")).toBeNull();
  });
});

describe("Iwona", () => {
  it("takes the page language's clip, the .mov before the .webm", () => {
    motion(false);
    for (const language of ["pl", "en"] as const) {
      const { container, unmount } = render(<Iwona language={language} onDone={() => undefined} />);
      const sources = [...container.querySelectorAll("source")];
      expect(sources.map((s) => s.getAttribute("type"))).toEqual([
        'video/mp4; codecs="hvc1"',
        "video/webm",
      ]);
      expect(
        sources.map((s) => s.getAttribute("src")?.match(/iwona-(pl|en)\.(mov|webm)/)?.[0]),
      ).toEqual([`iwona-${language}.mov`, `iwona-${language}.webm`]);
      unmount();
    }
  });

  it("is muted, inline, plays once and is hidden from assistive tech", () => {
    motion(false);
    const { container } = render(<Iwona language="pl" onDone={() => undefined} />);
    const video = container.querySelector("video") as HTMLVideoElement;
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(false);
    expect(video.hasAttribute("playsinline")).toBe(true);
    expect(container.querySelector("[data-iwona]")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("is done when the clip ends, on a load error, on any tap, and when autoplay is refused", async () => {
    motion(false);
    const refused = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockReturnValue(Promise.reject(new Error("NotAllowedError")));
    const onDone = vi.fn();
    const { container } = render(<Iwona language="en" onDone={onDone} />);
    await Promise.resolve();
    expect(onDone).toHaveBeenCalledTimes(1);
    const video = container.querySelector("video") as HTMLVideoElement;
    const webm = container.querySelector('source[type="video/webm"]') as HTMLSourceElement;
    fireEvent.ended(video);
    fireEvent.error(video);
    fireEvent.error(webm);
    fireEvent.pointerDown(document.body);
    expect(onDone).toHaveBeenCalledTimes(5);
    refused.mockRestore();
  });

  it("stays when a browser skips the .mov, and lets go of the page when it goes", () => {
    motion(false);
    const onDone = vi.fn();
    const { container, unmount } = render(<Iwona language="pl" onDone={onDone} />);
    fireEvent.error(container.querySelector("source") as HTMLSourceElement);
    expect(onDone).not.toHaveBeenCalled();
    unmount();
    fireEvent.pointerDown(document.body);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("does not play under reduced motion", () => {
    motion(true);
    const { container } = render(<Iwona language="pl" onDone={() => undefined} />);
    expect(container.querySelector("video")).toBeNull();
  });
});
