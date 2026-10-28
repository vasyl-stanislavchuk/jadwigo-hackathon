/**
 * The PlayClip part (dl-w3.68.11): each press plays its own clip by id from /media/tts/, one audio
 * element is shared by both buttons, and a button shows as pressed only while its clip plays. When
 * the question opens the normal clip plays once by itself, only where the page allows sound, and
 * never over another clip (dl-w3.68.32).
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { must } from "./must.ts";
import { ClipAutoplay, PlayClip } from "./PlayClip.tsx";

const CLIP = "a".repeat(22);
const SLOW = "b".repeat(22);

class FakeAudio extends EventTarget {
  static made: FakeAudio[] = [];
  src = "";
  currentTime = 0;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  constructor() {
    super();
    FakeAudio.made.push(this);
  }
}

beforeEach(() => {
  FakeAudio.made = [];
  vi.stubGlobal("Audio", FakeAudio);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PlayClip", () => {
  it("plays nothing by itself where the page allows no sound (the Sound switch off, or muted)", () => {
    render(<PlayClip clip={CLIP} slow={SLOW} language="pl" />);
    expect(FakeAudio.made).toEqual([]);
    cleanup();
    render(
      <ClipAutoplay.Provider value={false}>
        <PlayClip clip={CLIP} slow={SLOW} language="pl" />
      </ClipAutoplay.Provider>,
    );
    expect(FakeAudio.made).toEqual([]);
  });

  it("plays the normal clip once when the question opens, where sound is allowed, and keeps both buttons", () => {
    const { rerender } = render(
      <ClipAutoplay.Provider value>
        <PlayClip clip={CLIP} slow={SLOW} language="pl" />
      </ClipAutoplay.Provider>,
    );
    expect(FakeAudio.made).toHaveLength(1);
    const audio = must(FakeAudio.made[0]);
    expect(audio.src).toBe(`/media/tts/${CLIP}.mp3`);
    expect(audio.play).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Posłuchaj" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Wolniej" })).toBeTruthy();
    // A verdict re-renders the step: nothing plays again by itself.
    act(() => {
      audio.dispatchEvent(new Event("ended"));
    });
    rerender(
      <ClipAutoplay.Provider value>
        <PlayClip clip={CLIP} slow={SLOW} language="pl" />
      </ClipAutoplay.Provider>,
    );
    expect(audio.play).toHaveBeenCalledOnce();
    // A replay is a press.
    fireEvent.click(screen.getByRole("button", { name: "Posłuchaj" }));
    expect(audio.play).toHaveBeenCalledTimes(2);
  });

  it("never plays by itself while another clip is playing", () => {
    render(
      <ClipAutoplay.Provider value>
        <PlayClip clip={CLIP} language="pl" />
        <PlayClip clip={SLOW} language="pl" />
      </ClipAutoplay.Provider>,
    );
    expect(FakeAudio.made).toHaveLength(1);
    expect(FakeAudio.made[0]?.src).toBe(`/media/tts/${CLIP}.mp3`);
    cleanup();
    // Once the first is gone, the next question that opens plays its own.
    FakeAudio.made = [];
    render(
      <ClipAutoplay.Provider value>
        <PlayClip clip={SLOW} language="pl" />
      </ClipAutoplay.Provider>,
    );
    expect(FakeAudio.made).toHaveLength(1);
  });

  it("labels its buttons in the language and omits slow when there is no slow clip", () => {
    const { rerender } = render(<PlayClip clip={CLIP} slow={SLOW} language="pl" />);
    expect(screen.getByRole("button", { name: "Posłuchaj" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Wolniej" })).toBeTruthy();
    rerender(<PlayClip clip={CLIP} language="en" />);
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([
      "Listen",
    ]);
  });

  it("plays each clip by its id on one audio element, as often as pressed", () => {
    render(<PlayClip clip={CLIP} slow={SLOW} language="pl" />);
    const normal = screen.getByRole("button", { name: "Posłuchaj" });
    const slow = screen.getByRole("button", { name: "Wolniej" });

    fireEvent.click(normal);
    expect(FakeAudio.made).toHaveLength(1);
    const audio = must(FakeAudio.made[0]);
    expect(audio.src).toBe(`/media/tts/${CLIP}.mp3`);
    expect(normal.getAttribute("aria-pressed")).toBe("true");
    expect(slow.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(slow);
    expect(FakeAudio.made).toHaveLength(1);
    expect(audio.src).toBe(`/media/tts/${SLOW}.mp3`);
    expect(slow.getAttribute("aria-pressed")).toBe("true");
    // A tap on the one that plays stops it; the next tap plays it again.
    fireEvent.click(slow);
    expect(audio.pause).toHaveBeenCalled();
    expect(slow.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(slow);
    expect(audio.play).toHaveBeenCalledTimes(3);
    expect(slow.getAttribute("aria-pressed")).toBe("true");

    act(() => {
      audio.dispatchEvent(new Event("ended"));
    });
    expect(slow.getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps the latest press playing when it interrupts an earlier one", async () => {
    render(<PlayClip clip={CLIP} slow={SLOW} language="pl" />);
    let interrupt: (reason: Error) => void = () => {};
    const first = new Promise<void>((_resolve, reject) => {
      interrupt = reject;
    });
    const play = vi.fn().mockReturnValueOnce(first).mockResolvedValue(undefined);
    vi.stubGlobal(
      "Audio",
      class extends FakeAudio {
        override play = play;
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Posłuchaj" }));
    fireEvent.click(screen.getByRole("button", { name: "Wolniej" }));
    // A real element rejects the first play() once the second press loads another clip.
    await act(async () => {
      interrupt(new Error("AbortError"));
      await first.catch(() => {});
    });
    expect(screen.getByRole("button", { name: "Wolniej" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it('draws play at the kid tap size and names the 48 px turtle "Wolniej" in a tooltip (rule 16)', () => {
    render(<PlayClip clip={CLIP} slow={SLOW} language="pl" />);
    const buttons = screen.getAllByRole("button");
    const play = must(buttons[0]);
    const slow = must(buttons[1]);
    expect(play.className).toContain("min-h-[var(--kid-tap-min)]");
    expect(play.getAttribute("data-clip")).toBe("normal");
    // stage.css sizes [data-clip='slow'] at 48 px, beside the 56 px play.
    expect(slow.getAttribute("data-clip")).toBe("slow");
    expect(screen.getByRole("tooltip").textContent).toBe("Wolniej");
  });

  it("fills the playing button from the left as the clip runs", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => frames.push(f));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    const { container } = render(<PlayClip clip={CLIP} language="pl" />);
    fireEvent.click(screen.getByRole("button", { name: "Posłuchaj" }));
    const audio = FakeAudio.made[0] as FakeAudio & { duration: number };
    audio.duration = 2;
    audio.currentTime = 1;
    act(() => must(frames.at(-1))(0));
    const row = must(container.querySelector<HTMLElement>("[data-clips]"));
    expect(row.style.getPropertyValue("--jw-play")).toBe("0.5");
    act(() => {
      audio.dispatchEvent(new Event("ended"));
    });
    expect(row.style.getPropertyValue("--jw-play")).toBe("");
  });
});
