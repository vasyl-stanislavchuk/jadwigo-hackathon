// A page or a block that waits (dl-7wlo.44): one role=status region, centred both ways in the
// room it holds (a page 60% of the screen, a block 160 px), that says the page's own loading words
// once to a screen reader, as its name (Spinner's way: the words are never drawn). With a character
// it shows the owner's loading cast (brand/README.md): the large drawing on a page, the small one in
// a block, as an external <img> so the SVG's own CSS stays inside it. The drawing is decorative,
// shows only after `delay` (300 ms, Skeleton's rule) so a fast load never flashes it, and is the
// still file whenever motion should stop: the host picks it, since the SVG's own reduced-motion rule
// did not stop an <img> under Chromium's emulation. Without a character it is the plain Spinner,
// centred. A button or a row keeps its own Spinner.
import { type ReactElement, useEffect, useState } from "react";
import gumkaLarge from "../brand/loading-gumka-large.svg";
import gumkaLargeStill from "../brand/loading-gumka-large-still.svg";
import gumkaSmall from "../brand/loading-gumka-small.svg";
import gumkaSmallStill from "../brand/loading-gumka-small-still.svg";
import linijkaLarge from "../brand/loading-linijka-large.svg";
import linijkaLargeStill from "../brand/loading-linijka-large-still.svg";
import linijkaSmall from "../brand/loading-linijka-small.svg";
import linijkaSmallStill from "../brand/loading-linijka-small-still.svg";
import olowekLarge from "../brand/loading-olowek-large.svg";
import olowekLargeStill from "../brand/loading-olowek-large-still.svg";
import olowekSmall from "../brand/loading-olowek-small.svg";
import olowekSmallStill from "../brand/loading-olowek-small-still.svg";
import { useReducedMotion } from "../lib/motion.ts";
import { cn } from "../lib/utils.ts";
import { Spinner } from "./spinner.tsx";

type LoadingCharacter = "olowek" | "gumka" | "linijka";
type LoadingSize = "page" | "block";
type ArtSize = "large" | "small";

interface Art {
  animated: string;
  still: string;
}

/** The 12 files of the cast: each character at each size, moving and still. */
const CAST: Record<LoadingCharacter, Record<ArtSize, Art>> = {
  olowek: {
    large: { animated: olowekLarge, still: olowekLargeStill },
    small: { animated: olowekSmall, still: olowekSmallStill },
  },
  gumka: {
    large: { animated: gumkaLarge, still: gumkaLargeStill },
    small: { animated: gumkaSmall, still: gumkaSmallStill },
  },
  linijka: {
    large: { animated: linijkaLarge, still: linijkaLargeStill },
    small: { animated: linijkaSmall, still: linijkaSmallStill },
  },
};

/** A page shows the large drawing, a block the small one. */
const ART_SIZE: Record<LoadingSize, ArtSize> = { page: "large", block: "small" };

/** Each drawing's own box, so the <img> keeps its shape before the file arrives. */
const BOX: Record<ArtSize, { width: number; height: number; className: string }> = {
  large: {
    width: 320,
    height: 260,
    className: "w-full min-w-jw-loading-art-large-min max-w-jw-loading-art-large",
  },
  small: { width: 112, height: 64, className: "w-jw-loading-art-small" },
};

/** The file a character shows at a size, moving or still. */
function loadingArt(character: LoadingCharacter, size: LoadingSize, still: boolean): string {
  const art = CAST[character][ART_SIZE[size]];
  return still ? art.still : art.animated;
}

function Loading({
  label,
  size = "page",
  character,
  delay = 300,
  className,
}: {
  /** The page's loading words, in the page's language: `copy(language, "loading", …)`. */
  label: string;
  size?: LoadingSize;
  /** Who waits with the reader. None: the plain Spinner. */
  character?: LoadingCharacter;
  /** How long the drawing waits before it shows, in ms. The status is there at once. */
  delay?: number;
  className?: string;
}): ReactElement {
  const still = useReducedMotion();
  const [shown, setShown] = useState(delay <= 0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (delay <= 0) return;
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const box = BOX[ART_SIZE[size]];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      data-slot="loading"
      data-size={size}
      className={cn(
        "flex w-full flex-col items-center justify-center",
        size === "page" ? "min-h-jw-loading-page flex-1" : "min-h-jw-loading-block",
        className,
      )}
    >
      {character === undefined ? (
        <Spinner aria-hidden="true" label={label} />
      ) : (
        !failed && (
          <img
            src={loadingArt(character, size, still)}
            alt=""
            aria-hidden="true"
            width={box.width}
            height={box.height}
            data-character={character}
            data-still={still || undefined}
            onError={() => setFailed(true)}
            className={cn("h-auto", box.className, !shown && "invisible")}
          />
        )
      )}
    </div>
  );
}

export { Loading, type LoadingCharacter, type LoadingSize, loadingArt };
