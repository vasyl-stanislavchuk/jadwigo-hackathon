/**
 * Part: play a prepared clip of the task's word or sentence, at normal speed and slowly, as Duolingo
 * offers with every listening question (dl-w3.68.11). The clips are named by a random opaque id,
 * so the URL never spells the word or anything it can be derived from (ruling 05, dl-w3.68.19).
 * When the question opens, the normal clip plays once by itself, only where the page allows sound
 * (ClipAutoplay) and never while another clip is playing (decision
 * 2026-10-24-a-typed-question-flows-like-duolingo-s, dl-w3.68.32). Every replay is a press, and
 * either button may be pressed as often as the child likes, and a press on the one that plays stops
 * it. One audio element per part: a press restarts it with that clip, so the two never overlap. A
 * clip that fails to load leaves the step playable; the button just stops showing as playing
 * (voice is strictly additive).
 *
 * The frame's sound (lesson-frame/README.md rule 16, §3): play is 56, the turtle 48 with "Wolniej"
 * in a tooltip and as its name. While a clip plays its button wears the pick and foundation.css
 * fills it from the left by --jw-play, set here from the clip's position: a glide, or quarter steps
 * under reduced motion. stage.css sets the two sizes.
 */

import { copy } from "@jadwigo/copy";
import { Button } from "@jadwigo/ui";
import { Turtle, Volume2 } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Language } from "../stage/types.ts";
import { Tooltip } from "./Tooltip.tsx";
import { prefersReducedMotion } from "./tone.ts";

/** Where the page fetches a clip (dl.paths.TTS_MEDIA_URL; drops.media.TtsClipView serves it). */
const TTS_MEDIA_URL = "/media/tts/";

const clipUrl = (id: string): string => `${TTS_MEDIA_URL}${id}.mp3`;

/**
 * Whether a clip may play by itself when its question opens. False unless the page says so: the
 * app plays no sound of its own, and the playground's lesson sets it from its Sound switch and
 * mute button (playground/celebrate/Celebration.tsx).
 */
export const ClipAutoplay = createContext(false);

/** Every clip playing now, from any PlayClip on the page, so an opening question never talks over
 * another clip. */
const playingNow = new Set<HTMLAudioElement>();

type Speed = "normal" | "slow";

export function PlayClip({
  clip,
  slow,
  language,
}: {
  clip: string;
  slow?: string | undefined;
  language: Language;
}): JSX.Element {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<Speed | null>(null);
  const autoplay = useContext(ClipAutoplay);
  const row = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      const element = audio.current;
      if (element === null) return;
      element.pause();
      playingNow.delete(element);
    },
    [],
  );

  // The fill follows the clip. It sits on the row, and the playing button reads it from there.
  useEffect(() => {
    const element = audio.current;
    const style = row.current?.style;
    if (playing === null || element === null || !style) return;
    const steps = prefersReducedMotion();
    let frame = 0;
    const tick = () => {
      const at = element.duration > 0 ? Math.min(1, element.currentTime / element.duration) : 0;
      style.setProperty("--jw-play", String(steps ? Math.floor(at * 4) / 4 : at));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      style.removeProperty("--jw-play");
    };
  }, [playing]);

  // Once when the question opens. A new clip is a new question (a twin), so it plays too.
  useEffect(() => {
    if (autoplay && playingNow.size === 0) play("normal", clip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip]);

  // Each press is numbered: a press that interrupts another rejects the earlier play(), and only
  // the latest press may clear the playing state. No `pause` listener, since a new src fires one.
  const press = useRef(0);

  function stop(): void {
    const element = audio.current;
    if (element === null) return;
    press.current++;
    element.pause();
    playingNow.delete(element);
    setPlaying(null);
  }

  function play(speed: Speed, id: string): void {
    if (!audio.current) {
      const element = new Audio();
      const stop = () => {
        playingNow.delete(element);
        setPlaying(null);
      };
      element.addEventListener("ended", stop);
      element.addEventListener("error", stop);
      audio.current = element;
    }
    const element = audio.current;
    const mine = ++press.current;
    element.src = clipUrl(id);
    element.currentTime = 0;
    playingNow.add(element);
    setPlaying(speed);
    element.play().catch(() => {
      if (mine !== press.current) return;
      playingNow.delete(element);
      setPlaying(null);
    });
  }

  const button = (speed: Speed, id: string) => (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={copy(language, speed === "slow" ? "ds_slow" : "play_clip")}
      aria-pressed={playing === speed}
      data-clip={speed}
      data-playing={playing === speed || undefined}
      onClick={() => (playing === speed ? stop() : play(speed, id))}
    >
      {speed === "slow" ? <Turtle aria-hidden /> : <Volume2 aria-hidden />}
    </Button>
  );

  return (
    <div ref={row} data-clips className="flex items-center gap-3">
      {button("normal", clip)}
      {slow && <Tooltip text={copy(language, "ds_slow")}>{button("slow", slow)}</Tooltip>}
    </div>
  );
}
