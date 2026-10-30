/**
 * Jadwiga flies in, gives a thumbs-up and vanishes (dl-7wlo.40): a 4 s transparent video in the
 * corner, standing on the lesson footer's top line (the Dalej band, `[data-bar]`), no sound. She never blocks the lesson (david-learns decision 2026-10-30 "A celebration
 * that never blocks the lesson is not held to the 600 ms item limit"): taps pass through her, any
 * tap hides her, and so does the end of the clip, a load error or a refused autoplay (iOS low-power
 * mode). Safari takes the HEVC-with-alpha .mov; the others cannot play it and take the VP9 .webm,
 * so the source order matters. Under reduced motion she does not play.
 */

import { prefersReducedMotion } from "@jadwigo/lesson-kit";
import { type ReactElement, useEffect, useLayoutEffect, useRef, useState } from "react";
import queenMov from "./queen/queen.mov";
import queenWebm from "./queen/queen.webm";

export function Queen({ onDone }: { onDone: () => void }): ReactElement | null {
  const video = useRef<HTMLVideoElement>(null);
  const still = prefersReducedMotion();
  // Above the footer, however tall its band is now; at the bottom when the page has none.
  const [bottom, setBottom] = useState(0);
  useLayoutEffect(() => {
    const bar = document.querySelector("[data-bar]");
    if (bar !== null) setBottom(Math.max(0, window.innerHeight - bar.getBoundingClientRect().top));
  }, []);

  useEffect(() => {
    if (still) return;
    document.addEventListener("pointerdown", onDone);
    video.current?.play()?.catch(onDone);
    return () => document.removeEventListener("pointerdown", onDone);
  }, [still, onDone]);

  if (still) return null;
  return (
    <div
      aria-hidden
      data-queen
      className="pointer-events-none fixed right-0 z-50 w-3/4 max-w-lg"
      style={{ bottom }}
    >
      <video
        ref={video}
        className="w-full"
        autoPlay
        muted
        playsInline
        onEnded={onDone}
        onError={onDone}
      >
        <source src={queenMov} type='video/mp4; codecs="hvc1"' />
        <source src={queenWebm} type="video/webm" />
      </video>
    </div>
  );
}
