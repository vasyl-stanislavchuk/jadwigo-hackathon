/**
 * Part: the picture to label (dl-w3.51.2, split out of SlotsView.tsx, dl-uukj.29.120): the Picture
 * part at its own size, and every placed gap drawn over it at its percent position, centred on the
 * point. The marker is a gap like any other (a menu, a number box), on a card background so it
 * reads over the drawing; its menu opens in a portal below it, so the picture and the text around
 * it never move. Percent positions scale with the picture when it shrinks to a narrow screen. The
 * wrapper is sized to its picture (`w-fit`, `self-start`): inside the step's flex column a plain
 * inline block is stretched to the row's width, and every marker then lands right of its tick (seen
 * on 2026-10-19).
 */

import { cn } from "@jadwigo/ui";
import { Picture } from "../../parts/Picture.tsx";
import type { Picture as PictureData } from "../stem/model.ts";
import type { Gap } from "./model.ts";
import type { Slot } from "./slot.ts";

/** A picture no taller than this is a strip (a number line, a ruler): its ticks and printed labels
 * sit closer than a gap is wide, so a gap on its point would hide them. */
const STRIP_MAX_HEIGHT = 160;

export function SlotsLabelled({
  picture,
  gaps,
  slot,
}: {
  picture: PictureData;
  gaps: Gap[];
  slot: Slot;
}): JSX.Element {
  // On a strip each gap sits in a row under the picture, under its own point, with a stem up to
  // it, so every printed label stays readable (dl-uukj.29.72). A taller picture keeps its gaps on
  // their points.
  const strip = picture.height <= STRIP_MAX_HEIGHT;
  return (
    <span
      data-labelled
      data-strip={strip ? "" : undefined}
      className={cn(
        "relative inline-block w-fit max-w-full self-start align-top",
        strip && "mb-[calc(var(--kid-tap-min)+1.25rem)]",
      )}
    >
      <Picture
        src={picture.src}
        alt={picture.alt}
        width={picture.width}
        height={picture.height}
        labels={picture.labels}
      />
      {strip &&
        gaps.map((g) => (
          <span
            key={`stem-${g.id}`}
            aria-hidden
            data-gap-stem={g.id}
            className="absolute w-0.5 -translate-x-1/2 bg-border"
            style={{ left: `${g.at?.x ?? 0}%`, top: `${g.at?.y ?? 0}%`, bottom: "-0.75rem" }}
          />
        ))}
      {gaps.map((g) => (
        <span
          key={g.id}
          data-gap-at={g.id}
          className={cn(
            "absolute -translate-x-1/2 rounded-lg bg-card",
            !strip && "-translate-y-1/2",
          )}
          style={{
            left: `${g.at?.x ?? 0}%`,
            top: strip ? "calc(100% + 0.75rem)" : `${g.at?.y ?? 0}%`,
          }}
        >
          {slot(g.id)}
        </span>
      ))}
    </span>
  );
}
