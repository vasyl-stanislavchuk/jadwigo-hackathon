/**
 * The celebrations (dl-7wlo.40, dl-7wlo.43): a 4 s transparent video in the corner, standing on the
 * lesson footer's top line (the Dalej band, `[data-bar]`), no sound. Jadwiga flies in, gives a
 * thumbs-up and vanishes; Pani Iwona says "Brawo!" or "Well done!" in the page's language, the
 * praise drawn into the clip. Neither ever blocks the lesson (david-learns decision 2026-10-30 "A
 * celebration that never blocks the lesson is not held to the 600 ms item limit"): taps pass through,
 * any tap hides the clip, and so does its end, a load error or a refused autoplay (iOS low-power
 * mode). Safari takes the HEVC-with-alpha .mov; the others cannot play it and take the VP9 .webm,
 * so the source order matters. Under reduced motion nothing plays.
 *
 * A load error is the video's own (it could not decode the source it took) or the last source's
 * (no source played), never the .mov's: every browser but Safari skips the .mov and fires `error`
 * at that <source>, and React hands a <source>'s error to the <video>'s onError, so an onError on
 * the video hid her about 2 ms after she came, in Chrome, Firefox and Android (dl-1eieq.4).
 */

import type { Language } from "@jadwigo/copy";
import { prefersReducedMotion } from "@jadwigo/lesson-kit";
import iwonaEnMov from "@jadwigo/ui/brand/iwona-en.mov";
import iwonaEnWebm from "@jadwigo/ui/brand/iwona-en.webm";
import iwonaPlMov from "@jadwigo/ui/brand/iwona-pl.mov";
import iwonaPlWebm from "@jadwigo/ui/brand/iwona-pl.webm";
import queenMov from "@jadwigo/ui/brand/queen.mov";
import queenWebm from "@jadwigo/ui/brand/queen.webm";
import { type ReactElement, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Cast } from "./celebration.ts";

/** Pani Iwona's clip in each page language: the praise is in the picture. */
const IWONA: Record<Language, { mov: string; webm: string }> = {
  pl: { mov: iwonaPlMov, webm: iwonaPlWebm },
  en: { mov: iwonaEnMov, webm: iwonaEnWebm },
};

function Clip({
  cast,
  mov,
  webm,
  onDone,
}: {
  cast: Cast;
  mov: string;
  webm: string;
  onDone: () => void;
}): ReactElement | null {
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
    const clip = video.current;
    document.addEventListener("pointerdown", onDone);
    // A native listener out of the capture phase hears the video's own error, never a source's.
    clip?.addEventListener("error", onDone);
    clip?.play()?.catch(onDone);
    return () => {
      document.removeEventListener("pointerdown", onDone);
      clip?.removeEventListener("error", onDone);
    };
  }, [still, onDone]);

  if (still) return null;
  return (
    <div
      aria-hidden
      data-celebration={cast}
      {...(cast === "queen" ? { "data-queen": "" } : { "data-iwona": "" })}
      className="pointer-events-none fixed right-0 z-50 w-3/4 max-w-lg"
      style={{ bottom }}
    >
      {/* Its own aspect, never cropped or stretched: the queen's is 1282:1000, Pani Iwona's 8:5. */}
      <video ref={video} className="w-full" autoPlay muted playsInline onEnded={onDone}>
        <source src={mov} type='video/mp4; codecs="hvc1"' />
        <source src={webm} type="video/webm" onError={onDone} />
      </video>
    </div>
  );
}

export function Queen({ onDone }: { onDone: () => void }): ReactElement | null {
  return <Clip cast="queen" mov={queenMov} webm={queenWebm} onDone={onDone} />;
}

export function Iwona({
  language,
  onDone,
}: {
  language: Language;
  onDone: () => void;
}): ReactElement | null {
  return <Clip cast="iwona" {...IWONA[language]} onDone={onDone} />;
}
