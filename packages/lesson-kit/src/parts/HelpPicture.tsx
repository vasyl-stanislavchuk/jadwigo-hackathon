/**
 * Part: the picture on a help card (families/help.ts): an image with its words, or dots in rows,
 * the array model Show draws (docs/05: arrays as the model for multiplication), on the DotArray
 * part sized to the card, never scrolling.
 */

import type { HelpPicture as Picture } from "../stage/types.ts";
import { DotArray } from "./DotArray.tsx";

export function HelpPicture({ picture }: { picture: Picture }): JSX.Element {
  if (picture.kind === "image")
    return (
      <img
        src={picture.src}
        alt={picture.alt}
        className="mt-3 max-h-48 max-w-full rounded-lg bg-background p-2"
      />
    );
  return (
    <DotArray
      rows={picture.rows}
      cols={picture.cols}
      label={picture.alt}
      className="mt-3 grid max-w-full gap-1.5"
    />
  );
}
